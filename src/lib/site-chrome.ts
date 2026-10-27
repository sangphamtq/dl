import type { HeroLayout } from "@/generated/prisma/enums";

const MAP_ROUTES = /^\/ban-do$|^\/diem-den\/[^/]+\/ban-do$/;

/** Trang chi tiết một điểm đến: `/diem-den/<slug>`, KHÔNG gồm các màn con. */
const PLACE_DETAIL = /^\/diem-den\/[^/]+$/;

// `/lich-trinh/cua-toi/tao` là trang TẠO chuyến (một form thường), không phải một chuyến — giữ header như mọi trang.
const TRIP_DETAIL = /^\/lich-trinh\/(?!cua-toi$|cua-toi\/tao$)(?:cua-toi\/)?[^/]+/;

/** Trình sửa lịch trình: header nằm ĐÈ lên dải ảnh của chuyến, cuộn đi cùng trang. */
const TRIP_EDITOR = /^\/lich-trinh\/cua-toi\/(?!tao$)[^/]+(?:\/[^/]+)?$/;

export function isMapRoute(pathname: string): boolean {
  return MAP_ROUTES.test(pathname);
}

export function chromeFor(
  pathname: string,
  heroLayout: HeroLayout,
): { overlay: boolean; pinned: boolean; underlay: boolean } {
  const pinned = !TRIP_DETAIL.test(pathname);

  const overlay =
    pinned &&
    (pathname === "/" ||
      pathname === "/diem-den" ||
      pathname === "/dia-diem" ||
      pathname === "/lich-trinh" ||
      (PLACE_DETAIL.test(pathname) && heroLayout === "center"));

  return { overlay, pinned, underlay: TRIP_EDITOR.test(pathname) };
}
