(function (root, factory) {
  const core = factory();
  root.VideoViewportCore = core;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
})(globalThis, function () {
  function sitePattern(rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }
      return `${url.protocol}//${url.hostname}/*`;
    } catch {
      return null;
    }
  }

  function parseYouTubeVideoId(rawUrl) {
    try {
      const url = new URL(rawUrl);
      let videoId = null;

      if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
        videoId = url.pathname.split("/").filter(Boolean)[0];
      } else if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
        if (url.pathname === "/watch") {
          videoId = url.searchParams.get("v");
        } else {
          videoId = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
        }
      }

      return videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null;
    } catch {
      return null;
    }
  }

  return { sitePattern, parseYouTubeVideoId };
});