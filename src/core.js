(function (root, factory) {
  const core = factory();
  root.VideoViewportCore = core;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
})(globalThis, function () {
  function selectVideo(videos) {
    return Array.from(videos)
      .map((video) => {
        const bounds = video.getBoundingClientRect();
        const area = Math.max(0, bounds.width) * Math.max(0, bounds.height);
        return { video, area, isPlaying: !video.paused && !video.ended };
      })
      .filter((candidate) => candidate.area > 0)
      .sort((left, right) => {
        if (left.isPlaying !== right.isPlaying) {
          return Number(right.isPlaying) - Number(left.isPlaying);
        }
        return right.area - left.area;
      })[0]?.video ?? null;
  }

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

  return { selectVideo, sitePattern, parseYouTubeVideoId };
});