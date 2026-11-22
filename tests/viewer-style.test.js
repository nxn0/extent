const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const viewerCss = readFileSync(new URL("../src/viewer.css", `file://${__filename}`), "utf8");

test("player-only stylesheet hides YouTube page chrome", () => {
  for (const selector of ["#masthead-container", "#secondary", "#below", "#comments"]) {
    assert.match(viewerCss, new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^}]*\\{\\s*display:\\s*none`));
  }
});

test("player-only stylesheet stretches video to the full player viewport", () => {
  assert.match(viewerCss, /#movie_player\s*\{[^}]*position:\s*fixed/);
  assert.match(viewerCss, /#movie_player video\s*\{[^}]*position:\s*absolute/);
  assert.match(viewerCss, /#movie_player video\s*\{[^}]*inset:\s*0/);
  assert.match(viewerCss, /#movie_player video\s*\{[^}]*object-fit:\s*fill/);
  assert.match(viewerCss, /#movie_player video\s*\{[^}]*scaleY\(1\.08\)/);
  assert.match(viewerCss, /--vv-player-only:\s*enabled/);
});

test("popup requests permissions directly from the toggle click handler", () => {
  const popupJs = readFileSync(new URL("../popup.js", `file://${__filename}`), "utf8");
  const modeHandler = popupJs.match(/toggleModeButton\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/)?.[1] ?? "";
  assert.match(modeHandler, /const granted = await browser\.permissions\.request/);
  assert.doesNotMatch(modeHandler, /await browser\.permissions\.contains/);
});

test("quick viewer button uses the top masthead gap", () => {
  const quickCss = readFileSync(new URL("../src/player-button.css", `file://${__filename}`), "utf8");
  const quickJs = readFileSync(new URL("../src/player-button.js", `file://${__filename}`), "utf8");
  assert.match(quickCss, /\.vv-quick-button\s*\{[^}]*top:\s*8px/);
  assert.match(quickCss, /\.vv-quick-button\s*\{[^}]*height:\s*40px/);
  assert.match(quickJs, /positionInMastheadGap/);
  assert.match(quickJs, /Search with your voice/);
  assert.match(quickJs, /querySelector\("#end"\)/);
  assert.match(quickJs, /querySelectorAll\("\.vv-quick-button"\)/);
});