const buildSharedCacheValue = (maxAgeSeconds, staleWhileRevalidateSeconds) =>
  `public, s-maxage=${Math.max(0, Number(maxAgeSeconds || 0))}, stale-while-revalidate=${Math.max(
    0,
    Number(staleWhileRevalidateSeconds || 0),
  )}`;

const setSharedCacheHeaders = (
  res,
  {
    browserMaxAgeSeconds = 0,
    maxAgeSeconds = 120,
    staleWhileRevalidateSeconds = 600,
  } = {},
) => {
  const browserHeader = `public, max-age=${Math.max(0, Number(browserMaxAgeSeconds || 0))}, must-revalidate`;
  const sharedHeader = buildSharedCacheValue(maxAgeSeconds, staleWhileRevalidateSeconds);

  res.set("Cache-Control", browserHeader);
  res.set("CDN-Cache-Control", sharedHeader);
  res.set("Vercel-CDN-Cache-Control", sharedHeader);
};

const setPrivateNoStoreHeaders = (res) => {
  res.set("Cache-Control", "private, no-store, max-age=0");
  res.set("CDN-Cache-Control", "private, no-store");
  res.set("Vercel-CDN-Cache-Control", "private, no-store");
};

module.exports = {
  setSharedCacheHeaders,
  setPrivateNoStoreHeaders,
};
