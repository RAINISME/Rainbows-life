# -*- coding: utf-8 -*-
"""
Keep 运动数据同步到 Supabase（方案 B）
- 登录 Keep → 抓取 running / cycling / hiking / training 四类
- 按 dataType 归类（跑步/骑行/走路/乒乓/其他）→ 增量写入 Supabase workouts 表
- 凭证全部从环境变量读取（GitHub Actions Secrets），不落盘、不进代码
- 增量模式：先读已有 keep_id，只插入新记录，不删不改（RLS 只需 anon INSERT + SELECT）
"""
import os
import sys
import time
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, timedelta

KEEP_LOGIN = "https://api.gotokeep.com/v1.1/users/login"
KEEP_STATS = "https://api.gotokeep.com/pd/v3/stats/detail?dateUnit=all&type={t}&lastDate={last}"
UA = "Keep/7.60.0 (iPhone; iOS 16.0; Scale/3.00)"

SB_URL = "https://ojcegjyawjlbmixcvkoh.supabase.co"
SB_KEY = "sb_publishable_kgz6S0Lgy7isr6GZgCqRdw_oSM4h7KL"
SB_TABLE = "workouts"

SPORT_TYPES = ["running", "cycling", "hiking", "training"]
DTYPE_MAP = {
    "outdoorRunning": "跑步", "indoorRunning": "跑步", "running": "跑步",
    "outdoorCycling": "骑行", "cycling": "骑行",
    "outdoorWalking": "走路", "indoorWalking": "走路", "hiking": "走路", "walking": "走路",
    "tableTennis": "乒乓", "badminton": "羽毛球", "basketball": "篮球",
    "yoga": "瑜伽", "bodyImprove": "健身", "healthImprove": "健身",
    "manualStrengthTraining": "健身", "trainingStretching": "健身", "warmUp": "健身",
    "others": "其他",
}
CST = timezone(timedelta(hours=8))


def http(url, data=None, headers=None, method=None, timeout=40, retries=3):
    h = {"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}
    if headers:
        h.update(headers)
    body = urllib.parse.urlencode(data).encode() if data else None
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=h, method=method)
            return urllib.request.urlopen(req, timeout=timeout)
        except Exception as e:  # 网络抖动重试
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 + attempt * 2)
    raise last_err


def http_raw(url, data=None, headers=None, method=None, timeout=60, retries=3):
    """原始 body（JSON）请求，带重试"""
    h = {}
    if headers:
        h.update(headers)
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=h, method=method)
            return urllib.request.urlopen(req, timeout=timeout)
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 + attempt * 2)
    raise last_err


def keep_login(mobile, password):
    d = json.loads(http(KEEP_LOGIN, {"mobile": mobile, "password": password}).read().decode())
    token = (d.get("data") or {}).get("token")
    if not token:
        raise RuntimeError("Keep 登录失败: " + json.dumps(d, ensure_ascii=False)[:200])
    print("[keep] 登录成功")
    return {"Authorization": "Bearer " + token}


def fmt_minutes(sec):
    try:
        return round(int(sec) / 60, 1)
    except Exception:
        return None


def fmt_km(meter):
    try:
        return round(float(meter) / 1000, 2)
    except Exception:
        return None


def fmt_date(ms):
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=CST).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return None


def fetch_type(auth, sport_type):
    last = 0
    results = []
    seen = set()
    pages = 0
    while True:
        url = KEEP_STATS.format(t=sport_type, last=last)
        try:
            r = json.loads(http(url, headers=auth).read().decode())
        except Exception as e:
            print("[keep] %s 第 %d 页失败: %s" % (sport_type, pages + 1, str(e)[:80]))
            break
        data = r.get("data") or {}
        recs = data.get("records") or []
        pages += 1
        for rec in recs:
            for log in rec.get("logs", []):
                st = log.get("stats") or {}
                rid = st.get("id")
                if not rid or rid in seen:
                    continue
                seen.add(rid)
                dtype = st.get("dataType") or ""
                category = DTYPE_MAP.get(dtype, "其他")
                vendor = st.get("vendor") or {}
                results.append({
                    "keep_id": str(rid),
                    "sport": category,
                    "data_type": dtype,
                    "name": st.get("name") or category,
                    "start_at": fmt_date(st.get("startTime")),
                    "duration_min": fmt_minutes(st.get("accurateDuration") or st.get("duration")),
                    "distance_km": fmt_km(st.get("accurateDistance") if st.get("accurateDistance") else st.get("distance")),
                    "calorie": st.get("calorie") or None,
                    "device": vendor.get("deviceModel") or None,
                })
        new_last = data.get("lastTimestamp") or 0
        if not recs or not new_last or new_last == last or pages > 500:
            break
        last = new_last
        time.sleep(0.4)
    print("[keep] %s: %d 页 / %d 条" % (sport_type, pages, len(results)))
    return results


def sb_headers():
    return {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json"}


def sb_existing_ids():
    """分页读取已有的 keep_id（anon 可读）"""
    ids = set()
    start = 0
    while True:
        url = SB_URL + "/rest/v1/" + SB_TABLE + "?select=keep_id&order=keep_id&limit=1000&offset=%d" % start
        r = http(url, headers=sb_headers(), method="GET", retries=4)
        batch = json.loads(r.read().decode())
        for row in batch:
            ids.add(row["keep_id"])
        if len(batch) < 1000:
            break
        start += 1000
    return ids


def sb_insert_batch(rows):
    url = SB_URL + "/rest/v1/" + SB_TABLE
    body = json.dumps(rows, ensure_ascii=False).encode()
    h = sb_headers()
    h["Prefer"] = "return=minimal,resolution=ignore-duplicates"
    r = http_raw(url, data=body, headers=h, method="POST", retries=4)
    if r.status >= 300:
        raise RuntimeError("写入失败 HTTP %d: %s" % (r.status, r.read().decode()[:200]))
    return r.status


def main():
    mobile = os.environ.get("KEEP_MOBILE")
    password = os.environ.get("KEEP_PASSWORD")
    if not mobile or not password:
        # 未配置 Secrets 时优雅跳过，避免每天定时任务报红
        print("⚠️ 未配置 KEEP_MOBILE / KEEP_PASSWORD，跳过本次同步（已有数据不受影响）")
        print("   如需自动同步：仓库 Settings → Secrets and variables → Actions 添加这两项")
        return

    auth = keep_login(mobile, password)
    all_rows = []
    for t in SPORT_TYPES:
        all_rows.extend(fetch_type(auth, t))

    uniq = {}
    for row in all_rows:
        uniq[row["keep_id"]] = row
    rows = list(uniq.values())
    print("[keep] 合计去重 %d 条" % len(rows))

    stat = {}
    for row in rows:
        stat[row["sport"]] = stat.get(row["sport"], 0) + 1
    print("[keep] 分类:", json.dumps(stat, ensure_ascii=False))

    try:
        existing = sb_existing_ids()
        print("[supabase] 已有 %d 条" % len(existing))
    except Exception as e:
        print("[supabase] 读取已有失败（表可能未建）:", str(e)[:120])
        existing = set()

    new_rows = [r for r in rows if r["keep_id"] not in existing]
    print("[supabase] 需新增 %d 条" % len(new_rows))

    batch = 100
    for i in range(0, len(new_rows), batch):
        sb_insert_batch(new_rows[i:i + batch])
        print("[supabase] 写入 %d/%d" % (min(i + batch, len(new_rows)), len(new_rows)))
    print("[done] 全部完成")


if __name__ == "__main__":
    main()
