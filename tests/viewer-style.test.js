const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const viewerCss = readFileSync(new URL("../src/viewer.css", `file://${__filename}`), "utf8");

test("player-only stylesheet hides YouTube page chrome", () => {
  for (const selector of ["#masthead-container", "#secondary", "#below", "#comments"]) {
    assert.match(viewerCss, new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^}]*\\{\\s*display:\\s*none`));
  }
});

test("player-only stylesheet pins video to the full player viewport", () => {
  assert.match(viewerCss, /#movie_player\s*\{[^}]*position:\s*fixed/);
  assert.match(viewerCss, /#movie_player video\s*\{[^}]*position:\s*absolute/);
  assert.match(viewerCss, /#movie_player video\s*\{[^}]*inset:\s*0/);
  assert.match(viewerCss, /--vv-player-only:\s*enabled/);
});