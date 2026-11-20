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
  toggleModeButton.disabled = false;
  toggleSiteButton.disabled = false;
  const siteStatus = await browser.runtime.sendMessage({
    type: "VIDEO_VIEWPORT_GET_SITE_STATUS",
    pattern: currentPattern
  });
  setSiteSwitch(siteStatus.enabled);

  const tabStatus = await browser.runtime.sendMessage({
    type: "VIDEO_VIEWPORT_GET_TAB_STATUS",
    tabId: activeTab.id
  });
  toggleModeButton.textContent = tabStatus.active ? "Restore page" : "Expand video";
}

toggleModeButton.addEventListener("click", async () => {
  toggleModeButton.disabled = true;
  showStatus("");
  try {
    const result = await browser.runtime.sendMessage({
      type: "VIDEO_VIEWPORT_TOGGLE_TAB",
      tabId: activeTab.id
    });
    toggleModeButton.textContent = result?.active ? "Restore page" : "Expand video";
    if (result?.error) {
      showStatus(result.error);
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