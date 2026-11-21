const VIEWER_STYLE = "src/viewer.css";
const YOUTUBE_PATTERN = "https://www.youtube.com/*";

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
    const sourceTab = await browser.tabs.get(tabId);
    const originPattern = new URL(sourceTab.url).origin + "/*";
    if (!await browser.permissions.contains({ origins: [originPattern] })) {
      return { error: "Allow access to this site before opening its video in a separate tab." };
    }
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
      return { error: "Open a YouTube video page to use the video-only player." };
    }

    const viewerUrl = new URL("https://www.youtube.com/watch");
    viewerUrl.searchParams.set("v", videoId);
    viewerUrl.searchParams.set("autoplay", "1");
    viewerUrl.searchParams.set("t", String(Math.floor(playback.time || 0)));
    const viewerTab = await browser.tabs.create({ url: viewerUrl.href, active: false });

    try {
      await waitForTabComplete(viewerTab.id);
      await browser.scripting.insertCSS({ target: { tabId: viewerTab.id }, files: [VIEWER_STYLE] });
      const [{ result: isStyled }] = await browser.scripting.executeScript({
        target: { tabId: viewerTab.id },
        func: () => getComputedStyle(document.documentElement).getPropertyValue("--vv-player-only").trim() === "enabled"
      });
      if (!isStyled) {
        throw new Error("YouTube loaded, but the player-only layout did not apply.");
      }

      await browser.scripting.executeScript({
        target: { tabId },
        func: () => document.querySelector("#movie_player video")?.pause()
      });
      await browser.tabs.update(viewerTab.id, { active: true });
      return { opened: true };
    } catch (error) {
      await browser.tabs.remove(viewerTab.id).catch(() => undefined);
      return { error: error.message || "Could not apply the player-only layout." };
    }
  } catch (error) {
    return { error: error.message || "Could not open the video in a separate tab." };
  }
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timeout);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const timeout = setTimeout(() => finish(new Error("Timed out waiting for YouTube to load.")), 20000);
    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        finish();
      }
    };
    const onRemoved = (removedTabId) => {
      if (removedTabId === tabId) {
        finish(new Error("The player tab was closed before it finished loading."));
      }
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);
    browser.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        finish();
      }
    }).catch(finish);
  });
}

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message?.type === "VIDEO_VIEWPORT_OPEN_VIEWER") {
    return openViewer(message.tabId || sender.tab?.id);
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