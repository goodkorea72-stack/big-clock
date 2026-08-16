"use strict";

(function () {
  const $ = (id) => document.getElementById(id);
  const timeEl = $("time");
  const dateEl = $("date");
  const dayEl = $("day");
  const controls = $("controls");
  const btnFullscreen = $("btn-fullscreen");
  const btnFormat = $("btn-format");

  const STORAGE_KEY = "clock-format";
  const dayFormatter = new Intl.DateTimeFormat("ko-KR", { weekday: "long" });
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let is24h = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "12") is24h = false;
  } catch (e) {
    /* localStorage unavailable — keep default */
  }

  /* ---- 시간 표시 ---- */
  function formatTime(d) {
    let h = d.getHours();
    if (!is24h) {
      h = h % 12 || 12;
    }
    const m = String(d.getMinutes()).padStart(2, "0");
    return h + ":" + m;
  }

  function render() {
    const now = new Date();
    timeEl.textContent = formatTime(now);
    dayEl.textContent = dayFormatter.format(now);
    dateEl.textContent = dateFormatter.format(now);
  }

  // 초가 0이 되는 정각에 동기화하여 1초마다 갱신
  function schedule() {
    render();
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(function tick() {
      render();
      setTimeout(tick, 1000);
    }, msToNextMinute);
  }

  /* ---- 12/24시간 토글 ---- */
  function applyFormatButton() {
    btnFormat.textContent = is24h ? "12h" : "24h";
  }

  btnFormat.addEventListener("click", function () {
    is24h = !is24h;
    applyFormatButton();
    render();
    try {
      localStorage.setItem(STORAGE_KEY, is24h ? "24" : "12");
    } catch (e) {
      /* ignore */
    }
  });

  /* ---- 전체 화면 ---- */
  function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    } else {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  }

  btnFullscreen.addEventListener("click", toggleFullscreen);

  // iOS Safari: requestFullscreen 미지원 → standalone 모드에서 자동으로 주소창 숨김.
  // 화면 탭 시 전체화면/브라우저 모두 동작하도록 지원 여부 무시하고 시도.
  document.addEventListener("click", function (e) {
    if (controls.contains(e.target)) return;
    toggleFullscreen();
  });

  /* ---- 컨트롤 자동 숨김 ---- */
  let hideTimer = null;
  function showControls() {
    controls.classList.add("visible");
    controls.setAttribute("aria-hidden", "false");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      controls.classList.remove("visible");
      controls.setAttribute("aria-hidden", "true");
    }, 3000);
  }
  controls.addEventListener("click", function (e) {
    e.stopPropagation();
    showControls();
  });
  document.addEventListener("touchstart", showControls, { passive: true });
  document.addEventListener("mousemove", showControls);

  /* ---- Wake Lock (화면 안 꺼짐, 지원 시) ---- */
  let wakeLock = null;
  if ("wakeLock" in navigator) {
    async function acquire() {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (e) {
        /* ignore */
      }
    }
    acquire();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && !wakeLock) acquire();
    });
  }

  /* ---- 시작 ---- */
  applyFormatButton();
  schedule();

  // 서비스 워커 등록 (PWA)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
