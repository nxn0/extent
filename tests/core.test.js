const test = require("node:test");
const assert = require("node:assert/strict");
const { selectVideo, sitePattern } = require("../src/core.js");

function video({ width, height, paused = true, ended = false }) {
  return {
    paused,
    ended,
    getBoundingClientRect: () => ({ width, height })
  };
}

test("selects a playing video before a larger paused video", () => {
  const pausedVideo = video({ width: 1280, height: 720 });
  const playingVideo = video({ width: 320, height: 180, paused: false });
  assert.equal(selectVideo([pausedVideo, playingVideo]), playingVideo);
});

test("selects the largest visible video when none are playing", () => {
  const smallVideo = video({ width: 320, height: 180 });
  const largeVideo = video({ width: 640, height: 360 });
  assert.equal(selectVideo([smallVideo, largeVideo]), largeVideo);
});

test("ignores videos without visible dimensions", () => {
  assert.equal(selectVideo([video({ width: 0, height: 0 })]), null);
});

test("creates narrow optional host patterns for web pages", () => {
  assert.equal(sitePattern("https://video.example:8443/watch?v=1"), "https://video.example/*");
  assert.equal(sitePattern("file:///tmp/video.html"), null);
  assert.equal(sitePattern("not a url"), null);
});