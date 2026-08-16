"use strict";

(function () {
  const $ = (id) => document.getElementById(id);
  const hoursEl = $("hours");
  const minutesEl = $("minutes");
  const secondsEl = $("seconds");
  const ampmEl = $("ampm");
  const dateEl = $("date");
  const dayEl = $("day");

  const controls = $("controls");
  const btnFullscreen = $("btn-fullscreen");
  const btnFormat = $("btn-format");
  const btnColor = $("btn-color");

  const STORAGE_FORMAT = "clock-format-mode";
  const STORAGE_COLOR = "clock-color-index";

  const COLOR_THEMES = [
    { name: "Blue", main: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" },
    { name: "Cyan", main: "#00e5ff", glow: "rgba(0, 229, 255, 0.4)" },
    { name: "Green", main: "#00e676", glow: "rgba(0, 230, 118, 0.4)" },
    { name: "Amber", main: "#ffab00", glow: "rgba(255, 171, 0, 0.4)" },
    { name: "Red", main: "#ff1744", glow: "rgba(255, 23, 68, 0.4)" },
    { name: "White", main: "#ffffff", glow: "rgba(255, 255, 255, 0.4)" },
  ];

  const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

  let is24h = false;
  let colorIndex = 0;

  try {
    const savedFormat = localStorage.getItem(STORAGE_FORMAT);
    if (savedFormat === "24") is24h = true;

    const savedColor = localStorage.getItem(STORAGE_COLOR);
    if (savedColor !== null) {
      const idx = parseInt(savedColor, 10);
      if (!isNaN(idx) && idx >= 0 && idx < COLOR_THEMES.length) {
        colorIndex = idx;
      }
    }
  } catch (e) {}

  /* ---- 색상 적용 ---- */
  function applyColorTheme() {
    const theme = COLOR_THEMES[colorIndex];
    document.documentElement.style.setProperty("--accent-color", theme.main);
    document.documentElement.style.setProperty("--accent-glow", theme.glow);
  }

  /* ---- 시간 및 날짜 표시 ---- */
  function render() {
    const now = new Date();
    const rawHours = now.getHours();

    let displayHours;
    if (is24h) {
      displayHours = String(rawHours).padStart(2, "0");
      ampmEl.textContent = "";
      ampmEl.style.display = "none";
    } else {
      let h12 = rawHours % 12 || 12;
      displayHours = String(h12);
      ampmEl.textContent = rawHours >= 12 ? "PM" : "AM";
      ampmEl.style.display = "inline-block";
    }

    hoursEl.textContent = displayHours;
    minutesEl.textContent = String(now.getMinutes()).padStart(2, "0");
    secondsEl.textContent = String(now.getSeconds()).padStart(2, "0");

    // 날짜: "8월 16, 2026"
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const year = now.getFullYear();
    dateEl.textContent = `${month}월 ${date}, ${year}`;

    // 요일: "일요일"
    dayEl.textContent = DAY_NAMES[now.getDay()];
  }

  /* ---- 초 및 정각 스케줄링 ---- */
  function schedule() {
    render();
    const now = new Date();
    const msToNextSecond = 1000 - now.getMilliseconds();
    setTimeout(function tick() {
      render();
      setTimeout(tick, 1000);
    }, msToNextSecond);
  }

  /* ---- 12h / 24h 토글 ---- */
  function applyFormatButton() {
    btnFormat.textContent = is24h ? "12h" : "24h";
  }

  btnFormat.addEventListener("click", function () {
    is24h = !is24h;
    applyFormatButton();
    render();
    try {
      localStorage.setItem(STORAGE_FORMAT, is24h ? "24" : "12");
    } catch (e) {}
  });

  /* ---- 색상 변경 ---- */
  btnColor.addEventListener("click", function () {
    colorIndex = (colorIndex + 1) % COLOR_THEMES.length;
    applyColorTheme();
    try {
      localStorage.setItem(STORAGE_COLOR, String(colorIndex));
    } catch (e) {}
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

  document.addEventListener("click", function (e) {
    if (controls.contains(e.target)) return;
    toggleFullscreen();
  });

  /* ---- 컨트롤 자동 숨김 (3초) ---- */
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

  /* ---- Wake Lock (화면 안 꺼짐 유지) ---- */
  let wakeLock = null;
  if ("wakeLock" in navigator) {
    async function acquireWakeLock() {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (e) {}
    }
    acquireWakeLock();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && !wakeLock) acquireWakeLock();
    });
  }

  /* ---- 초기화 ---- */
  applyColorTheme();
  applyFormatButton();
  schedule();

  /* ---- 서비스 워커 등록 ---- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
