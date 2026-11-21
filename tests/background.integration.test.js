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
  const sourceTab = { id: 11, windowId: 3, url: sourceUrl, status: "complete", active: true };

  const browser = {
    permissions: {
      contains: async () => true
    },
    tabs: {
      onUpdated,
      onRemoved,
      get: async (tabId) => tabId === sourceTab.id ? sourceTab : null,
      update: async (tabId, options) => {
        calls.push(["navigate", tabId, options]);
        if (options.url) {
          sourceTab.url = options.url;
          sourceTab.status = "loading";
          queueMicrotask(() => {
            sourceTab.status = "complete";
            onUpdated.emit(tabId, { status: "complete" }, sourceTab);
          }, 5);
        }
        return sourceTab;
      },
      remove: async (tabId) => calls.push(["remove", tabId])
    },
    scripting: {
      executeScript: async ({ target, func }) => {
        calls.push(["execute", target.tabId, func.toString()]);
        if (target.tabId === sourceTab.id && /currentTime/.test(func.toString())) {
          return [{ result: { url: sourceUrl, time: playbackTime } }];
        }
        if (target.tabId === 11 && /getComputedStyle/.test(func.toString())) {
          return [{ result: styleWorks }];
        }
        return [{ result: undefined }];
      },
      insertCSS: async (options) => calls.push(["insertCSS", options]),
      removeCSS: async (options) => calls.push(["removeCSS", options])
    },
    runtime: {
      onMessage,
      getURL: (path) => `moz-extension://test/${path}`
    }
  };

  const core = { parseYouTubeVideoId };
  const sandbox = { browser, VideoViewportCore: core, URL, Map, Set, Promise, setTimeout, clearTimeout, setInterval, clearInterval, console };
  vm.runInNewContext(readFileSync("src/background.js", "utf8"), sandbox, { filename: "src/background.js" });

  return {
    calls,
    sourceTab,
    async openViewer() {
      const listener = [...onMessage.listeners][0];
      return listener({ type: "VIDEO_VIEWPORT_OPEN_VIEWER", tabId: sourceTab.id }, {});
    }
  };
}

test("applies player-only CSS to the active YouTube tab without navigating", async () => {
  const harness = makeBrowserHarness({
    sourceUrl: "https://www.youtube.com/watch?v=sX2c8cYPZ6o&feature=share",
    playbackTime: 123.8
  });

  const result = await harness.openViewer();
  const styleCall = harness.calls.find(([name]) => name === "insertCSS");

  assert.equal(result.opened, true);
  assert.equal(harness.sourceTab.url, "https://www.youtube.com/watch?v=sX2c8cYPZ6o&feature=share");
  assert.equal(styleCall[1].target.tabId, 11);
  assert.deepEqual(Array.from(styleCall[1].files), ["src/viewer.css"]);
  assert.ok(!harness.calls.some(([name]) => name === "navigate"));
  assert.ok(!harness.calls.some(([name]) => name === "create"));
});

test("removes player CSS when verification fails", async () => {
  const harness = makeBrowserHarness({
    sourceUrl: "https://www.youtube.com/watch?v=sX2c8cYPZ6o",
    styleWorks: false
  });

  const result = await harness.openViewer();

  assert.match(result.error, /player-only layout did not apply/);
  assert.equal(harness.sourceTab.url, "https://www.youtube.com/watch?v=sX2c8cYPZ6o");
  assert.ok(harness.calls.some(([name]) => name === "removeCSS"));
  assert.ok(!harness.calls.some(([name]) => name === "navigate"));
});

test("refuses non-YouTube pages without injecting CSS", async () => {
  const harness = makeBrowserHarness({ sourceUrl: "https://example.com/watch?v=notyoutube" });

  const result = await harness.openViewer();

  assert.match(result.error, /Open a YouTube video page/);
  assert.ok(!harness.calls.some(([name]) => name === "navigate"));
});