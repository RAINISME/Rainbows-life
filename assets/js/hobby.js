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

  const items = (hobby.items || []).map(function (it) {
    // 有 link 的条目（如跑步）显示「查看记录 →」按钮，链接为空时显示占位提示
    var linkHtml = "";
    if (typeof it.link !== "undefined") {
      linkHtml = it.link
        ? '<a class="subitem__link" href="' + it.link + '" target="_blank" rel="noopener noreferrer">查看跑步记录 →</a>'
        : '<span class="subitem__link subitem__link--soon">📈 跑步记录同步中…</span>';
    }
    return (
      '<div class="subitem reveal">' +
        '<span class="subitem__icon">' + it.icon + "</span>" +
        '<div class="subitem__name">' + it.name + "</div>" +
        (it.note ? '<div class="subitem__note">' + it.note + "</div>" : "") +
        linkHtml +
      "</div>"
    );
  }).join("");

  box.innerHTML = '<div class="subitems">' + items + "</div>";

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
