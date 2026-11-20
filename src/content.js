(function () {
  if (globalThis.__videoViewportController) {
    return;
  }

  const core = globalThis.VideoViewportCore;
  const youtube = location.hostname === "youtube.com" || location.hostname.endsWith(".youtube.com");
  let activeTarget = null;
  let activeVideo = null;
  let originalControls = null;
  let exitButton = null;
  let playerButton = null;

  function findTarget() {
    const youtubePlayer = youtube ? document.querySelector("#movie_player") : null;
    const youtubeVideo = youtubePlayer?.querySelector("video");
    if (youtubePlayer && youtubeVideo) {
      return { target: youtubePlayer, video: youtubeVideo, mode: "youtube" };
    }
    const video = core.selectVideo(document.querySelectorAll("video"));
    return video ? { target: video, video, mode: "video" } : null;
  }

  function removeExitButton() {
    exitButton?.remove();
    exitButton = null;
  }

  function syncPlayerButton() {
    if (!playerButton) {
      return;
    }

    const selection = activeVideo ? { video: activeVideo } : findTarget();
    const video = selection?.video;
    if (!video) {
      playerButton.hidden = true;
      return;
    }

    const bounds = video.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || bounds.right <= 0 || bounds.left >= window.innerWidth) {
      playerButton.hidden = true;
      return;
    }

    const maxTop = Math.max(8, window.innerHeight - 44);
    const maxRight = Math.max(8, window.innerWidth - 150);
    playerButton.hidden = false;
    playerButton.style.top = `${Math.min(Math.max(8, bounds.top + 12), maxTop)}px`;
    playerButton.style.right = `${Math.min(Math.max(8, window.innerWidth - bounds.right + 12), maxRight)}px`;
    playerButton.textContent = activeTarget ? "Exit video view" : "Expand video";
  }

  function enablePlayerButton() {
    if (!playerButton) {
      playerButton = document.createElement("button");
      playerButton.className = "vv-player-control";
      playerButton.type = "button";
      playerButton.addEventListener("click", toggleMode);
      document.documentElement.append(playerButton);
    }
    syncPlayerButton();
  }

  function exitMode() {
    if (!activeTarget) {
      return { active: false };
    }
    activeTarget.classList.remove("vv-active-youtube", "vv-active-video");
    if (activeVideo && originalControls !== null) {
      activeVideo.controls = originalControls;
    }
    activeTarget = null;
    activeVideo = null;
    originalControls = null;
    removeExitButton();
    syncPlayerButton();
    return { active: false };
  }

  function enterMode() {
    const selection = findTarget();
    if (!selection) {
      return { active: false, error: "No visible video found on this page." };
    }
    activeTarget = selection.target;
    activeVideo = selection.video;
    originalControls = activeVideo.controls;
    activeTarget.classList.add(selection.mode === "youtube" ? "vv-active-youtube" : "vv-active-video");
    if (selection.mode === "video") {
      activeVideo.controls = true;
    }
    if (playerButton) {
      syncPlayerButton();
    } else {
      exitButton = document.createElement("button");
      exitButton.className = "vv-exit-control";
      exitButton.type = "button";
      exitButton.textContent = "Exit video view";
      exitButton.setAttribute("aria-label", "Exit video viewport mode");
      exitButton.addEventListener("click", exitMode);
      document.documentElement.append(exitButton);
    }
    return { active: true };
  }

  function toggleMode() {
    return activeTarget ? exitMode() : enterMode();
  }

  function onMessage(message) {
    if (message?.type === "VIDEO_VIEWPORT_TOGGLE") {
      return toggleMode();
    }
    if (message?.type === "VIDEO_VIEWPORT_STATUS") {
      return { active: Boolean(activeTarget) };
    }
    return undefined;
  }

  browser.runtime.onMessage.addListener(onMessage);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeTarget) {
      exitMode();
    }
  });
  window.addEventListener("pagehide", exitMode, { once: true });
  window.addEventListener("scroll", syncPlayerButton, { passive: true });
  window.addEventListener("resize", syncPlayerButton);
  window.addEventListener("yt-navigate-finish", syncPlayerButton);
  globalThis.__videoViewportController = { toggleMode, enablePlayerButton };
})();