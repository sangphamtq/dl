import type { HeroLayout } from "@/generated/prisma/enums";

const MAP_ROUTES = /^\/ban-do$|^\/diem-den\/[^/]+\/ban-do$/;

/** Trang chi tiết một điểm đến: `/diem-den/<slug>`, KHÔNG gồm các màn con. */
const PLACE_DETAIL = /^\/diem-den\/[^/]+$/;

const TRIP_DETAIL = /^\/lich-trinh\/(?!cua-toi$)(?:cua-toi\/)?[^/]+/;

export function isMapRoute(pathname: string): boolean {
  return MAP_ROUTES.test(pathname);
}

export function chromeFor(
  pathname: string,
  heroLayout: HeroLayout,
): { overlay: boolean; pinned: boolean } {
  const pinned = !TRIP_DETAIL.test(pathname);

  const overlay =
    pinned &&
    (pathname === "/" ||
      pathname === "/diem-den" ||
      pathname === "/dia-diem" ||
      pathname === "/lich-trinh" ||
      (PLACE_DETAIL.test(pathname) && heroLayout === "center"));

  return { overlay, pinned };
}
