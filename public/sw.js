// Đổi bất cứ gì trong file này thì PHẢI tăng VERSION, nếu không cache cũ không bị dọn.
const VERSION = "v3";
const SHELL_CACHE = `halivivu-shell-${VERSION}`;
const STATIC_CACHE = `halivivu-static-${VERSION}`;
const PAGES_CACHE = `halivivu-pages-${VERSION}`;
const IMAGES_CACHE = `halivivu-images-${VERSION}`;
const CURRENT = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE];

const OFFLINE_URL = "/offline";

const SHELL_ASSETS = [OFFLINE_URL, "/icons/icon-192.png"];

// Khu vực cá nhân/động: KHÔNG bao giờ lưu cache (tránh rò nội dung của tài
// khoản này sang tài khoản khác trên máy dùng chung, và tránh dữ liệu cũ).
const NEVER_CACHE = [
  "/api/",
  "/cms",
  "/sale",
  "/login",
  "/tai-khoan",
  "/thong-bao",
  "/kiem-tra",
  "/lich-trinh/cua-toi",
];

const LIMITS = { [PAGES_CACHE]: 50, [IMAGES_CACHE]: 80 };

const isPrivate = (pathname) => NEVER_CACHE.some((p) => pathname.startsWith(p));

const isImmutable = (pathname) =>
  pathname.startsWith("/_next/static/") || pathname.startsWith("/fonts/");

const isImage = (url, request) =>
  request.destination === "image" ||
  url.pathname.startsWith("/_next/image") ||
  url.pathname.startsWith("/icons/");

const isCacheable = (res) =>
  res && res.ok && res.type === "basic" && res.status !== 206 && !res.redirected;

async function trim(cacheName) {
  const limit = LIMITS[cacheName];
  if (!limit) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("halivivu-") && !CURRENT.includes(n))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function handleNavigation(event) {
  const { request } = event;
  const url = new URL(request.url);
  const storable = !isPrivate(url.pathname) && !url.search;

  try {
    const preload = await event.preloadResponse;
    const res = preload || (await fetch(request));
    if (storable && isCacheable(res)) {
      const copy = res.clone();
      event.waitUntil(
        caches
          .open(PAGES_CACHE)
          .then((c) => c.put(request, copy))
          .then(() => trim(PAGES_CACHE)),
      );
    }
    return res;
  } catch {
    const cached = await caches.match(request, { cacheName: PAGES_CACHE });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE });
    if (offline) return offline;
    return new Response("Bạn đang ngoại tuyến.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const res = await fetch(request);
  if (isCacheable(res)) {
    const copy = res.clone();
    const cache = await caches.open(cacheName);
    await cache.put(request, copy);
  }
  return res;
}

async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cached = await caches.match(request, { cacheName });
  const network = fetch(request)
    .then(async (res) => {
      if (isCacheable(res)) {
        const cache = await caches.open(cacheName);
        await cache.put(request, res.clone());
        await trim(cacheName);
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const res = await network;
  if (res) return res;
  return new Response("", { status: 504, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isPrivate(url.pathname)) return;

  if (isImmutable(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isImage(url, request)) {
    event.respondWith(staleWhileRevalidate(event, IMAGES_CACHE));
  }
});
