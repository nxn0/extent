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
  button.textContent = "Open video-only tab";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const result = await browser.runtime.sendMessage({ type: "VIDEO_VIEWPORT_OPEN_VIEWER" });
      if (result?.error) {
        button.textContent = result.error;
      }
    } finally {
      button.disabled = false;
    }
  });
  document.documentElement.append(button);
  globalThis.__videoViewportButton = button;
})();