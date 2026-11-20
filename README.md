# Video Viewport

A Firefox extension that expands a YouTube player or standard HTML5 video to fill the webpage area without entering fullscreen. Firefox's tabs and address bar remain visible, as does the operating system taskbar.

## Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…** and choose this folder's `manifest.json`.
3. Open a page with a video and use the extension toolbar button to expand or restore it.
4. To add an in-player exit control on a site, open the extension popup on that site and turn on **Player button**. Firefox will ask for access to that site. The control appears while viewport mode is active.

The toolbar action only injects code into the current tab after it is clicked. Site access for the in-player control is optional and can be turned off in the popup.

Generic pages use the video's native controls. Custom players that place controls outside their video may need a site-specific adapter. Cross-origin embedded players are not included in this first version.

## Tests

Run `npm test` with Node.js 18 or newer.