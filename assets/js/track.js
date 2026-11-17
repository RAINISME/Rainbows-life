/* ============================================================
   访问统计：
   1) 每个页面打开时向 Supabase visits 表写一条匿名记录（页面路径 + 来源页）
   2) 页面底部读取公开计数函数 visit_count()，只显示一个总数，任何人可见
   - 不采集任何个人信息；站长入口 ?me=1 不计入总数，但仍会显示计数
   - 失败静默，不影响页面正常使用
   ============================================================ */
(function () {
  "use strict";
  if (typeof VISITS === "undefined") return;

  function headers() {
    return {
      "apikey": VISITS.key,
      "Authorization": "Bearer " + VISITS.key,
      "Content-Type": "application/json"
    };
  }

  /* ---------- 公开访问次数：只显示总数，不暴露任何明细 ---------- */
  function loadCount() {
    var box = document.getElementById("visitCountBox");
    var num = document.getElementById("visitCount");
    if (!box || !num) return;
    try {
      fetch(VISITS.url + "/rest/v1/rpc/" + (VISITS.countFn || "visit_count"), {
        method: "POST", headers: headers(), body: "{}"
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (n) {
        var v = typeof n === "number" ? n : parseInt(n, 10);
        if (!isFinite(v) || v < 0) return;
        num.textContent = String(v);
        box.hidden = false;   // 拿到数字才显示，失败则整行隐藏
      }).catch(function () { /* 静默：计数函数未部署时不影响页面 */ });
    } catch (e) { /* 静默 */ }
  }
  loadCount();

  /* ---------- 埋点上报：站长自己的入口不计数 ---------- */
  if (/(?:^|[?&])me=1(?:&|$)/.test(location.search)) return;

  var page = location.pathname.split("/").pop() || "index.html";
  if (page.indexOf(".html") === -1) page = "index.html";
  var ref = "";
  try { ref = String(document.referrer || "").slice(0, 200); } catch (e) { /* ignore */ }

  var body = JSON.stringify({ page: page, ref: ref });
  try {
    fetch(VISITS.url + "/rest/v1/" + VISITS.table, {
      method: "POST",
      keepalive: true,
      headers: Object.assign(headers(), { "Prefer": "return=minimal" }),
      body: body
    }).catch(function () { /* 静默 */ });
  } catch (e) { /* 静默 */ }
})();
