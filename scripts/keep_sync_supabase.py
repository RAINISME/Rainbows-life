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
KEEP_LOG = "https://api.gotokeep.com/pd/v3/{t}log/{rid}"   # 单条详情
UA = "Keep/7.60.0 (iPhone; iOS 16.0; Scale/3.00)"

# 详情抓取上限（每次同步最多补抓多少条，避免 2000+ 请求过慢/限流）
DETAIL_LIMIT = 60
# 哪些 sport 值得抓详情（这些类型详情里有 trainingEffect 等；训练类无效果数据可跳过）
DETAIL_SPORTS = {"跑步", "骑行"}
# 详情接口路径参数（dataType -> log 路径）
LOG_TYPE = {
    "outdoorRunning": "running", "indoorRunning": "running", "running": "running",
    "outdoorCycling": "cycling", "cycling": "cycling",
    "outdoorWalking": "hiking", "indoorWalking": "hiking", "hiking": "hiking",
    "tableTennis": "training", "yoga": "training", "bodyImprove": "training",
}

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


def fetch_detail(auth, row):
    """抓单条记录详情，提取训练效果/地点/天气等（失败返回 None）"""
    dtype = row.get("data_type") or ""
    ltype = LOG_TYPE.get(dtype, "running")
    url = KEEP_LOG.format(t=ltype, rid=row["keep_id"])
    try:
        r = json.loads(http(url, headers=auth, retries=3).read().decode())
        data = r.get("data") or {}
    except Exception:
        return None
    effect = data.get("trainingEffect")
    region = data.get("region")
    weather = data.get("weatherInfo")
    # 只保留有用字段，避免 detail 过大
    out = {}
    if effect: out["trainingEffect"] = effect
    if region: out["region"] = region
    if weather: out["weather"] = weather
    return out or None


def sb_headers():
    return {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json"}


def sb_existing_ids():
    """分页读取已有的 keep_id 及其 detail 状态（anon 可读）"""
    m = {}  # keep_id -> bool(是否已有 detail)
    start = 0
    while True:
        url = SB_URL + "/rest/v1/" + SB_TABLE + "?select=keep_id,detail&order=keep_id&limit=1000&offset=%d" % start
        r = http(url, headers=sb_headers(), method="GET", retries=4)
        batch = json.loads(r.read().decode())
        for row in batch:
            m[row["keep_id"]] = bool(row.get("detail"))
        if len(batch) < 1000:
            break
        start += 1000
    return m


def sb_insert_batch(rows):
    url = SB_URL + "/rest/v1/" + SB_TABLE
    body = json.dumps(rows, ensure_ascii=False).encode()
    h = sb_headers()
    h["Prefer"] = "return=minimal,resolution=ignore-duplicates"
    r = http_raw(url, data=body, headers=h, method="POST", retries=4)
    if r.status >= 300:
        raise RuntimeError("写入失败 HTTP %d: %s" % (r.status, r.read().decode()[:200]))
    return r.status


def sb_patch_detail(keep_id, detail):
    """更新单条记录的 detail 字段（需 anon UPDATE 权限）"""
    url = SB_URL + "/rest/v1/" + SB_TABLE + "?keep_id=eq." + urllib.parse.quote(keep_id)
    body = json.dumps({"detail": detail}, ensure_ascii=False).encode()
    h = sb_headers()
    h["Prefer"] = "return=minimal"
    r = http_raw(url, data=body, headers=h, method="PATCH", retries=4)
    if r.status >= 300:
        raise RuntimeError("更新 detail 失败 HTTP %d: %s" % (r.status, r.read().decode()[:200]))
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

    existing = {}  # keep_id -> has_detail
    try:
        existing = sb_existing_ids()
        print("[supabase] 已有 %d 条（其中 %d 条已有详情）" % (len(existing), sum(1 for v in existing.values() if v)))
    except Exception as e:
        print("[supabase] 读取已有失败（表可能未建）:", str(e)[:120])

    new_rows = [r for r in rows if r["keep_id"] not in existing]
    print("[supabase] 需新增 %d 条" % len(new_rows))

    batch = 100
    for i in range(0, len(new_rows), batch):
        sb_insert_batch(new_rows[i:i + batch])
        print("[supabase] 写入 %d/%d" % (min(i + batch, len(new_rows)), len(new_rows)))

    # ---------- 补抓详情（训练效果）：新记录 + 已有但缺详情的记录，限量 ----------
    # 优先最新的（rows 已按抓取顺序，这里按 start_at 倒序取）
    rows_sorted = sorted(rows, key=lambda x: x.get("start_at") or "", reverse=True)
    need_detail = [r for r in rows_sorted
                   if r.get("sport") in DETAIL_SPORTS
                   and not existing.get(r["keep_id"])   # 尚无 detail
                   ][:DETAIL_LIMIT]
    print("[detail] 待补抓 %d 条（上限 %d）" % (len(need_detail), DETAIL_LIMIT))
    ok = 0
    for idx, row in enumerate(need_detail, 1):
        d = fetch_detail(auth, row)
        if d:
            try:
                sb_patch_detail(row["keep_id"], d)
                ok += 1
            except Exception as e:
                print("[detail] 更新失败 %s: %s" % (row["keep_id"][:20], str(e)[:80]))
        time.sleep(0.3)
        if idx % 10 == 0:
            print("[detail] 进度 %d/%d（成功 %d）" % (idx, len(need_detail), ok))
    print("[done] 全部完成，本次补抓详情 %d 条" % ok)


if __name__ == "__main__":
    main()
