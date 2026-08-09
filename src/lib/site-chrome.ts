import type { HeroLayout } from "@/generated/prisma/enums";

// Bảng tra "vỏ trang" theo đường dẫn.
//
// Trước đây mỗi `page.tsx` tự khai `<SiteHeader overlay />` hay
// `<SiteHeader tone="light" />` ngay tại chỗ — rõ ràng nhất, nhưng chỉ làm được
// khi mỗi trang tự render header. Từ khi header lên layout dùng chung (xem
// `src/app/(site)/layout.tsx`) thì layout server không biết mình đang ở route
// nào, nên quyết định phải chuyển sang phía client và tra theo `usePathname()`.
//
// ⚠️ ĐÁNH ĐỔI ĐÃ BIẾT: bảng này nằm tách khỏi trang. Thêm một trang mở bằng nền
// sáng hoặc bằng hero ảnh tràn viền thì phải nhớ khai ở đây, không thì header
// lấy mặc định (kính tối, `sticky`) và trông sai. Danh sách cố ý để ngắn và
// khớp CHÍNH XÁC đường dẫn, không dùng tiền tố mơ hồ.

/** Trang mở bằng nền SÁNG → băng kính bản `light` (chữ mực). */
const LIGHT_ROUTES = new Set(["/diem-den", "/gioi-thieu", "/blog"]);

/** Trang bản đồ: cao đúng một màn hình, không có chân trang. */
const MAP_ROUTES = /^\/ban-do$|^\/diem-den\/[^/]+\/ban-do$/;

/** Trang chi tiết một điểm đến: `/diem-den/<slug>`, KHÔNG gồm các màn con. */
const PLACE_DETAIL = /^\/diem-den\/[^/]+$/;

export function isMapRoute(pathname: string): boolean {
  return MAP_ROUTES.test(pathname);
}

export function chromeFor(
  pathname: string,
  heroLayout: HeroLayout,
): { tone: "dark" | "light"; overlay: boolean } {
  // `/diem-den` khớp cả LIGHT_ROUTES lẫn tiền tố của trang điểm đến — kiểm tra
  // khớp chính xác trước để nó không rơi nhầm vào nhánh hero.
  if (LIGHT_ROUTES.has(pathname)) return { tone: "light", overlay: false };

  // Hero ảnh tràn viền chạy dưới header: trang chủ luôn có, trang điểm đến chỉ
  // khi cấu hình hero là kiểu "center" (dải ảnh bắt đầu từ y=0).
  const overlay =
    pathname === "/" || (PLACE_DETAIL.test(pathname) && heroLayout === "center");

  return { tone: "dark", overlay };
}
