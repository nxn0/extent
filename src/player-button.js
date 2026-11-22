(function () {
  document.querySelectorAll(".vv-quick-button").forEach((existingButton) => existingButton.remove());
  if (globalThis.__videoViewportButton) {
    globalThis.__videoViewportButton.remove();
    delete globalThis.__videoViewportButton;
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
    const create = [...document.querySelectorAll("button, a")].find((element) =>
      (element.getAttribute("aria-label") || element.textContent || "").trim().toLowerCase().includes("create")
    );
    const endControls = document.querySelector("#end");

    if (!mic) {
      button.style.left = "50%";
      button.style.transform = "translateX(-50%)";
      return;
    }

    const micRect = mic.getBoundingClientRect();
    const anchorRect = create?.getBoundingClientRect() || endControls?.getBoundingClientRect();
    if (!anchorRect) {
      button.style.left = "50%";
      button.style.transform = "translateX(-50%)";
      return;
    }

    const buttonWidth = button.offsetWidth || 150;
    const gapStart = micRect.right + 8;
    const gapEnd = anchorRect.left - 8;

    if (gapEnd - gapStart >= buttonWidth) {
      const left = gapStart + (gapEnd - gapStart - buttonWidth) / 2;
      button.style.left = `${Math.round(left)}px`;
      button.style.transform = "none";
      return;
    }

    const fallbackLeft = Math.max(8, micRect.right - buttonWidth - 8);
    button.style.left = `${Math.round(fallbackLeft)}px`;
    button.style.transform = "none";
  }

  requestAnimationFrame(positionInMastheadGap);
  window.addEventListener("resize", positionInMastheadGap);
  globalThis.__videoViewportButton = button;
})();