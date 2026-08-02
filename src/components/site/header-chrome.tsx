"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Theo dõi vị trí cuộn qua useSyncExternalStore thay vì useEffect + setState:
// không có setState đồng bộ trong effect (React Compiler chặn), và server luôn
// trả về snapshot `false` nên không lệch hydration.
//
// Có ĐỘ TRỄ (hysteresis): đặc lại khi cuộn quá 64px, chỉ trong suốt lại khi lên
// dưới 16px. Một ngưỡng duy nhất sẽ làm header nhấp nháy khi người dùng dừng
// đúng quanh mốc đó (cuộn quán tính trên trackpad/điện thoại rất hay như vậy).
let solidCache = false;
function subscribe(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
function getScrolled() {
  const y = window.scrollY;
  if (!solidCache && y > 64) solidCache = true;
  else if (solidCache && y < 16) solidCache = false;
  return solidCache;
}
const getServerScrolled = () => false;

// Vỏ ngoài của SiteHeader. Hai chế độ:
// - thường: sticky, nền mờ + viền đáy (như cũ);
// - overlay: header CHÌM trên hero — `fixed` để hero bắt đầu từ y=0 và chạy dưới
//   nó, nền trong suốt (chỉ một dải tối rất nhẹ cho chữ đọc được), cuộn xuống
//   thì đặc lại.
//
// Mẹo màu: lúc trong suốt gắn luôn class `dark` lên header. Dự án khai báo
// `@custom-variant dark (&:is(.dark *))` nên MỌI thành phần con (nav, ô tìm
// kiếm, menu người dùng…) tự đổi sang token dark = chữ sáng trên nền tối,
// khỏi phải sửa màu cứng trong từng component.
//
// Chuyển trạng thái: hai lớp nền ĐỀU LUÔN TỒN TẠI và chỉ đổi `opacity`, KHÔNG
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
  const solid = !overlay || scrolled;
  const fade = "transition-opacity duration-500 ease-out";

  return (
    <header
      data-solid={solid}
      className={cn(
        "group/header relative top-0 z-50 w-full",
        overlay ? "fixed" : "sticky",
        !solid && "dark",
      )}
    >
      {/* Nền đặc (mờ + viền đáy) — mờ dần vào/ra thay vì bật tắt */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 border-b border-border/60 bg-background/85 backdrop-blur-md",
          fade,
          solid ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Scrim cho chữ đọc được khi trong suốt. Cao hơn header (h-32) và fade
          hẳn ra ngoài mép dưới — nếu gradient chỉ cao bằng header thì nó phải
          tắt trong đúng 4rem, mắt đọc ra thành một thanh tối vắt ngang. */}
      {overlay && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/45 via-black/12 to-transparent",
            fade,
            solid ? "opacity-0" : "opacity-100",
          )}
        />
      )}
      {children}
    </header>
  );
}
