import type { HeroLayout } from "@/generated/prisma/enums";

// Bảng tra "vỏ trang" theo đường dẫn.
//
// Trước đây mỗi `page.tsx` tự khai `<SiteHeader overlay />` hay
// `<SiteHeader tone="light" />` ngay tại chỗ — rõ ràng nhất, nhưng chỉ làm được
// khi mỗi trang tự render header. Từ khi header lên layout dùng chung (xem
// `src/app/(site)/layout.tsx`) thì layout server không biết mình đang ở route
// nào, nên quyết định phải chuyển sang phía client và tra theo `usePathname()`.
//
// KHÔNG còn `tone`. Header chỉ có MỘT vật liệu — kính trắng, chữ mực, ở mọi
// trang — nên bảng này chỉ còn trả lời hai câu về VỊ TRÍ TRONG LUỒNG: header
// dính hay cuộn đi (`pinned`), và có nằm đè lên một hero ảnh tràn viền hay
// không (`overlay`, quyết định `fixed` vs `sticky` và độ đục lúc chưa cuộn).
//
// Bản cũ có thêm hai bản màu và chúng là nguồn của gần như mọi lỗi ở thanh
// này: một danh sách CHO PHÉP `LIGHT_ROUTES` bỏ sót 13 route (mỗi trang một
// vệt xám ~#cacaca vắt ngang đầu trang), rồi đảo thành mặc định `light` vẫn
// còn sai ở nửa dưới các trang overlay (cuộn qua hero là kính tối rơi xuống
// nền trắng). Lý do bỏ hẳn bản kính tối: xem `components/site/header-chrome.tsx`.

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
): { overlay: boolean; pinned: boolean } {
  // `pinned = false` ⇒ header nằm trong luồng và CUỘN ĐI cùng nội dung.
  const pinned = !TRIP_DETAIL.test(pathname);

  // Hero ảnh tràn viền chạy DƯỚI header — đúng những trường hợp sau:
  //   · trang chủ (ảnh bắt đầu từ y=0);
  //   · danh sách điểm đến `/diem-den` — dải ảnh ruộng bậc thang, KHÔNG gồm
  //     các màn con `/diem-den/<slug>/...` (chúng mở bằng nền sáng);
  //   · danh sách địa điểm `/dia-diem` — dải ảnh vịnh Hạ Long;
  //   · danh sách lịch trình mẫu `/lich-trinh` — dải ảnh lấy từ một điểm dừng
  //     của chính các mẫu; KHÔNG gồm `/lich-trinh/cua-toi` (nền sáng) và các
  //     trang lịch trình cụ thể (chúng rơi vào `TRIP_DETAIL`, không dính header);
  //   · trang chi tiết điểm đến khi hero cấu hình kiểu "center" (cũng từ y=0).
  //
  // Quên khai một trang mới ở đây thì tệ nhất là header dính kiểu `sticky` và
  // đục sẵn từ đầu trang — vẫn đọc được, chỉ mất hiệu ứng ảnh chạy lên tận mép
  // trên. Không còn kiểu hỏng nào nặng hơn thế.
  const overlay =
    pinned &&
    (pathname === "/" ||
      pathname === "/diem-den" ||
      pathname === "/dia-diem" ||
      pathname === "/lich-trinh" ||
      (PLACE_DETAIL.test(pathname) && heroLayout === "center"));

  return { overlay, pinned };
}
