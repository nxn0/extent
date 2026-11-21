const siteName = document.querySelector("#site-name");
const toggleModeButton = document.querySelector("#toggle-mode");
const toggleSiteButton = document.querySelector("#toggle-site");
const switchLabel = document.querySelector("#switch-label");
const status = document.querySelector("#status");

let activeTab = null;
let currentPattern = null;
let siteEnabled = false;

function showStatus(message = "") {
  status.textContent = message;
}

function setSiteSwitch(enabled) {
  siteEnabled = enabled;
  toggleSiteButton.setAttribute("aria-pressed", String(enabled));
  switchLabel.textContent = enabled ? "On" : "Off";
}

async function loadTab() {
  [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentPattern = activeTab ? VideoViewportCore.sitePattern(activeTab.url) : null;
  if (!currentPattern) {
    siteName.textContent = "Unavailable on this page";
    showStatus("Open a video on a regular website to use this extension.");
    return;
  }

  siteName.textContent = new URL(activeTab.url).hostname;
  const isYouTubeVideo = Boolean(VideoViewportCore.parseYouTubeVideoId(activeTab.url));
  toggleModeButton.disabled = !isYouTubeVideo;
  toggleSiteButton.disabled = !isYouTubeVideo;
  if (!isYouTubeVideo) {
    showStatus("Open a YouTube video page to use the player-only view.");
    return;
  }

  const viewerStatus = await browser.runtime.sendMessage({
    type: "VIDEO_VIEWPORT_GET_VIEWER_STATUS",
    tabId: activeTab.id
  });
  toggleModeButton.textContent = viewerStatus?.enabled ? "Restore regular YouTube page" : "Enter player view";

  const siteStatus = await browser.runtime.sendMessage({
    type: "VIDEO_VIEWPORT_GET_SITE_STATUS",
    pattern: currentPattern
  });
  setSiteSwitch(siteStatus.enabled);
}

toggleModeButton.addEventListener("click", async () => {
  toggleModeButton.disabled = true;
  showStatus("");
  try {
    const requestedOrigins = [...new Set([currentPattern, "https://www.youtube.com/*"])];
    const granted = await browser.permissions.request({ origins: requestedOrigins });
    if (!granted) {
      showStatus("Site access is needed to toggle the player view.");
      return;
    }
    const result = await browser.runtime.sendMessage({
      type: "VIDEO_VIEWPORT_OPEN_VIEWER",
      tabId: activeTab.id
    });
    if (result?.error) {
      showStatus(result.error);
    } else {
      toggleModeButton.textContent = result?.restored ? "Enter player view" : "Restore regular YouTube page";
    }
  } catch (error) {
    showStatus(error.message || "Could not toggle video view.");
  } finally {
    toggleModeButton.disabled = false;
  }
});

toggleSiteButton.addEventListener("click", async () => {
  toggleSiteButton.disabled = true;
  showStatus("");
  if (!siteEnabled) {
    const granted = await browser.permissions.request({ origins: [currentPattern] });
    if (!granted) {
      showStatus("Site access was not granted.");
      toggleSiteButton.disabled = false;
      return;
    }
  }

  const enabled = !siteEnabled;
  const result = await browser.runtime.sendMessage({
    type: "VIDEO_VIEWPORT_SET_SITE",
    pattern: currentPattern,
    enabled,
    tabId: activeTab.id
  });
  if (!enabled) {
    await browser.permissions.remove({ origins: [currentPattern] });
  }
  setSiteSwitch(Boolean(result?.enabled));
  if (result?.error) {
    showStatus(result.error);
  }
  toggleSiteButton.disabled = false;
});

loadTab().catch((error) => {
  showStatus(error.message || "Could not read the active tab.");
});