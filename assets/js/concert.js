/* ============================================================
   演唱会页：按歌手分类展示 CONCERTS 里的视频
   ============================================================ */
(function () {
  "use strict";

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

  if (typeof CONCERTS === "undefined") return;
  const params = new URLSearchParams(location.search);
  const current = params.get("artist") || CONCERTS[0].artist;
  const tabsEl = document.getElementById("concertTabs");
  const stageEl = document.getElementById("concertStage");
  if (!tabsEl || !stageEl) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 分类标签
  tabsEl.innerHTML = CONCERTS.map(function (c) {
    return '<a class="sport-tab' + (c.artist === current ? " on" : "") +
           '" href="concert.html?artist=' + encodeURIComponent(c.artist) + '">' +
           c.icon + " " + esc(c.artist) + "</a>";
  }).join("");

  const group = CONCERTS.filter(function (c) { return c.artist === current; })[0] || CONCERTS[0];
  document.title = "演唱会 · " + group.artist + " · Rainbow's life";

  if (!group.videos.length) {
    stageEl.innerHTML = '<div class="sport-empty">' + group.icon +
      '<p>' + esc(group.artist) + ' 的现场还在整理中～</p>' +
      '<p class="sport-empty__sub">有新的视频会陆续补上来</p></div>';
    return;
  }

  stageEl.innerHTML = '<div class="concert-note">' + esc(group.note || "") + ' · 共 ' + group.videos.length + ' 段现场</div>' +
    '<div class="video-grid">' + group.videos.map(function (v) {
      return '<div class="video-card reveal">' +
               '<div class="video-card__media">' +
                 '<video controls preload="metadata" poster="' + esc(v.poster) + '">' +
                   '<source src="' + esc(v.src) + '" type="video/mp4">你的浏览器不支持视频播放。' +
                 '</video>' +
               '</div>' +
               '<div class="video-card__info">' +
                 '<h3 class="video-card__title">' + esc(v.title || group.artist) + '</h3>' +
               '</div>' +
             '</div>';
    }).join("") + '</div>';

  // 滚动渐显
  const reveals = stageEl.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }
})();
