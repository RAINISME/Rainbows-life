/* ============================================================
   交互逻辑：主题切换 / 滚动渐显 / 导航高亮 / 回到顶部 / 打字机
   数据渲染：工作、兴趣、日常
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 渲染：工作经历 ---------- */
  const tl = document.getElementById("workTimeline");
  if (tl && typeof WORK !== "undefined") {
    tl.innerHTML = WORK.map(function (w) {
      const tags = (w.tags || []).map(function (t) { return '<span class="tag">' + t + "</span>"; }).join("");
      return (
        '<div class="tl-item reveal">' +
          '<div class="tl-card">' +
            '<div class="tl-top"><span class="tl-role">' + w.role + '</span><span class="tl-date">' + w.date + "</span></div>" +
            '<div class="tl-org">' + w.org + "</div>" +
            '<div class="tl-desc">' + w.desc + "</div>" +
            '<div class="tl-tags">' + tags + "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- 渲染：兴趣（整卡可点击跳转子页面） ---------- */
  const hg = document.getElementById("hobbyGrid");
  if (hg && typeof HOBBIES !== "undefined") {
    hg.innerHTML = HOBBIES.map(function (h) {
      return (
        '<a class="hobby reveal" href="hobby.html?h=' + encodeURIComponent(h.id) + '">' +
          '<div class="hobby__head">' +
            '<span class="hobby__title">' + h.title + "</span>" +
            '<span class="hobby__icon">' + h.icon + "</span>" +
            '<span class="hobby__go">查看详情 →</span>' +
          "</div>" +
          '<div class="hobby__desc">' + h.desc + "</div>" +
        "</a>"
      );
    }).join("");
  }

  /* ---------- 渲染：我的宠物 ---------- */
  const pg = document.getElementById("petGrid");
  if (pg && typeof PETS !== "undefined") {
    pg.innerHTML = PETS.map(function (p) {
      const traits = (p.traits || []).map(function (t) { return '<span class="tag">' + t + "</span>"; }).join("");
      const photos = (p.photos || []).map(function (ph) {
        return (
          '<figure class="pet__photo">' +
            '<img src="' + ph.src + '" alt="' + (ph.alt || "") + '" loading="lazy" decoding="async">' +
            (ph.alt ? '<figcaption>' + ph.alt + "</figcaption>" : "") +
          "</figure>"
        );
      }).join("");
      return (
        '<div class="pet reveal' + (photos ? " pet--wide" : "") + '">' +
          '<div class="pet__info">' +
            '<div class="pet__topline">' +
              '<span class="pet__emoji">' + p.emoji + "</span>" +
              '<span class="pet__species">' + p.species + "</span>" +
            "</div>" +
            '<div class="pet__meta">' +
              '<span class="pet__since">' + p.since + "</span>" +
              (p.dailyUrl ? '<a class="pet__daily" href="' + p.dailyUrl + '">查看日常 →</a>' : "") +
            "</div>" +
            '<p class="pet__desc">' + p.desc + "</p>" +
            '<div class="pet__traits">' + traits + "</div>" +
          "</div>" +
          (photos ? '<div class="pet__photos">' + photos + "</div>" : "") +
        "</div>"
      );
    }).join("");
  }

  /* ---------- 站长模式：日常记录只有站长能增删改，其他人只读 ---------- */
  const OWNER_KEY = "journal-owner";
  function isOwner() {
    try { return localStorage.getItem(OWNER_KEY) === "1"; } catch (e) { return false; }
  }
  function applyOwnerUI() {
    document.body.classList.toggle("is-owner", isOwner());
  }
  async function sha256hex(str) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }
    return null;
  }
  applyOwnerUI();

  /* ---------- 渲染：日常记录（封装成函数，新增后可刷新列表） ---------- */
  let revealObserver = null;
  function renderJournal() {
    const jl = document.getElementById("journalList");
    if (!jl || typeof JOURNAL === "undefined") return;
    jl.innerHTML = JOURNAL.map(function (e, i) {
      const d = new Date(e.date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = (d.getMonth() + 1) + "月";
      const year = d.getFullYear();
      const tags = (e.tags || []).map(function (t) { return '<span class="tag">' + t + "</span>"; }).join("");
      // 编辑/删除按钮只给站长渲染，普通访客的 DOM 里根本没有这两个按钮
      const actions = isOwner()
        ? '<div class="j-actions">' +
            '<button type="button" class="j-btn" data-act="edit" data-i="' + i + '">✏️ 编辑</button>' +
            '<button type="button" class="j-btn j-btn--danger" data-act="del" data-i="' + i + '">🗑 删除</button>' +
          "</div>"
        : "";
      return (
        '<div class="j-entry reveal">' +
          '<div class="j-date">' +
            '<div class="d">' + day + "</div>" +
            '<div class="m">' + year + " · " + month + "</div>" +
            '<div class="j-mood">' + (e.mood || "") + "</div>" +
          "</div>" +
          '<div class="j-body">' +
            "<h3>" + e.title + "</h3>" +
            "<p>" + e.desc + "</p>" +
            '<div class="tl-tags">' + tags + "</div>" +
            actions +
          "</div>" +
        "</div>"
      );
    }).join("");
    // 新渲染的卡片交给渐显观察器（首屏渲染时 observer 尚未创建，直接显示）
    jl.querySelectorAll(".reveal").forEach(function (el) {
      if (revealObserver) revealObserver.observe(el); else el.classList.add("in");
    });
  }

  /* ---------- 数据来源优先级 ----------
     ① 站长本机未发布的修改（localStorage）
     ② 线上 journal-data.json（所有人看到的内容，由站长「发布到线上」写入）
     ③ data.js 里的 JOURNAL 默认值                                        */
  let localPending = null;
  if (isOwner()) {
    try {
      const savedJ = JSON.parse(localStorage.getItem("journal-entries") || "null");
      if (Array.isArray(savedJ) && savedJ.length) localPending = savedJ;
    } catch (err) { /* 忽略坏数据 */ }
  }
  if (localPending && typeof JOURNAL !== "undefined") {
    JOURNAL.length = 0;
    Array.prototype.push.apply(JOURNAL, localPending);
  }

  // 拉取线上数据（站长有未发布修改时不覆盖）
  (function loadRemoteJournal() {
    if (typeof JOURNAL === "undefined" || localPending) return;
    fetch("assets/js/journal-data.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (arr) {
        if (!Array.isArray(arr) || !arr.length) return;
        JOURNAL.length = 0;
        Array.prototype.push.apply(JOURNAL, arr);
        renderJournal();
        const s = document.getElementById("statJournal");
        if (s) { s.setAttribute("data-count", String(JOURNAL.length)); s.textContent = String(JOURNAL.length); }
      })
      .catch(function () { /* 文件不存在时静默降级到 data.js */ });
  })();

  /* ---------- 主题切换 ---------- */
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

  /* ---------- 导航：回到顶部 ---------- */
  const toTop = document.getElementById("toTop");
  window.addEventListener("scroll", function () {
    if (toTop) toTop.classList.toggle("show", window.scrollY > 600);
  });
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* ---------- 导航：移动端侧边栏开关 ---------- */
  const sidebar = document.getElementById("sidebar");
  const burger = document.getElementById("navBurger");
  const links = document.getElementById("navLinks");
  if (burger && sidebar) {
    burger.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      document.body.classList.toggle("nav-open", sidebar.classList.contains("open"));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        sidebar.classList.remove("open");
        document.body.classList.remove("nav-open");
      });
    });
  }

  /* ---------- 导航高亮（当前区块） ---------- */
  const sections = document.querySelectorAll("section[id], footer[id]");
  const navAnchors = links ? links.querySelectorAll("a") : [];
  const navIds = Array.prototype.map.call(navAnchors, function (a) { return a.getAttribute("href"); });
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          const id = "#" + en.target.getAttribute("id");
          if (navIds.indexOf(id) === -1) return; // 非导航目标（如 hero）保持当前选中，避免清空默认项
          navAnchors.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 滚动渐显 ---------- */
  const reveals = document.querySelectorAll(".reveal");
  let ro = null;
  if ("IntersectionObserver" in window) {
    ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }
  revealObserver = ro;

  // 渐显观察器就绪后再渲染日常记录，列表与统计数字保持动态
  renderJournal();
  const statJ = document.getElementById("statJournal");
  if (statJ && typeof JOURNAL !== "undefined") statJ.setAttribute("data-count", String(JOURNAL.length));
  const statH = document.getElementById("statHobby");
  if (statH && typeof HOBBIES !== "undefined") statH.setAttribute("data-count", String(HOBBIES.length));

  /* ---------- 数字滚动 ---------- */
  const counters = document.querySelectorAll(".stat__num");
  if ("IntersectionObserver" in window && counters.length) {
    const co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          const el = en.target;
          const raw = el.getAttribute("data-count") || "0";
          const suffix = /\+$/.test(raw) ? "+年" : "";
          const target = parseInt(raw, 10);
          if (isNaN(target)) { el.textContent = raw; co.unobserve(el); return; }
          let n = 0; const step = Math.max(1, Math.round(target / 40));
          const timer = setInterval(function () {
            n += step; if (n >= target) { n = target; clearInterval(timer); }
            el.textContent = n + suffix;
          }, 28);
          co.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { co.observe(c); });
  }

  /* ---------- 打字机（每个短语不同颜色） ---------- */
  const typed = document.getElementById("typed");
  const phrases = ["测试工程师", "运动爱好者", "美食爱好者", "鹦鹉爱好者", "生活记录者"];
  const phraseColors = ["#7c5cff", "#2dd4bf", "#ff5ca8", "#f5a524", "#b15cff"];
  if (typed) {
    let pi = 0, ci = 0, deleting = false;
    function paint() {
      typed.style.color = phraseColors[pi % phraseColors.length];
      typed.style.textShadow = "0 0 28px " + phraseColors[pi % phraseColors.length] + "66";
    }
    function tick() {
      const word = phrases[pi];
      paint();
      if (!deleting) {
        typed.textContent = word.slice(0, ++ci);
        if (ci === word.length) { deleting = true; return setTimeout(tick, 1600); }
      } else {
        typed.textContent = word.slice(0, --ci);
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
      }
      setTimeout(tick, deleting ? 55 : 120);
    }
    tick();
  }

  /* ---------- 留言弹框（静态站点：留言保存在本机 localStorage） ---------- */
  const guestChip = document.getElementById("guestbookChip");
  const guestMask = document.getElementById("guestMask");
  if (guestChip && guestMask) {
    const GB_KEY = "guestbook-entries";
    const gForm = document.getElementById("guestForm");
    const gName = document.getElementById("guestName");
    const gText = document.getElementById("guestText");
    const gCount = document.getElementById("guestCount");
    const gList = document.getElementById("guestList");

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function readGuest() {
      try {
        const v = JSON.parse(localStorage.getItem(GB_KEY) || "[]");
        return Array.isArray(v) ? v : [];
      } catch (err) { return []; }
    }
    function writeGuest(list) {
      try { localStorage.setItem(GB_KEY, JSON.stringify(list)); } catch (err) { /* 忽略存储不可用 */ }
    }
    function renderGuest() {
      if (!gList) return;
      const list = readGuest();
      if (!list.length) {
        gList.innerHTML = '<li class="guest-empty">还没有留言，来写第一条吧～</li>';
        return;
      }
      gList.innerHTML = list.map(function (m, i) {
        return (
          '<li class="guest-item">' +
            '<div class="guest-item__top">' +
              '<span class="guest-item__name">' + esc(m.name) + '</span>' +
              '<span class="guest-item__actions">' +
                '<span class="guest-item__time">' + esc(m.time) + '</span>' +
                '<button type="button" class="guest-item__del" data-i="' + i + '">删除</button>' +
              '</span>' +
            '</div>' +
            '<p class="guest-item__text">' + esc(m.text) + '</p>' +
          '</li>'
        );
      }).join("");
    }
    function openGuest() {
      guestMask.hidden = false;
      renderGuest();
      if (gText) setTimeout(function () { gText.focus(); }, 60);
    }
    function closeGuest() { guestMask.hidden = true; }

    guestChip.addEventListener("click", function (e) { e.preventDefault(); openGuest(); });
    const gClose = document.getElementById("guestClose");
    if (gClose) gClose.addEventListener("click", closeGuest);
    guestMask.addEventListener("click", function (e) { if (e.target === guestMask) closeGuest(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !guestMask.hidden) closeGuest();
    });

    if (gText && gCount) {
      gText.addEventListener("input", function () { gCount.textContent = gText.value.length + " / 200"; });
    }
    if (gForm) {
      gForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const text = (gText.value || "").trim();
        if (!text) { showToast("写点内容再发送吧～"); gText.focus(); return; }
        const name = (gName.value || "").trim() || "匿名朋友";
        const d = new Date();
        const pad = function (n) { return String(n).padStart(2, "0"); };
        const time = d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) +
                     " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
        const list = readGuest();
        list.unshift({ name: name, text: text, time: time });
        writeGuest(list.slice(0, 50));
        gText.value = "";
        gName.value = "";
        gCount.textContent = "0 / 200";
        renderGuest();
        showToast("✨ 留言已保存，谢谢你～");
      });
    }
    if (gList) {
      gList.addEventListener("click", function (e) {
        const btn = e.target.closest(".guest-item__del");
        if (!btn) return;
        const i = parseInt(btn.getAttribute("data-i"), 10);
        const list = readGuest();
        if (isNaN(i) || !list[i]) return;
        list.splice(i, 1);
        writeGuest(list);
        renderGuest();
        showToast("已删除这条留言");
      });
    }
  }

  /* ---------- 轻提示 ---------- */
  const toast = document.getElementById("toast");
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add("show"); });
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.hidden = true; }, 320);
    }, 2200);
  }

  /* GitHub 链接待补充时，阻止空链接跳回页首（换成真实地址后自动失效） */
  const githubChip = document.getElementById("githubChip");
  if (githubChip) {
    githubChip.addEventListener("click", function (e) {
      if (githubChip.getAttribute("href") === "#") {
        e.preventDefault();
        showToast("GitHub 地址待补充～");
      }
    });
  }

  /* ---------- 站长登录 / 退出 ---------- */
  const ownerMask = document.getElementById("ownerMask");
  const ownerPw = document.getElementById("ownerPw");
  const ownerErr = document.getElementById("ownerErr");
  const ownerOk = document.getElementById("ownerOk");
  const ownerCancel = document.getElementById("ownerCancel");
  const ownerExit = document.getElementById("ownerExit");

  function enterOwner() {
    try { localStorage.setItem(OWNER_KEY, "1"); } catch (e) { /* ignore */ }
    applyOwnerUI();
    renderJournal();
  }
  function exitOwner() {
    try { localStorage.removeItem(OWNER_KEY); } catch (e) { /* ignore */ }
    applyOwnerUI();
    renderJournal();
    showToast("已退出站长模式，现在只能浏览");
  }

  if (ownerMask && ownerOk) {
    ownerOk.addEventListener("click", async function () {
      const target = (typeof OWNER !== "undefined" && OWNER.hash) ? String(OWNER.hash).toLowerCase() : "";
      const hash = await sha256hex(ownerPw ? ownerPw.value : "");
      if (hash && target && hash === target) {
        ownerMask.hidden = true;
        enterOwner();
        showToast("🔑 已进入站长模式，可以新增 / 编辑 / 删除啦");
        // 把地址栏里的 ?me=1 去掉，避免刷新又弹一次
        try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* ignore */ }
      } else if (ownerErr) {
        ownerErr.hidden = false;
        if (ownerPw) { ownerPw.select(); }
      }
    });
    if (ownerPw) {
      ownerPw.addEventListener("keydown", function (e) { if (e.key === "Enter") ownerOk.click(); });
    }
    if (ownerCancel) ownerCancel.addEventListener("click", function () { ownerMask.hidden = true; });
    ownerMask.addEventListener("click", function (e) { if (e.target === ownerMask) ownerMask.hidden = true; });
  }
  if (ownerExit) ownerExit.addEventListener("click", exitOwner);

  // 网址带 ?me=1 且当前还不是站长 → 弹出登录
  if (/(?:^|[?&])me=1(?:&|$)/.test(location.search) && !isOwner()) {
    ownerMask.hidden = false;
    setTimeout(function () { if (ownerPw) ownerPw.focus(); }, 80);
  }

  /* ---------- 导出 JSON（站长把本机编辑结果落到仓库用） ---------- */
  const jExport = document.getElementById("journalExport");
  if (jExport) {
    jExport.addEventListener("click", function () {
      const json = JSON.stringify(JOURNAL, null, 2);
      function done() { showToast("📋 JSON 已复制，粘到 data.js 的 JOURNAL 即可发布"); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(done).catch(fallback);
      } else { fallback(); }
      function fallback() {
        const ta = document.createElement("textarea");
        ta.value = json;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        ta.remove();
        showToast(ok ? "📋 JSON 已复制到剪贴板" : "复制失败，请手动复制");
      }
    });
  }

  /* ---------- 一键发布到线上（GitHub API，Token 只存本机） ---------- */
  const jPublish = document.getElementById("journalPublish");
  const GH_TOKEN_KEY = "journal-gh-token";
  function b64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  async function ghJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      let msg = res.status + " " + res.statusText;
      try { const j = await res.json(); if (j && j.message) msg = j.message; } catch (e) { /* ignore */ }
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return res.json();
  }
  if (jPublish) {
    jPublish.addEventListener("click", async function () {
      if (!isOwner()) return;
      if (typeof OWNER === "undefined" || !OWNER.repo || !OWNER.journalPath) {
        showToast("⚠️ data.js 里还没配置 OWNER.repo / journalPath");
        return;
      }
      let token = "";
      try { token = localStorage.getItem(GH_TOKEN_KEY) || ""; } catch (e) { /* ignore */ }
      if (!token) {
        token = window.prompt(
          "首次发布需要 GitHub Token（仅保存在你这台设备的浏览器里）\n\n" +
          "生成：GitHub → Settings → Developer settings → Personal access tokens → Fine-grained / Classic\n" +
          "权限：对本仓库的 Contents 读 + 写\n\n" +
          "粘贴 Token："
        );
        if (!token) return;
        token = token.trim();
        try { localStorage.setItem(GH_TOKEN_KEY, token); } catch (e) { /* ignore */ }
      }
      const api = "https://api.github.com/repos/" + OWNER.repo + "/contents/" + OWNER.journalPath;
      const branch = OWNER.branch || "main";
      const headers = { Authorization: "token " + token, Accept: "application/vnd.github+json" };

      const label = jPublish.textContent;
      jPublish.disabled = true;
      jPublish.textContent = "发布中…";
      try {
        let sha = null;
        try {
          const info = await ghJson(api + "?ref=" + encodeURIComponent(branch), { headers: headers });
          sha = info && info.sha;
        } catch (e) { sha = null; }   // 文件还不存在 → 当作新建

        const body = {
          message: "content: 更新日常记录 " + new Date().toISOString().slice(0, 16).replace("T", " "),
          content: b64Utf8(JSON.stringify(JOURNAL, null, 2) + "\n"),
          branch: branch
        };
        if (sha) body.sha = sha;

        await ghJson(api, {
          method: "PUT",
          headers: Object.assign({ "Content-Type": "application/json" }, headers),
          body: JSON.stringify(body)
        });

        try { localStorage.removeItem("journal-entries"); } catch (e) { /* ignore */ }
        showToast("🚀 已发布！GitHub Pages 约 1 分钟后更新");
      } catch (err) {
        if (err.status === 401 || /Bad credentials/i.test(err.message)) {
          try { localStorage.removeItem(GH_TOKEN_KEY); } catch (e) { /* ignore */ }
          showToast("❌ Token 无效，已清除，请重新点击发布");
        } else if (err.status === 404) {
          showToast("❌ 仓库/分支/路径不对，或 Token 无该仓库权限");
        } else {
          showToast("❌ 发布失败：" + err.message);
        }
        console.warn("[journal publish]", err);
      } finally {
        jPublish.disabled = false;
        jPublish.textContent = label;
      }
    });
  }

  /* ---------- 隐藏入口：连点页脚版权 3 次 → 站长登录 ---------- */
  const copyEl = document.querySelector(".footer__copy");
  if (copyEl) {
    let taps = 0, tapTimer = null;
    copyEl.style.cursor = "default";
    copyEl.addEventListener("click", function () {
      if (isOwner()) return;
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(function () { taps = 0; }, 1600);
      if (taps >= 3) {
        taps = 0;
        if (ownerMask) {
          ownerMask.hidden = false;
          setTimeout(function () { if (ownerPw) ownerPw.focus(); }, 60);
        }
      }
    });
  }

  /* ---------- 新增 / 编辑 / 删除 日常记录 ---------- */
  const addBtn = document.getElementById("addJournal");
  const jMask = document.getElementById("jformMask");
  if (addBtn && jMask) {
    const fDate = document.getElementById("jfDate");
    const fTitle = document.getElementById("jfTitle");
    const fMood = document.getElementById("jfMood");
    const fDesc = document.getElementById("jfDesc");
    const fTags = document.getElementById("jfTags");
    const jHeading = jMask.querySelector("h3");
    let editIndex = -1; // -1 = 新增；>=0 = 编辑对应下标的记录

    function resetForm() {
      if (fDate) fDate.value = "";
      if (fTitle) fTitle.value = "";
      if (fMood) fMood.value = "";
      if (fDesc) fDesc.value = "";
      if (fTags) fTags.value = "";
      editIndex = -1;
      if (jHeading) jHeading.textContent = "新增记录";
    }

    function fillToday() {
      const t = new Date();
      return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    }

    function openForm(entry, idx) {
      editIndex = (typeof idx === "number" && idx >= 0) ? idx : -1;
      if (jHeading) jHeading.textContent = editIndex >= 0 ? "编辑记录" : "新增记录";
      if (entry) {
        if (fDate) fDate.value = entry.date || "";
        if (fTitle) fTitle.value = entry.title || "";
        if (fMood) fMood.value = entry.mood || "";
        if (fDesc) fDesc.value = entry.desc || "";
        if (fTags) fTags.value = (entry.tags || []).join(", ");
      } else {
        if (fDate && !fDate.value) fDate.value = fillToday();
      }
      jMask.hidden = false;
      if (fTitle) fTitle.focus();
    }

    addBtn.addEventListener("click", function () {
      if (!isOwner()) return;   // 只有站长能新增
      resetForm();
      openForm(null, -1);
    });
    document.getElementById("jfCancel").addEventListener("click", function () { jMask.hidden = true; });
    jMask.addEventListener("click", function (e) { if (e.target === jMask) jMask.hidden = true; });

    document.getElementById("jfSave").addEventListener("click", function () {
      if (!isOwner()) { jMask.hidden = true; return; }   // 只有站长能保存
      const title = fTitle.value.trim();
      if (!title) { fTitle.focus(); return; }
      const entry = {
        date: (fDate && fDate.value) || fillToday(),
        title: title,
        mood: fMood.value.trim() || "📝 随记",
        desc: fDesc.value.trim(),
        tags: fTags.value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean)
      };
      if (editIndex >= 0 && editIndex < JOURNAL.length) {
        JOURNAL[editIndex] = entry;
      } else {
        JOURNAL.unshift(entry);
      }
      try { localStorage.setItem("journal-entries", JSON.stringify(JOURNAL)); } catch (err) { /* ignore */ }
      renderJournal();
      const statNow = document.getElementById("statJournal");
      if (statNow) { statNow.setAttribute("data-count", String(JOURNAL.length)); statNow.textContent = String(JOURNAL.length); }
      jMask.hidden = true;
      const wasEdit = editIndex >= 0;
      resetForm();
      showToast(wasEdit ? "✅ 记录已更新" : "✨ 新记录已保存");
    });

    // 卡片上的 编辑 / 删除 按钮（事件委托，重渲染后依然有效）
    const jl = document.getElementById("journalList");
    if (jl) {
      jl.addEventListener("click", function (e) {
        const btn = e.target.closest(".j-btn");
        if (!btn || !isOwner()) return;   // 只有站长能编辑/删除
        const i = parseInt(btn.getAttribute("data-i"), 10);
        if (isNaN(i) || i < 0 || i >= JOURNAL.length) return;
        if (btn.getAttribute("data-act") === "edit") {
          openForm(JOURNAL[i], i);
        } else if (btn.getAttribute("data-act") === "del") {
          if (!window.confirm("确定删除这条记录吗？删除后不可恢复。")) return;
          JOURNAL.splice(i, 1);
          try { localStorage.setItem("journal-entries", JSON.stringify(JOURNAL)); } catch (err) { /* ignore */ }
          renderJournal();
          const statNow = document.getElementById("statJournal");
          if (statNow) { statNow.setAttribute("data-count", String(JOURNAL.length)); statNow.textContent = String(JOURNAL.length); }
          showToast("🗑 已删除这条记录");
        }
      });
    }
  }


  /* ---------- 年份 ---------- */
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
