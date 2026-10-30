import type { HeroLayout } from "@/generated/prisma/enums";

const MAP_ROUTES = /^\/ban-do$|^\/diem-den\/[^/]+\/ban-do$/;

/** Trang chi tiết một điểm đến: `/diem-den/<slug>`, KHÔNG gồm các màn con. */
const PLACE_DETAIL = /^\/diem-den\/[^/]+$/;

export function isMapRoute(pathname: string): boolean {
  return MAP_ROUTES.test(pathname);
}

/**
 * Header site: `overlay` = trong suốt đè lên hero ảnh (đậm lại khi cuộn); còn lại = thanh TRẮNG dính trên đầu.
 * Trang lịch trình (soạn · mẫu · chia sẻ) cũng là thanh trắng dính như mọi trang — bản "chìm vào đầu trang" đã bỏ (biên
 * tập: "header đang chìm"). Mọi thứ dính bên dưới ở trang đó lùi đúng `h-16` của header (`lg:top-16`).
 */
export function chromeFor(pathname: string, heroLayout: HeroLayout): { overlay: boolean } {
  const overlay =
    pathname === "/" ||
    pathname === "/diem-den" ||
    pathname === "/dia-diem" ||
    pathname === "/lich-trinh" ||
    (PLACE_DETAIL.test(pathname) && heroLayout === "center");
  return { overlay };
}
