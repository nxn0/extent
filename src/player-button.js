(function () {
  if (new URLSearchParams(location.search).get("vv") === "1") {
    return;
  }
  if (globalThis.__videoViewportButton) {
    return;
  }

  const button = document.createElement("button");
  button.className = "vv-quick-button";
  button.type = "button";
  button.textContent = "Enter player view";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const result = await browser.runtime.sendMessage({ type: "VIDEO_VIEWPORT_OPEN_VIEWER" });
      if (result?.error) {
        button.textContent = result.error;
      } else if (result?.restored) {
        button.textContent = "Enter player view";
      } else {
        button.textContent = "Restore regular YouTube page";
      }
    } finally {
      button.disabled = false;
    }
  });
  document.documentElement.append(button);

  function positionInMastheadGap() {
    const mic = document.querySelector('[aria-label="Search with your voice"]');
    const endControls = document.querySelector("#end");
    if (!mic || !endControls) {
      button.style.left = "50%";
      button.style.transform = "translateX(-50%)";
      return;
    }

    const micRect = mic.getBoundingClientRect();
    const endRect = endControls.getBoundingClientRect();
    const estimatedWidth = button.offsetWidth || 150;
    const gapStart = micRect.right + 8;
    const gapEnd = endRect.left - 8;
    const gapCenter = (gapStart + gapEnd) / 2;

    if (gapEnd > gapStart) {
      button.style.left = `${Math.max(8, gapCenter - estimatedWidth / 2)}px`;
      button.style.transform = "none";
    } else {
      button.style.left = "50%";
      button.style.transform = "translateX(-50%)";
    }
  }

  requestAnimationFrame(positionInMastheadGap);
  window.addEventListener("resize", positionInMastheadGap);
  globalThis.__videoViewportButton = button;
})();