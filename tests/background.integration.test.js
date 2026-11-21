const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const { parseYouTubeVideoId } = require("../src/core.js");

class EventHook {
  listeners = new Set();

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  emit(...args) {
    for (const listener of this.listeners) {
      listener(...args);
    }
  }
}

function makeBrowserHarness({ sourceUrl, playbackTime = 87, styleWorks = true }) {
  const calls = [];
  const onMessage = new EventHook();
  const onUpdated = new EventHook();
  const onRemoved = new EventHook();
  const sourceTab = { id: 11, windowId: 3, url: sourceUrl, status: "complete" };
  let newTab = null;

  const browser = {
    permissions: {
      contains: async () => true
    },
    tabs: {
      onUpdated,
      onRemoved,
      get: async (tabId) => tabId === sourceTab.id ? sourceTab : newTab,
      create: async (options) => {
        calls.push(["create", options]);
        newTab = { id: 22, windowId: options.windowId ?? 3, status: "loading", ...options };
        queueMicrotask(() => {
          newTab.status = "complete";
          onUpdated.emit(newTab.id, { status: "complete" }, newTab);
        });
        return newTab;
      },
      update: async (tabId, options) => {
        calls.push(["activate", tabId, options]);
        newTab.active = options.active;
        return newTab;
      },
      remove: async (tabId) => calls.push(["remove", tabId])
    },
    scripting: {
      executeScript: async ({ target, func }) => {
        calls.push(["execute", target.tabId, func.toString()]);
        if (target.tabId === sourceTab.id && /currentTime/.test(func.toString())) {
          return [{ result: { url: sourceUrl, time: playbackTime } }];
        }
        if (target.tabId === 22 && /getComputedStyle/.test(func.toString())) {
          return [{ result: styleWorks }];
        }
        return [{ result: undefined }];
      },
      insertCSS: async (options) => calls.push(["insertCSS", options])
    },
    runtime: {
      onMessage,
      getURL: (path) => `moz-extension://test/${path}`
    }
  };

  const core = { parseYouTubeVideoId };
  const sandbox = { browser, VideoViewportCore: core, URL, Map, Set, Promise, setTimeout, clearTimeout, console };
  vm.runInNewContext(readFileSync("src/background.js", "utf8"), sandbox, { filename: "src/background.js" });

  return {
    calls,
    async openViewer() {
      const listener = [...onMessage.listeners][0];
      return listener({ type: "VIDEO_VIEWPORT_OPEN_VIEWER", tabId: sourceTab.id }, {});
    }
  };
}

test("opens a player-only YouTube watch context, not a standalone embed URL", async () => {
  const harness = makeBrowserHarness({
    sourceUrl: "https://www.youtube.com/watch?v=sX2c8cYPZ6o&feature=share",
    playbackTime: 123.8
  });

  const result = await harness.openViewer();
  const createdTab = harness.calls.find(([name]) => name === "create")[1];
  const styleCall = harness.calls.find(([name]) => name === "insertCSS")[1];
  const activationIndex = harness.calls.findIndex(([name]) => name === "activate");
  const styleIndex = harness.calls.findIndex(([name]) => name === "insertCSS");
  const pauseIndex = harness.calls.findIndex(([name, tabId, source]) => name === "execute" && tabId === 11 && source.includes("pause"));
  const url = new URL(createdTab.url);

  assert.equal(result.opened, true);
  assert.equal(url.origin, "https://www.youtube.com");
  assert.equal(url.pathname, "/watch");
  assert.equal(url.searchParams.get("v"), "sX2c8cYPZ6o");
  assert.equal(url.searchParams.get("t"), "123");
  assert.equal(createdTab.active, false);
  assert.equal(styleCall.target.tabId, 22);
  assert.deepEqual(Array.from(styleCall.files), ["src/viewer.css"]);
  assert.ok(styleIndex >= 0 && activationIndex > styleIndex);
  assert.ok(pauseIndex > styleIndex && activationIndex > pauseIndex);
});

test("does not leave an unstyled YouTube tab open when player CSS verification fails", async () => {
  const harness = makeBrowserHarness({
    sourceUrl: "https://www.youtube.com/watch?v=sX2c8cYPZ6o",
    styleWorks: false
  });

  const result = await harness.openViewer();

  assert.match(result.error, /player-only layout did not apply/);
  assert.ok(harness.calls.some(([name, tabId]) => name === "remove" && tabId === 22));
  assert.ok(!harness.calls.some(([name]) => name === "activate"));
});

test("refuses non-YouTube pages without creating a tab", async () => {
  const harness = makeBrowserHarness({ sourceUrl: "https://example.com/watch?v=notyoutube" });

  const result = await harness.openViewer();

  assert.match(result.error, /Open a YouTube video page/);
  assert.ok(!harness.calls.some(([name]) => name === "create"));
});