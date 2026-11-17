/* ============================================================
   运动详情页：读取 Supabase workouts 表，按 ?type= 分类展示
   数据来源：GitHub Actions 每天从 Keep 同步（见 running_page 仓库）
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 主题切换（与主站一致） ---------- */
  const toggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  if (toggle) {
    toggle.addEventListener("click", function () {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  if (typeof WORKOUTS === "undefined") return;
  const params = new URLSearchParams(location.search);
  const type = params.get("type") || "跑步";

  const SPORTS = [
    { name: "跑步", icon: "🏃", desc: "清晨或夜跑，一个人也能很自在。" },
    { name: "骑行", icon: "🚴", desc: "周末刷街，追风一样的自由。" },
    { name: "走路", icon: "🚶", desc: "不赶路的步行，也是一种放松。" },
    { name: "乒乓", icon: "🏓", desc: "国球，办公室也能来两拍。" },
    { name: "瑜伽", icon: "🧘", desc: "舒展身体，安放呼吸。" },
    { name: "健身", icon: "💪", desc: "力量与坚持的日常。" }
  ];
  const cur = SPORTS.filter(function (s) { return s.name === type; })[0] || SPORTS[0];

  document.title = "运动记录 · Rainbow's life";
  const iconEl = document.getElementById("sportIcon");
  const titleEl = document.getElementById("sportTitle");
  const descEl = document.getElementById("sportDesc");
  if (iconEl) iconEl.textContent = "🏃";
  if (titleEl) titleEl.textContent = "运动记录";
  if (descEl) descEl.textContent = "来自 Keep 手环的真实记录，每天自动同步。";

  /* ---------- 分类切换标签 ---------- */
  const tabsEl = document.getElementById("sportTabs");
  if (tabsEl) {
    tabsEl.innerHTML = SPORTS.map(function (s) {
      return '<a class="sport-tab' + (s.name === cur.name ? " on" : "") +
             '" href="sport.html?type=' + encodeURIComponent(s.name) + '">' +
             s.icon + " " + s.name + "</a>";
    }).join("");
  }

  const statsEl = document.getElementById("sportStats");
  const listEl = document.getElementById("sportList");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtNum(n, unit) {
    if (n == null || isNaN(n)) return "—";
    return (Math.round(Number(n) * 10) / 10) + (unit || "");
  }

  function render(list) {
    if (!listEl || !statsEl) return;
    if (!list.length) {
      statsEl.innerHTML = "";
      listEl.innerHTML = '<div class="sport-empty">' + cur.icon +
        '<p>这类运动还没有记录～</p><p class="sport-empty__sub">数据在 Keep 里记一次，明天同步后就会出现</p></div>';
      return;
    }
    // 统计
    let totalMin = 0, totalKm = 0, totalKcal = 0;
    list.forEach(function (r) {
      totalMin += Number(r.duration_min) || 0;
      totalKm += Number(r.distance_km) || 0;
      totalKcal += Number(r.calorie) || 0;
    });
    statsEl.innerHTML =
      '<div class="sport-stat"><b>' + list.length + '</b><span>总次数</span></div>' +
      '<div class="sport-stat"><b>' + fmtNum(totalMin, '') + '</b><span>总时长(分钟)</span></div>' +
      (cur.name === "跑步" || cur.name === "骑行"
        ? '<div class="sport-stat"><b>' + fmtNum(totalKm, '') + '</b><span>总里程(km)</span></div>'
        : '<div class="sport-stat"><b>' + fmtNum(totalKcal, '') + '</b><span>总消耗(千卡)</span></div>');

    // 列表（倒序，最新在前）
    listEl.innerHTML = '<h3 class="sport-list__title">最近记录（共 ' + list.length + ' 条）</h3>' +
      list.map(function (r) {
        var bits = [];
        if (r.duration_min != null) bits.push("⏱ " + fmtNum(r.duration_min, " 分钟"));
        if (r.distance_km != null && Number(r.distance_km) > 0) bits.push("📍 " + fmtNum(r.distance_km, " km"));
        if (r.calorie != null) bits.push("🔥 " + r.calorie + " 千卡");
        if (r.device) bits.push("⌚ " + esc(r.device));
        return '<div class="sport-item">' +
                 '<div class="sport-item__date">' + esc(r.start_at || "") + '</div>' +
                 '<div class="sport-item__name">' + esc(r.name || cur.name) + '</div>' +
                 '<div class="sport-item__meta">' + bits.join("　") + '</div>' +
               '</div>';
      }).join("");
  }

  /* ---------- 读取数据（公开只读） ---------- */
  async function load() {
    if (!listEl) return;
    try {
      const url = WORKOUTS.url + "/rest/v1/" + WORKOUTS.table +
        "?select=*&sport=eq." + encodeURIComponent(cur.name) +
        "&order=start_at.desc&limit=1000";
      const r = await fetch(url, {
        headers: { "apikey": WORKOUTS.key, "Authorization": "Bearer " + WORKOUTS.key }
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const rows = await r.json();
      render(rows);
    } catch (err) {
      listEl.innerHTML = '<div class="sport-empty">' + cur.icon +
        '<p>记录还没同步过来～</p><p class="sport-empty__sub">等第一次同步完成后刷新即可</p></div>';
      console.warn("[workouts]", err);
    }
  }
  load();

  /* ---------- 滚动渐显 ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { ro.observe(el); });
  }
})();
