/* ============================================================
   音乐播放器：全站常驻（index / hobby / pet-daily 共用）
   - 跨页保持当前歌曲、播放进度、播放状态（sessionStorage）
   - 列表循环、浏览器自动播放策略兜底
   - 【已关闭】进入页面自动播放：只有用户手动点 ▶ / 选歌才会响
   ============================================================ */
(function () {
  "use strict";

  // 独立 toast：子页面不加载 main.js，也能显示提示
  function showToast(msg) {
    var el = document.getElementById("musicToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "musicToast";
      el.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:200;padding:9px 18px;border-radius:999px;background:rgba(20,18,36,.9);color:#ececf4;font-size:12px;box-shadow:0 10px 30px -12px rgba(0,0,0,.7);pointer-events:none;opacity:0;transition:opacity .25s";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.style.opacity = "0"; }, 2600);
  }

  /* ---------- 音乐播放器（固定右上角 + 歌单下拉） ---------- */
  const musicBox = document.getElementById("musicBox");
  const bgMusic = document.getElementById("bgMusic");
  const musicToggle = document.getElementById("musicToggle");
  const musicFill = document.getElementById("musicFill");
  if (musicBox && bgMusic && musicToggle) {
    // iOS/移动端兼容：inline 播放 + 仅预载元数据（避免一次性下载 60MB 大文件导致卡顿）
    try {
      bgMusic.setAttribute("playsinline", "");
      bgMusic.setAttribute("webkit-playsinline", "");
      bgMusic.preload = "metadata";
    } catch (e) { /* 忽略 */ }
    const musicTitle = document.getElementById("musicTitle");
    const musicArtist = document.getElementById("musicArtist");
    const musicList = document.getElementById("musicList");
    const playlist = (typeof PLAYLIST !== "undefined" && PLAYLIST.length) ? PLAYLIST : [];
    const SINGER_LABEL = "歌唱者：彩虹";
    let musicReady = false;
    let current = 0;

    /* ---------- 跨页状态：切换页面后仍是同一首、同一进度 ----------
       sessionStorage 在同一标签页的多个页面间共享，各标签互不影响；
       file:// 或隐私模式下可能不可用，全部用 try/catch 静默降级。 */
    const STATE_KEY = "rainbow-music-state";
    let lastSave = 0;
    let lastTime = 0;         // 最近一次有效进度（页面卸载时 currentTime 会被清零）
    let leaving = false;
    let stateReady = false;  // 恢复完成前不写状态，避免初始化事件把进度覆盖成 0

    function readState() {
      try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); }
      catch (e) { return null; }
    }
    function saveState() {
      if (!stateReady) return;
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({
          i: current,
          t: leaving ? lastTime : (bgMusic.currentTime || 0),
          playing: !bgMusic.paused,
          muted: bgMusic.muted
        }));
      } catch (e) { /* 忽略存储不可用 */ }
    }
    function saveStateThrottled() {
      const now = Date.now();
      if (now - lastSave < 1500) return;
      lastSave = now;
      saveState();
    }

    function renderList() {
      if (!musicList) return;
      musicList.innerHTML = playlist.map(function (t, i) {
        return (
          '<div class="music__item' + (i === current ? " on" : "") + '" data-i="' + i + '" role="button" tabindex="0">' +
            '<span class="music__item-idx">' + String(i + 1).padStart(2, "0") + "</span>" +
            '<span class="music__item-name">' + t.title + "</span>" +
            '<span class="music__item-artist">' + (t.artist || "") + "</span>" +
          "</div>"
        );
      }).join("");
    }

    function setTrack(i, autoplay) {
      if (!playlist[i]) return;
      current = i;
      const t = playlist[i];
      musicReady = false;
      bgMusic.src = t.src;
      if (musicTitle) musicTitle.textContent = t.title;
      if (musicArtist) musicArtist.textContent = SINGER_LABEL;
      musicBox.classList.remove("music--empty", "playing");
      if (musicFill) musicFill.style.width = "0%";
      renderList();
      if (autoplay) {
        bgMusic.muted = false;   // 用户主动选歌，一定恢复声音
        const p = bgMusic.play();
        if (p && typeof p.catch === "function") {
          p.catch(function (err) {
            // 快速连续切歌时上一次 play 会被中止，属正常情况，不提示
            if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) return;
            showToast("🎵 音频未就位，请把文件放到 " + t.src);
          });
        }
      }
      saveState();
    }

    function setPlaying(on) {
      musicBox.classList.toggle("playing", on);
      musicToggle.textContent = on ? "❚❚" : "▶";
      musicToggle.setAttribute("aria-label", on ? "暂停" : "播放");
    }
    // 音频缺失时进入降级态：灰化唱片，保留歌名，副标题提示（歌单为空时不触发）
    function markMissing() {
      if (!playlist.length) return;
      musicReady = false;
      musicBox.classList.add("music--empty");
      musicBox.classList.remove("playing");
      musicToggle.textContent = "▶";
      if (musicArtist) musicArtist.textContent = SINGER_LABEL;
    }

    // 歌单点击切换
    if (musicList) {
      musicList.addEventListener("click", function (e) {
        const item = e.target.closest(".music__item");
        if (!item) return;
        const i = parseInt(item.getAttribute("data-i"), 10);
        if (isNaN(i) || i === current) { setPlaylistOpen(false); return; }
        setTrack(i, true);
        setPlaylistOpen(false);   // 选完歌自动收起歌单
      });
      // 键盘操作：Enter / 空格选择歌曲
      musicList.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        const item = e.target.closest(".music__item");
        if (!item) return;
        e.preventDefault();
        const i = parseInt(item.getAttribute("data-i"), 10);
        if (isNaN(i) || i === current) { setPlaylistOpen(false); return; }
        setTrack(i, true);
        setPlaylistOpen(false);   // 选完歌自动收起歌单
      });
    }
    // 移动端：点唱片或「歌单」按钮展开/收起歌单（再点一次收起）
    const musicDisc = document.getElementById("musicDisc");
    const musicListBtn = document.getElementById("musicListBtn");
    function setPlaylistOpen(open) {
      musicBox.classList.toggle("music--open", open);
      // 收起时加 music--closed，用来压掉 hover / :focus-within 造成的“收不起来”
      musicBox.classList.toggle("music--closed", !open);
      if (musicListBtn) musicListBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open && musicListBtn) musicListBtn.blur();
    }
    function togglePlaylist(force) {
      const open = (typeof force === "boolean") ? force : !musicBox.classList.contains("music--open");
      setPlaylistOpen(open);
    }
    // 鼠标离开歌单区域后解除“已关闭”标记，下次 hover 仍能正常展开
    const playlistWrap = musicBox.querySelector(".music__playlist");
    if (playlistWrap) {
      playlistWrap.addEventListener("mouseleave", function () {
        musicBox.classList.remove("music--closed");
      });
    }
    // 点空白处收起
    document.addEventListener("click", function (e) {
      if (!musicBox.contains(e.target)) setPlaylistOpen(false);
    });
    // 按 Esc 收起
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setPlaylistOpen(false);
    });
    /* ---------- 上一首 / 下一首（列表循环，点击即切换并播放） ---------- */
    function stepTrack(delta) {
      if (!playlist.length) return;
      setTrack((current + delta + playlist.length) % playlist.length, true);
    }
    const musicPrev = document.getElementById("musicPrev");
    const musicNext = document.getElementById("musicNext");
    if (musicPrev) musicPrev.addEventListener("click", function () { stepTrack(-1); });
    if (musicNext) musicNext.addEventListener("click", function () { stepTrack(1); });

    if (musicDisc) musicDisc.addEventListener("click", togglePlaylist);
    if (musicListBtn) musicListBtn.addEventListener("click", togglePlaylist);

    musicToggle.addEventListener("click", function () {
      if (!playlist.length) { showToast("🎵 歌单还没配好，等站长想好放哪首歌～"); return; }
      bgMusic.muted = false;   // 手动点播放时一定恢复声音
      if (!musicReady) {
        const t = playlist[current];
        showToast("🎵 音频未就位，请把文件放到 " + (t ? t.src : "assets/audio/"));
        return;
      }
      if (bgMusic.paused) {
        const p = bgMusic.play();
        if (p && typeof p.catch === "function") {
          p.catch(function () { showToast("🎵 音频未就位，请检查文件是否存在"); });
        }
      } else {
        bgMusic.pause();
      }
    });
    // 元数据/可播放：就绪并解除降级态（慢网络下加载可能超过兜底超时，成功后要恢复）
    bgMusic.addEventListener("loadedmetadata", function () {
      musicReady = true;
      musicBox.classList.remove("music--empty");
    });
    bgMusic.addEventListener("canplay", function () {
      musicReady = true;
      musicBox.classList.remove("music--empty");
    });
    bgMusic.addEventListener("play", function () { musicReady = true; setPlaying(true); saveState(); });
    bgMusic.addEventListener("pause", function () { setPlaying(false); saveState(); });
    bgMusic.addEventListener("timeupdate", function () {
      if (!bgMusic.duration || !musicFill) return;
      lastTime = bgMusic.currentTime;
      musicFill.style.width = ((bgMusic.currentTime / bgMusic.duration) * 100).toFixed(2) + "%";
      saveStateThrottled();
    });
    // 离开页面 / 切到后台：用最近一次有效进度落盘，避免卸载时 currentTime 归零
    window.addEventListener("pagehide", function () { leaving = true; saveState(); });
    window.addEventListener("beforeunload", function () { leaving = true; });
    document.addEventListener("visibilitychange", function () { if (document.hidden) saveState(); });
    // 播放结束 → 自动切下一首（列表循环播放）
    bgMusic.addEventListener("ended", function () {
      if (playlist.length > 1) {
        setTrack((current + 1) % playlist.length, true);
      } else {
        bgMusic.currentTime = 0;
        const p = bgMusic.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
    });
    bgMusic.addEventListener("error", markMissing);
    // 元数据始终没加载成功（如文件不存在）也进入降级态
    // 20s：线上 GitHub Pages 首次加载 60MB+ 音频可能较慢，不能太短
    setTimeout(function () { if (!musicReady) markMissing(); }, 20000);

    // 点击进度条跳转
    const musicBar = musicBox.querySelector(".music__bar");
    if (musicBar) {
      musicBar.addEventListener("click", function (e) {
        if (!musicReady || !bgMusic.duration) return;
        const r = musicBar.getBoundingClientRect();
        bgMusic.currentTime = ((e.clientX - r.left) / r.width) * bgMusic.duration;
      });
    }

    // 初始渲染：优先恢复跨页状态（同一首歌 + 同一进度），否则用默认第一首
    const saved = readState();
    if (bgMusic.readyState >= 1) musicReady = true;
    setPlaying(!bgMusic.paused);

    if (playlist.length) {
      const useSaved = !!(saved && playlist[saved.i]);
      const start = useSaved ? playlist[saved.i] : playlist[0];
      if (useSaved) current = saved.i;
      if (musicTitle) musicTitle.textContent = start.title;
      if (musicTitle) musicTitle.title = start.title;
      if (musicArtist) musicArtist.textContent = SINGER_LABEL;
      // 与 HTML 相同时不重复赋值，否则会重置媒体元素并打断自动播放
      if (bgMusic.getAttribute("src") !== start.src) bgMusic.src = start.src;

      if (useSaved) {
        const seekTo = Math.max(0, Number(saved.t) || 0);

        // seek 可能被后续资源加载重置：元数据/可播放事件 + 定时重试，直到生效
        let seekApplied = false;
        let seekTries = 0;
        const applySeek = function () {
          if (seekApplied) return;
          seekTries++;
          if (seekTo > 0) {
            try { bgMusic.currentTime = seekTo; } catch (e) { /* 忽略 */ }
            if (bgMusic.currentTime < seekTo * 0.5 && seekTries < 12) {
              setTimeout(applySeek, 250);
              return;
            }
          }
          seekApplied = true;
          stateReady = true;   // 恢复完成后才允许写状态
          if (musicFill && isFinite(bgMusic.duration) && bgMusic.duration > 0) {
            musicFill.style.width = ((bgMusic.currentTime / bgMusic.duration) * 100).toFixed(2) + "%";
          }
        };
        bgMusic.addEventListener("loadedmetadata", applySeek);
        bgMusic.addEventListener("canplay", applySeek);
        applySeek();
        setTimeout(applySeek, 800);
      } else {
        stateReady = true;
      }
    } else {
      /* 歌单为空（歌曲还没传）：播放器进入占位状态，等配好歌后自动恢复 */
      stateReady = true;
      musicReady = false;
      musicBox.classList.add("music--empty");
      if (musicTitle) { musicTitle.textContent = "🎵 歌单待定"; musicTitle.title = ""; }
      if (musicArtist) musicArtist.textContent = "等站长传歌～";
    }
    renderList();

    /* ---------- 进入页面不自动播放（已按需求关闭） ----------
       音乐只在用户手动点击 ▶ 或从歌单选歌后才开始播放；
       跨页仍会记住同一首歌和播放进度，点播放后从上次位置继续。 */

    // 粗指针设备（手机/平板）：未播放时给一个明确的「点击播放」提示
    const coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    if (coarse) {
      setTimeout(function () {
        if (bgMusic.paused && !musicBox.classList.contains("music--empty") && musicTitle) {
          musicTitle.textContent = "▶ 点击播放音乐";
        }
      }, 2500);
      bgMusic.addEventListener("play", function () {
        const t = playlist[current];
        if (t && musicTitle) musicTitle.textContent = t.title;
      });
    }
  }
})();
