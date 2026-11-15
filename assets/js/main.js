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
            '<div class="j-actions">' +
              '<button type="button" class="j-btn" data-act="edit" data-i="' + i + '">✏️ 编辑</button>' +
              '<button type="button" class="j-btn j-btn--danger" data-act="del" data-i="' + i + '">🗑 删除</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
    // 新渲染的卡片交给渐显观察器（首屏渲染时 observer 尚未创建，直接显示）
    jl.querySelectorAll(".reveal").forEach(function (el) {
      if (revealObserver) revealObserver.observe(el); else el.classList.add("in");
    });
  }

  // 恢复 localStorage 里保存的日常记录（新增的条目刷新不丢失）
  if (typeof JOURNAL !== "undefined") {
    try {
      const savedJ = JSON.parse(localStorage.getItem("journal-entries") || "null");
      if (Array.isArray(savedJ) && savedJ.length) {
        JOURNAL.length = 0;
        Array.prototype.push.apply(JOURNAL, savedJ);
      }
    } catch (err) { /* 忽略坏数据 */ }
  }

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
      resetForm();
      openForm(null, -1);
    });
    document.getElementById("jfCancel").addEventListener("click", function () { jMask.hidden = true; });
    jMask.addEventListener("click", function (e) { if (e.target === jMask) jMask.hidden = true; });

    document.getElementById("jfSave").addEventListener("click", function () {
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
        if (!btn) return;
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
