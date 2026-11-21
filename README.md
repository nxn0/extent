# Video Viewport

A Firefox extension that opens the current YouTube video in a new tab and hides the watch-page layout there, leaving the player stretched to the browser content area. YouTube requires a normal HTTPS watch-page context for playback; its standalone embed URL can fail with Error 153 when there is no valid HTTP referrer. The original tab is not restyled, and its video pauses to avoid overlapping audio.

## Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…** and choose this folder's `manifest.json`.
3. Open a YouTube video and choose **Open video-only tab**. Firefox asks for access to YouTube the first time.
4. To add a quick button to the original page, turn on **Quick viewer button** in the popup for that site.

The new tab loads YouTube's normal watch page to preserve its required referrer context, then the extension hides the surrounding interface only in that tab. The source tab's layout is untouched. Some videos or account states may block autoplay; use the player's controls if needed. This extension does not extract or proxy YouTube's underlying media stream.

The player-only tab supports YouTube watch, Shorts, live, embed, and `youtu.be` video URLs. Other sites are not supported by this viewer.

## Tests

Run `npm test` with Node.js 18 or newer.