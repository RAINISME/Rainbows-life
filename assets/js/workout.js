/* ============================================================
   单次运动详情页：按 ?id=<keep_id> 查 workouts 表展示详情
   detail 字段（训练效果等）有则显示，没有则只显示基础数据
   ============================================================ */
(function () {
  "use strict";

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
  const id = new URLSearchParams(location.search).get("id");
  const box = document.getElementById("detailBox");
  const iconEl = document.getElementById("detailIcon");
  const titleEl = document.getElementById("detailTitle");
  const dateEl = document.getElementById("detailDate");

  const ICONS = { "跑步": "🏃", "骑行": "🚴", "走路": "🚶", "乒乓": "🏓", "健身": "💪", "瑜伽": "🧘", "羽毛球": "🏸" };
  const SPORT_TAB = { "跑步": "跑步", "骑行": "骑行", "走路": "走路", "乒乓": "乒乓", "健身": "健身", "瑜伽": "瑜伽" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function card(label, value, unit) {
    if (value == null || value === "") return "";
    return '<div class="wd-cell"><span>' + esc(label) + '</span><b>' + esc(value) +
           (unit ? '<i> ' + esc(unit) + '</i>' : '') + '</b></div>';
  }

  function render(r) {
    if (!box) return;
    const icon = ICONS[r.sport] || "🏃";
    if (iconEl) iconEl.textContent = icon;
    const backType = SPORT_TAB[r.sport] ? ('sport.html?type=' + encodeURIComponent(SPORT_TAB[r.sport])) : "sport.html";
    if (titleEl) titleEl.innerHTML = esc(r.sport) + '记录 <a class="wd-back-link" href="' + backType + '">← 全部记录</a>';
    if (dateEl) dateEl.textContent = (r.start_at || "") + (r.data_type ? " · " + r.data_type : "");
    document.title = r.sport + "记录详情 · Rainbow's life";

    let html = '<div class="wd-grid">' +
      card("运动时长", r.duration_min, "分钟") +
      card("距离", r.distance_km, "km") +
      card("消耗", r.calorie, "千卡") +
      card("设备", r.device, "") +
      '</div>';

    // detail 字段：训练效果等（有就显示）
    var d = r.detail;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (e) { d = null; } }
    if (d) {
      var effect = d.trainingEffect || d.effect;
      if (effect && (effect.aerobicsEffectDesc || effect.anaerobicEffectDesc || effect.highlightTips)) {
        html += '<div class="wd-section"><h3>💪 训练效果</h3>' +
                '<div class="wd-effect">' +
                (effect.highlightTips ? '<div class="wd-effect__tag">本次重点：' + esc(effect.highlightTips) + '</div>' : "") +
                (effect.aerobicsEffectDesc ? '<div class="wd-effect__row"><span>有氧能力</span><b>' + esc(effect.aerobicsEffectDesc) + '</b></div>' : "") +
                (effect.anaerobicEffectDesc ? '<div class="wd-effect__row"><span>无氧能力</span><b>' + esc(effect.anaerobicEffectDesc) + '</b></div>' : "") +
                (effect.tips ? '<p class="wd-effect__tips">' + esc(effect.tips) + '</p>' : "") +
                '</div></div>';
      }
      if (d.region) html += '<div class="wd-section"><h3>📍 地点</h3><p class="wd-text">' + esc(d.region) + '</p></div>';
      if (d.weather && typeof d.weather === "object") {
        var w = d.weather;
        html += '<div class="wd-section"><h3>🌤 天气</h3><p class="wd-text">' +
                esc([w.temperature, w.weather, w.humidity].filter(Boolean).join(" · ")) + '</p></div>';
      }
    }

    if (!d || !(d.trainingEffect || d.effect)) {
      html += '<p class="wd-note">ℹ️ 训练效果数据将在下次同步后补全（Keep 接口需单独请求详情）</p>';
    }

    html += '<p class="wd-id">记录编号：' + esc(r.keep_id) + '</p>';
    box.innerHTML = html;
  }

  async function load() {
    if (!id || !box) {
      if (box) box.innerHTML = '<div class="sport-empty">没有找到这条记录</div>';
      return;
    }
    try {
      const url = WORKOUTS.url + "/rest/v1/" + WORKOUTS.table +
        "?select=*&keep_id=eq." + encodeURIComponent(id) + "&limit=1";
      const r = await fetch(url, {
        headers: { "apikey": WORKOUTS.key, "Authorization": "Bearer " + WORKOUTS.key }
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const rows = await r.json();
      if (!rows.length) {
        box.innerHTML = '<div class="sport-empty">没有找到这条记录</div>';
        return;
      }
      render(rows[0]);
    } catch (err) {
      box.innerHTML = '<div class="sport-empty"><p>读取失败～</p><p class="sport-empty__sub">请稍后重试</p></div>';
      console.warn("[workout]", err);
    }
  }
  load();
})();
