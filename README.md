# Video Viewport

A Firefox extension that toggles the active YouTube tab between the normal watch page and a clean player-only view, leaving the player stretched to the browser content area. YouTube requires a normal HTTPS watch-page context for playback; its standalone embed URL can fail with Error 153 when there is no valid HTTP referrer.

## Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…** and choose this folder's `manifest.json`.
3. Open a YouTube video and choose **Enter player view**. Press **Restore regular YouTube page** to leave the view. Firefox asks for access to YouTube the first time.
4. To add a quick button to the original page, turn on **Quick viewer button** in the popup for that site.

The active tab keeps the same YouTube page and player running while the extension toggles a stylesheet that hides the surrounding interface and stretches the video to fill the browser content area. This can distort a 16:9 video if the browser window has another aspect ratio. The source tab's layout is untouched. Some videos or account states may block autoplay; use the player's controls if needed. This extension does not extract or proxy YouTube's underlying media stream.

The player-only tab supports YouTube watch, Shorts, live, embed, and `youtu.be` video URLs. Other sites are not supported by this viewer.

## Tests

Run `npm test` with Node.js 18 or newer.