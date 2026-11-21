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
  globalThis.__videoViewportButton = button;
})();