const VIEWER_STYLE = "src/viewer.css";
const YOUTUBE_PATTERN = "https://www.youtube.com/*";
const viewerStates = new Map();

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
    js: ["src/player-button.js"],
    css: ["src/player-button.css"],
    runAt: "document_idle",
    persistAcrossSessions: true
  }]);
  return { enabled: true };
}

async function openViewer(tabId) {
  try {
    if (viewerStates.has(tabId)) {
      await browser.scripting.removeCSS({ target: { tabId }, files: [VIEWER_STYLE] });
      viewerStates.delete(tabId);
      return { opened: false, restored: true };
    }

    const sourceTab = await browser.tabs.get(tabId);
    if (!await browser.permissions.contains({ origins: [YOUTUBE_PATTERN] })) {
      return { error: "Allow YouTube access so the player-only layout can be applied." };
    }

    const [{ result: playback }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const video = document.querySelector("#movie_player video");
        return { url: location.href, time: video?.currentTime || 0 };
      }
    });

    const videoId = globalThis.VideoViewportCore.parseYouTubeVideoId(playback.url);
    if (!videoId) {
      return { error: "Open a YouTube video page to use the player-only view." };
    }

    await browser.scripting.insertCSS({ target: { tabId }, files: [VIEWER_STYLE] });
    const [{ result: isStyled }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => getComputedStyle(document.documentElement).getPropertyValue("--vv-player-only").trim() === "enabled"
    });
    if (!isStyled) {
      throw new Error("YouTube loaded, but the player-only layout did not apply.");
    }

    viewerStates.set(tabId, { videoId, currentTime: playback.time });
    return { opened: true };
  } catch (error) {
    await browser.scripting.removeCSS({ target: { tabId }, files: [VIEWER_STYLE] }).catch(() => undefined);
    viewerStates.delete(tabId);
    return { error: error.message || "Could not toggle the same-tab player view." };
  }
}

browser.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = message.tabId || sender.tab?.id;

  if (message?.type === "VIDEO_VIEWPORT_OPEN_VIEWER") {
    return openViewer(tabId);
  }

  if (message?.type === "VIDEO_VIEWPORT_GET_VIEWER_STATUS") {
    return { enabled: Number.isInteger(tabId) && viewerStates.has(tabId) };
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
        await browser.scripting.insertCSS({ target: { tabId: message.tabId }, files: ["src/player-button.css"] });
        await browser.scripting.executeScript({ target: { tabId: message.tabId }, files: ["src/player-button.js"] });
      } else if (Number.isInteger(message.tabId)) {
        await browser.scripting.executeScript({
          target: { tabId: message.tabId },
          func: () => document.querySelector(".vv-quick-button")?.remove()
        });
      }
      return result;
    } catch (error) {
      return { enabled: false, error: error.message || "Could not update site access." };
    }
  }

  return undefined;
});