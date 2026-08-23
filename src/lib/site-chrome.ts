import type { HeroLayout } from "@/generated/prisma/enums";

// Bảng tra "vỏ trang" theo đường dẫn.
//
// Trước đây mỗi `page.tsx` tự khai `<SiteHeader overlay />` hay
// `<SiteHeader tone="light" />` ngay tại chỗ — rõ ràng nhất, nhưng chỉ làm được
// khi mỗi trang tự render header. Từ khi header lên layout dùng chung (xem
// `src/app/(site)/layout.tsx`) thì layout server không biết mình đang ở route
// nào, nên quyết định phải chuyển sang phía client và tra theo `usePathname()`.
//
// LUẬT MÀU: `tone` ĐI THEO `overlay`, không phải một danh sách khai riêng.
// Bản `dark` là chữ TRẮNG trên kính — nó chỉ đọc được khi bên dưới header là
// ẢNH. Không có ảnh thì phải là `light` (chữ mực). Vậy nên chỉ cần trả lời một
// câu hỏi: trang này có hero ảnh tràn viền chạy từ y=0 không?
//
// TRƯỚC ĐÂY đây là một danh sách CHO PHÉP (`LIGHT_ROUTES`) với mặc định là
// `dark`, kèm đúng cảnh báo này ngay tại đây: "thêm một trang mở bằng nền sáng
// thì phải nhớ khai ở đây, không thì header trông sai". Cảnh báo đã thành sự
// thật — quét lại toàn bộ route công khai thì 13 trang quên khai
// (/dia-diem, /ban-do, /cong-dong, /tim-kiem, /kiem-tra, /sale, /luu-tru, các
// màn con của trang điểm đến, và mọi trang chi tiết listing lẫn bài blog). Tất
// cả đang hiện một vệt xám ~#cacaca vắt ngang đầu trang với chữ trắng chỉ
// ~1.7:1 trên đó.
//
// Nay mặc định là `light`, và chỉ trang CÓ ảnh mới được nâng lên `dark`. Quên
// khai một trang mới thì tệ nhất là header sáng trên nền sáng — vẫn đọc được;
// còn kiểu hỏng cũ thì không.

/** Trang bản đồ: cao đúng một màn hình, không có chân trang. */
const MAP_ROUTES = /^\/ban-do$|^\/diem-den\/[^/]+\/ban-do$/;

/** Trang chi tiết một điểm đến: `/diem-den/<slug>`, KHÔNG gồm các màn con. */
const PLACE_DETAIL = /^\/diem-den\/[^/]+$/;

/**
 * Trang lịch trình CỤ THỂ (soạn · bản chia sẻ · lịch trình mẫu) — không gồm hai
 * trang DANH SÁCH: `/lich-trinh` (mẫu, công khai) và `/lich-trinh/cua-toi`
 * (chuyến của tôi). Cả hai vẫn là trang nội dung bình thường, header dính như
 * mọi nơi khác.
 *
 * Ở đây header KHÔNG dính: ba trang này là bố cục ba cột cao đúng một màn hình,
 * hai cột ngoài tự dính lấy. Giữ thêm một thanh dính nữa ở trên cùng thì vừa ăn
 * mất 64px vĩnh viễn của vùng làm việc, vừa chồng lên dải chọn ngày (vốn cũng
 * dính `top-0`). Cuộn qua là nó đi luôn, trả cả màn hình cho lịch trình.
 */
const TRIP_DETAIL = /^\/lich-trinh\/(?!cua-toi$)(?:cua-toi\/)?[^/]+/;

export function isMapRoute(pathname: string): boolean {
  return MAP_ROUTES.test(pathname);
}

export function chromeFor(
  pathname: string,
  heroLayout: HeroLayout,
): { tone: "dark" | "light"; overlay: boolean; pinned: boolean } {
  // `pinned = false` ⇒ header nằm trong luồng và CUỘN ĐI cùng nội dung.
  const pinned = !TRIP_DETAIL.test(pathname);

  // Hero ảnh tràn viền chạy DƯỚI header — đúng hai trường hợp:
  //   · trang chủ (ảnh bắt đầu từ y=0);
  //   · trang chi tiết điểm đến khi hero cấu hình kiểu "center" (cũng từ y=0).
  // Trang lịch trình cụ thể không dính header nên không thể đè lên gì.
  const overlay =
    pinned &&
    (pathname === "/" ||
      (PLACE_DETAIL.test(pathname) && heroLayout === "center"));

  // Có ảnh ở dưới thì mới dùng chữ trắng. Mọi trang còn lại là nền sáng.
  return { tone: overlay ? "dark" : "light", overlay, pinned };
}
