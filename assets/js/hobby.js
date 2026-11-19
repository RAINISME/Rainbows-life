/* ============================================================
   兴趣子页面：读取 ?h=<id> 渲染对应兴趣的细分项目
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 主题切换（与主站一致） ---------- */
  const toggle = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  if (toggle) {
    toggle.addEventListener("click", function () {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  /* ---------- 读取参数 ---------- */
  const params = new URLSearchParams(window.location.search);
  const id = params.get("h");
  const box = document.getElementById("hobbyDetail");

  if (typeof HOBBIES === "undefined" || !box) return;

  const hobby = HOBBIES.filter(function (h) { return h.id === id; })[0];

  if (!hobby) {
    box.innerHTML =
      '<div class="subhero">' +
        '<div class="subhero__icon">🤔</div>' +
        '<h1 class="subhero__title">没有找到这个兴趣</h1>' +
        '<p class="subhero__desc">可能链接有误，<a href="index.html#hobbies">回到兴趣主页</a>看看吧。</p>' +
      '</div>';
    return;
  }

  document.title = hobby.title + " · Rainbow's life";

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  const items = (hobby.items || []).map(function (it) {
    var linkHtml = "";
    // 通用 href：卡片可跳转到自定义页面（如演唱会）
    if (it.href) {
      linkHtml = '<a class="subitem__link" href="' + it.href + '">查看' + escHtml(it.name) + ' →</a>';
    }
    // B 方案：有 sportType 的卡片（跑步/骑行/走路/乒乓等）显示「查看记录 →」进详情页
    if (it.sportType) {
      linkHtml = '<a class="subitem__link" href="sport.html?type=' + encodeURIComponent(it.sportType) +
                 '">查看' + escHtml(it.name) + '记录 →</a>';
    } else if (typeof it.link !== "undefined") {
      linkHtml = it.link
        ? '<a class="subitem__link" href="' + it.link + '" target="_blank" rel="noopener noreferrer">查看跑步记录 →</a>'
        : '<span class="subitem__link subitem__link--soon">📈 跑步记录同步中…</span>';
    }
    var clickable = it.sportType || it.href;
    return (
      '<div class="subitem reveal' + (clickable ? ' subitem--clickable' : '') + '">' +
        (it.sportType
          ? '<a class="subitem__cover" href="sport.html?type=' + encodeURIComponent(it.sportType) + '" aria-label="查看' + escHtml(it.name) + '记录"></a>'
          : (it.href
            ? '<a class="subitem__cover" href="' + it.href + '" aria-label="查看' + escHtml(it.name) + '"></a>'
            : '')) +
        '<span class="subitem__icon">' + it.icon + "</span>" +
        '<div class="subitem__name">' + it.name + "</div>" +
        (it.note ? '<div class="subitem__note">' + it.note + "</div>" : "") +
        linkHtml +
      "</div>"
    );
  }).join("");

  var extra = "";
  if (id === "sport" && typeof RUNNING_PAGE_URL !== "undefined" && RUNNING_PAGE_URL) {
    extra = '<a class="subitem__link subitem__link--alt" href="' + RUNNING_PAGE_URL +
            '" target="_blank" rel="noopener noreferrer">📈 查看完整跑步主页（地图轨迹） →</a>';
  }
  box.innerHTML = '<div class="subitems">' + items + extra + "</div>";

  /* ---------- 滚动渐显 ---------- */
  const reveals = box.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }
})();
