/* Service worker của Halivivu (viết tay, không build tool).
 *
 * Mục tiêu: cài được lên màn hình chính, mở lại nhanh, và không "chết trắng"
 * khi mất sóng giữa đường — đúng bối cảnh dùng: khách đang đi chơi, mạng chập chờn.
 *
 * Chiến lược theo loại request:
 *   - Điều hướng trang (document)  → network-first, hết mạng thì lấy bản đã xem,
 *                                    không có nữa thì trang /offline.
 *   - /_next/static, /fonts        → cache-first (tên file có hash, bất biến).
 *   - Ảnh (/_next/image, /icons…)  → stale-while-revalidate, có giới hạn số mục.
 *   - Còn lại (API, POST, ngoài miền) → network-only, service worker không đụng vào.
 *
 * ĐỔI `VERSION` mỗi khi sửa file này → cache cũ bị dọn ở bước activate.
 */

const VERSION = "v2";
const SHELL_CACHE = `halivivu-shell-${VERSION}`;
const STATIC_CACHE = `halivivu-static-${VERSION}`;
const PAGES_CACHE = `halivivu-pages-${VERSION}`;
const IMAGES_CACHE = `halivivu-images-${VERSION}`;
const CURRENT = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE];

const OFFLINE_URL = "/offline";

// Tài nguyên tối thiểu để trang /offline hiển thị được khi không có mạng.
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
  "/lich-trinh",
];

// …trừ vài nhánh CON của một tiền tố riêng tư vốn lại là nội dung công khai.
// NEVER_CACHE khớp theo tiền tố, nên không có danh sách này thì "/lich-trinh"
// sẽ chặn luôn lịch trình mẫu (nội dung biên tập, có index, rất đáng cache) và
// bản chia sẻ (đích của link gửi cho người khác).
const CACHE_ANYWAY = ["/lich-trinh/mau/", "/lich-trinh/s/"];

// Số mục tối đa giữ lại cho mỗi cache "mọc dần".
const LIMITS = { [PAGES_CACHE]: 50, [IMAGES_CACHE]: 80 };

// ── Tiện ích ────────────────────────────────────────────────────────────────

const isPrivate = (pathname) =>
  !CACHE_ANYWAY.some((p) => pathname.startsWith(p)) &&
  NEVER_CACHE.some((p) => pathname.startsWith(p));

const isImmutable = (pathname) =>
  pathname.startsWith("/_next/static/") || pathname.startsWith("/fonts/");

const isImage = (url, request) =>
  request.destination === "image" ||
  url.pathname.startsWith("/_next/image") ||
  url.pathname.startsWith("/icons/");

// Chỉ cache phản hồi thành công, cùng miền. Bỏ qua:
//   - opaque/opaqueredirect (type !== 'basic') — không đọc được nội dung;
//   - 206 Partial Content — Cache.put() ném lỗi với status này;
//   - phản hồi sau chuyển hướng — trả lại nó cho một điều hướng sẽ bị chặn.
const isCacheable = (res) =>
  res && res.ok && res.type === "basic" && res.status !== 206 && !res.redirected;

// Cắt bớt cache theo kiểu FIFO khi vượt hạn mức.
async function trim(cacheName) {
  const limit = LIMITS[cacheName];
  if (!limit) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

// ── Vòng đời ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // `reload` để không lấy nhầm bản cũ trong HTTP cache của trình duyệt.
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
      // Cho phép trình duyệt bắt đầu tải trang song song với lúc SW khởi động.
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

// Trang gọi khi muốn bản SW mới lên ngay (không đợi đóng hết tab).
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Chiến lược ──────────────────────────────────────────────────────────────

// Điều hướng trang: ưu tiên mạng để nội dung luôn mới; mất mạng mới dùng bản cũ.
async function handleNavigation(event) {
  const { request } = event;
  const url = new URL(request.url);
  // Trang cá nhân hoặc URL có query (tìm kiếm, bộ lọc…) thì không lưu lại.
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

// File có hash trong tên → dùng thẳng bản cache, khỏi hỏi mạng.
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

// Ảnh: trả bản cache ngay cho nhanh, đồng thời tải bản mới về cho lần sau.
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
  if (url.origin !== self.location.origin) return; // ảnh/CDN ngoài: để trình duyệt lo

  // Điều hướng thật sự (gõ URL, F5, mở link). Prefetch RSC của App Router có
  // mode khác 'navigate' nên rơi xuống network-only — tránh cache nhầm payload
  // RSC rồi trả về cho một request document.
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
