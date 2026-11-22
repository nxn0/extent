const test = require("node:test");
const assert = require("node:assert/strict");
const { sitePattern, parseYouTubeVideoId } = require("../src/core.js");

test("creates narrow optional host patterns for web pages", () => {
  assert.equal(sitePattern("https://video.example:8443/watch?v=1"), "https://video.example/*");
  assert.equal(sitePattern("file:///tmp/video.html"), null);
  assert.equal(sitePattern("not a url"), null);
});

test("extracts YouTube IDs from watch, shorts, live, embed, and short URLs", () => {
  assert.equal(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30"), "dQw4w9WgXcQ");
  assert.equal(parseYouTubeVideoId("https://youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(parseYouTubeVideoId("https://youtube.com/live/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(parseYouTubeVideoId("https://youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("rejects non-video URLs and malformed YouTube IDs", () => {
  assert.equal(parseYouTubeVideoId("https://youtube.com/results?search_query=music"), null);
  assert.equal(parseYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYouTubeVideoId("https://youtube.com/watch?v=short"), null);
});