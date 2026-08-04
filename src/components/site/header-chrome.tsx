"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Theo dõi vị trí cuộn qua useSyncExternalStore thay vì useEffect + setState:
// không có setState đồng bộ trong effect (React Compiler chặn), và server luôn
// trả về snapshot `false` nên không lệch hydration.
//
// Có ĐỘ TRỄ (hysteresis): đậm lên khi cuộn quá 64px, chỉ nhạt lại khi lên dưới
// 16px. Một ngưỡng duy nhất sẽ làm header nhấp nháy khi người dùng dừng đúng
// quanh mốc đó (cuộn quán tính trên trackpad/điện thoại rất hay như vậy).
let scrolledCache = false;
function subscribe(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
function getScrolled() {
  const y = window.scrollY;
  if (!scrolledCache && y > 64) scrolledCache = true;
  else if (scrolledCache && y < 16) scrolledCache = false;
  return scrolledCache;
}
const getServerScrolled = () => false;

// Vỏ ngoài của SiteHeader.
//
// Header KHÔNG BAO GIỜ đặc lại. Ở mọi trang public nó luôn là một BĂNG KÍNH chữ
// trắng: hairline trên + dưới chạy hết bề ngang, nền tối trong mờ + blur, nội
// dung trang trôi bên dưới vẫn thấy được. Cuộn xuống chỉ làm tint ĐẬM THÊM chứ
// không đổi sang thanh trắng đục.
//
// Hai chế độ chỉ khác nhau ở vị trí và độ đậm lúc nghỉ:
// - `overlay` (trang có hero ảnh tràn viền): `fixed` để hero bắt đầu từ y=0 và
//   chạy dưới header; lúc chưa cuộn thì tint gần như trong veo và thanh tụt
//   xuống ~10px để lộ một dải ảnh phía trên — cảm giác "băng nổi" đóng khung.
// - thường: `sticky` (nội dung bắt đầu ngay dưới thanh, không bị khuất) và tint
//   đậm sẵn — vì sau lưng có thể là một trang trắng toát.
//
// Độ đậm lúc `deep`: hai lớp cộng lại ≈ black/21 (trên nền trắng ra ~#cacaca).
// Rất nhạt — ưu tiên vẻ thoáng, thanh gần như chỉ là một lớp kính mờ. Đánh đổi:
// chữ trắng chỉ còn ~1.6:1, thấp hơn nhiều ngưỡng AA (4.5:1); trên nền sáng
// gắt sẽ khó đọc. Thứ duy nhất còn đỡ là blur (`backdrop-blur-lg` làm nhoè hoạ
// tiết phía sau) + một bóng chữ mảnh (xem site-header).
// Thang để quay lại nếu cần đọc rõ hơn — chỉ sửa lớp tint thứ hai bên dưới:
// black/25 ≈ 2.3:1 · black/40 ≈ 3.4:1 · black/55 ≈ 5:1 (đạt AA).
//
// Mẹo màu: gắn luôn class `dark` lên header. Dự án khai báo
// `@custom-variant dark (&:is(.dark *))` nên MỌI thành phần con (nav, ô tìm
// kiếm, menu người dùng…) tự đổi sang token dark = chữ sáng trên nền tối,
// khỏi phải sửa màu cứng trong từng component.
//
// Chuyển trạng thái: các lớp nền ĐỀU LUÔN TỒN TẠI và chỉ đổi `opacity`, KHÔNG
// gắn/gỡ khỏi DOM và cũng không dựa vào `transition-colors`. Lý do:
// - `transition-colors` không áp cho `backdrop-filter` → blur sẽ bật/tắt phựt;
// - lớp mount/unmount thì không có gì để chạy transition.
// Đổi opacity của cả lớp giải quyết cả hai, lại rẻ (chỉ compositing).
export function HeaderChrome({
  overlay,
  children,
}: {
  overlay: boolean;
  children: React.ReactNode;
}) {
  const scrolled = useSyncExternalStore(
    subscribe,
    getScrolled,
    getServerScrolled,
  );
  const deep = !overlay || scrolled;
  const fade = "transition-opacity duration-500 ease-out";

  return (
    <header
      data-deep={deep}
      className={cn(
        "group/header dark relative top-0 z-50 w-full",
        overlay ? "fixed" : "sticky",
      )}
    >
      {/* Scrim đỉnh — chỉ dùng lúc thanh còn trong veo trên hero. Cao hơn
          header và fade hẳn ra ngoài mép dưới: nếu gradient chỉ cao bằng header
          thì nó phải tắt trong đúng 4rem, mắt đọc ra thành một thanh tối vắt
          ngang. */}
      {overlay && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/40 via-black/10 to-transparent",
            fade,
            deep ? "opacity-0" : "opacity-100",
          )}
        />
      )}

      {/* Thân thanh. Trên hero lúc chưa cuộn thì đẩy xuống 10px (dải ảnh phía
          trên = phần "nổi" của khung); còn lại nằm sát mép. */}
      <div
        className={cn(
          "relative isolate transition-[margin] duration-500 ease-out",
          overlay && !deep ? "mt-2.5" : "mt-0",
        )}
      >
        {/* Băng kính — LUÔN hiện, không bao giờ tắt */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 border-y border-white/20 bg-black/10 backdrop-blur-lg backdrop-saturate-150"
        />
        {/* Lớp tint đậm thêm: cộng với lớp trên ≈ black/21 */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 bg-black/12",
            fade,
            deep ? "opacity-100" : "opacity-0",
          )}
        />
        {children}
      </div>
    </header>
  );
}
