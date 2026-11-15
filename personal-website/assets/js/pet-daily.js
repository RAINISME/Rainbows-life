/* ============================================================
   鹦鹉日常子页面：读取 data.js 的 PET_VIDEOS 渲染视频网格
   - src 为空  -> 显示「筹备中」占位卡
   - src 有值  -> 渲染可播放的 <video controls>
   后期上传视频：把文件放进 assets/video/，在 data.js 里填 src 即可
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

  const grid = document.getElementById("videoGrid");
  if (!grid) return;

  const videos = (typeof PET_VIDEOS !== "undefined" && PET_VIDEOS.length) ? PET_VIDEOS : [];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  if (!videos.length) {
    grid.innerHTML =
      '<div class="video-empty reveal">🎬 还没有安排视频位，去 <code>data.js</code> 的 PET_VIDEOS 里加几条吧～</div>';
  } else {
    grid.innerHTML = videos.map(function (v) {
      const media = v.src
        ? '<video controls preload="metadata"' +
            (v.poster ? ' poster="' + esc(v.poster) + '"' : "") +
          '><source src="' + esc(v.src) + '" type="video/mp4">你的浏览器不支持视频播放。</video>'
        : '<div class="video-card__placeholder"><span class="video-card__cam">🎬</span>' +
            '<span class="video-card__soon">视频筹备中</span></div>';
      return (
        '<div class="video-card reveal">' +
          '<div class="video-card__media">' + media + "</div>" +
          '<div class="video-card__info">' +
            '<h3 class="video-card__title">' + esc(v.title || "未命名") + "</h3>" +
            (v.desc ? '<p class="video-card__desc">' + esc(v.desc) + "</p>" : "") +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- 滚动渐显 ---------- */
  const reveals = grid.querySelectorAll(".reveal");
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
