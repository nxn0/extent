const CONTENT_FILES = ["src/core.js", "src/content.js"];
const STYLE_FILE = "src/video-mode.css";

function registeredScriptId(pattern) {
  return `video-viewport-${pattern.replace(/[^a-z0-9]/gi, "-")}`;
}

function isValidPattern(pattern) {
  return typeof pattern === "string" && /^https?:\/\/[^/*]+\/\*$/.test(pattern);
}

async function setSiteEnabled(pattern, enabled) {
  if (!isValidPattern(pattern)) {
    throw new Error("Unsupported website address.");
  }

  const id = registeredScriptId(pattern);
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [id] });
  if (existing.length) {
    await browser.scripting.unregisterContentScripts({ ids: [id] });
  }

  if (!enabled) {
    return { enabled: false };
  }

  const hasPermission = await browser.permissions.contains({ origins: [pattern] });
  if (!hasPermission) {
    throw new Error("Site access has not been granted.");
  }

  await browser.scripting.registerContentScripts([{
    id,
    matches: [pattern],
    js: [...CONTENT_FILES, "src/player-button.js"],
    css: [STYLE_FILE],
    runAt: "document_idle",
    persistAcrossSessions: true
  }]);
  return { enabled: true };
}

async function toggleTab(tabId) {
  try {
    await browser.scripting.insertCSS({ target: { tabId }, files: [STYLE_FILE] });
    await browser.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
    return await browser.tabs.sendMessage(tabId, { type: "VIDEO_VIEWPORT_TOGGLE" });
  } catch (error) {
    return { active: false, error: error.message || "This page does not allow extension access." };
  }
}

async function getTabStatus(tabId) {
  try {
    await browser.scripting.insertCSS({ target: { tabId }, files: [STYLE_FILE] });
    await browser.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
    return await browser.tabs.sendMessage(tabId, { type: "VIDEO_VIEWPORT_STATUS" });
  } catch (error) {
    return { active: false, error: error.message || "This page does not allow extension access." };
  }
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message?.type === "VIDEO_VIEWPORT_TOGGLE_TAB") {
    return toggleTab(message.tabId);
  }

  if (message?.type === "VIDEO_VIEWPORT_GET_TAB_STATUS") {
    return getTabStatus(message.tabId);
  }

  if (message?.type === "VIDEO_VIEWPORT_GET_SITE_STATUS") {
    const pattern = message.pattern;
    if (!isValidPattern(pattern)) {
      return { enabled: false, permitted: false };
    }
    const [permitted, scripts] = await Promise.all([
      browser.permissions.contains({ origins: [pattern] }),
      browser.scripting.getRegisteredContentScripts({ ids: [registeredScriptId(pattern)] })
    ]);
    return { enabled: scripts.length > 0, permitted };
  }

  if (message?.type === "VIDEO_VIEWPORT_SET_SITE") {
    try {
      const result = await setSiteEnabled(message.pattern, Boolean(message.enabled));
      if (message.enabled && Number.isInteger(message.tabId)) {
        await browser.scripting.insertCSS({ target: { tabId: message.tabId }, files: [STYLE_FILE] });
        await browser.scripting.executeScript({
          target: { tabId: message.tabId },
          files: [...CONTENT_FILES, "src/player-button.js"]
        });
      }
      return result;
    } catch (error) {
      return { enabled: false, error: error.message || "Could not update site access." };
    }
  }

  return undefined;
});