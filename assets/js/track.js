/* ============================================================
   访问埋点：每个页面打开时向 Supabase visits 表写一条记录
   - 只上报「页面路径 + 来源页」，不采集任何个人信息
   - 站长模式（?me=1 入口）不计数，避免自己的访问污染统计
   - 失败静默，不影响页面正常使用
   ============================================================ */
(function () {
  "use strict";
  if (typeof VISITS === "undefined") return;
  /* 站长自己的入口不计数 */
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
      headers: {
        "apikey": VISITS.key,
        "Authorization": "Bearer " + VISITS.key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: body
    }).catch(function () { /* 静默 */ });
  } catch (e) { /* 静默 */ }
})();
