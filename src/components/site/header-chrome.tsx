"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { HeroLayout } from "@/generated/prisma/enums";
import { chromeFor } from "@/lib/site-chrome";
import {
  getPageLoading,
  getServerPageLoading,
  subscribePageLoading,
} from "./loading-state";
import { cn } from "@/lib/utils";

// Theo dõi vị trí cuộn qua useSyncExternalStore thay vì useEffect + setState:
// không có setState đồng bộ trong effect (React Compiler chặn), và server luôn
// trả về snapshot `false` nên không lệch hydration.
//
// Có ĐỘ TRỄ (hysteresis): đục lên khi cuộn quá 64px, chỉ trong lại khi lên dưới
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
// Header là một BĂNG KÍNH TRÀN VIỀN dính sát mép trên: kính + blur chạy hết bề
// ngang, chỉ NỘI DUNG bó vào `max-w-7xl` — trùng container của hero và các
// section bên dưới, nên logo/nav thẳng hàng với nội dung trang thay vì dính mép
// màn hình ở màn rộng.
//
// CHIỀU CAO HEADER = h-16 = 64px. Các thanh lọc/tab dính bên dưới (place-tabs,
// spot-section-nav, spot-filter, destination-filter) dùng `top-16` cho khớp —
// đổi số ở đây thì phải đổi cả bên đó (kể cả `rootMargin` của observer).
//
// BA chế độ, khác nhau ở vị trí trong luồng:
// - `!pinned`: nằm trong luồng, CUỘN ĐI (trang lịch trình — xem lib/site-chrome);
// - `overlay` (trang có hero ảnh tràn viền): `fixed` để hero bắt đầu từ y=0 và
//   chạy dưới header;
// - thường: `sticky` — nội dung bắt đầu ngay dưới thanh, không bị khuất.
//
// ─────────────────────────────────────────────────────────────────────────────
// MỘT BIẾN DUY NHẤT ĐIỀU KHIỂN CẢ VẬT LIỆU LẪN MÀU CHỮ: `deep`.
//
//   !deep — chỉ xảy ra ở ĐỈNH một trang overlay: kính TRONG (blur 2px, không
//           tint) để thấy nguyên vẹn hero, cộng scrim đỉnh + chữ TRẮNG.
//    deep — mọi lúc còn lại: kính TRẮNG đục + hairline + chữ MỰC.
//
// `tone` = nghịch đảo của `deep`, không phải một danh sách route khai riêng.
// Đây là chỗ bản cũ sai: tone quyết định theo ROUTE ("trang này mở bằng ảnh"),
// nên trang overlay giữ kính TỐI cả sau khi cuộn — tint đen nằm trên nền trắng
// ra một vệt xám ~#cacaca, chữ trắng trên đó chỉ ~1.7:1. Đã thử vá bằng cách
// đo mép dưới hero (thêm một store + thuộc tính `data-hero` phải nhớ gắn ở mọi
// trang có hero): chạy đúng nhưng quá nhiều bộ phận cho một cái thanh.
//
// Buộc tone vào `deep` thì chuyện đó biến mất, vì hai trạng thái của kính vốn
// đã trùng với hai thứ có thể nằm sau lưng: kính chỉ TRONG khi đang ở đỉnh một
// trang mở bằng ảnh, tức lúc đó sau lưng CHẮC CHẮN là ảnh. Cuộn qua 64px là
// kính đục lại — từ đó trở đi nó là thanh trắng, nằm trên ảnh hay trên nền
// trang đều đọc được như nhau.
export function HeaderChrome({
  heroLayout,
  children,
}: {
  heroLayout: HeroLayout;
  children: React.ReactNode;
}) {
  const scrolled = useSyncExternalStore(
    subscribe,
    getScrolled,
    getServerScrolled,
  );
  // Đang hiện màn chờ ⇒ sau lưng header là nền trang trống, KHÔNG phải hero.
  const loading = useSyncExternalStore(
    subscribePageLoading,
    getPageLoading,
    getServerPageLoading,
  );
  const { overlay, pinned } = chromeFor(usePathname(), heroLayout);
  // Header KHÔNG dính thì luôn đục: nó không đè lên gì cả, mà kính trong đặt
  // trên nền trang thì thành một vệt bệt, không ra thanh cũng không ra nền.
  // `loading` cùng một lý do: trong lúc chờ tải, hero chưa tồn tại.
  const deep = loading || !overlay || scrolled || !pinned;

  return (
    <header
      data-deep={deep}
      // Con của header đọc bản màu qua thuộc tính này (`group-data-*`) thay vì
      // nhận prop: chúng nằm trong SiteHeader — một Server Component — nên
      // không thể nhận giá trị tính ở client.
      data-tone={deep ? "light" : "dark"}
      className={cn(
        // CHỈ từ lg. Ở mobile không có header: điều hướng dồn hết xuống thanh
        // tab dưới (Trang chủ · Khám phá · Tìm kiếm · Cộng đồng · Menu) — ngón
        // cái với tới được, và trả lại 64px trên cùng cho nội dung.
        // Kéo theo: mọi thanh dính bên dưới phải neo `top-0 lg:top-16`.
        "group/header relative top-0 z-50 hidden w-full lg:block",
        // Mẹo màu: gắn luôn class `dark` lúc kính còn trong. Dự án khai
        // `@custom-variant dark (&:is(.dark *))` nên MỌI thành phần con (nav, ô
        // tìm kiếm, menu người dùng…) tự đổi sang token dark = chữ sáng, khỏi
        // phải sửa màu cứng trong từng component.
        !deep && "dark",
        // `relative` đã có sẵn ở dòng trên — không dính thì để nguyên nó.
        overlay ? "fixed" : pinned ? "sticky" : null,
      )}
    >
      {/* Scrim đỉnh — chỉ lúc kính còn trong. Cao hơn header và fade hẳn ra
          ngoài mép dưới: nếu gradient chỉ cao bằng header thì nó phải tắt
          trong đúng 4rem, mắt đọc ra thành một thanh tối vắt ngang. */}
      {overlay && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/40 via-black/10 to-transparent transition-opacity duration-300 ease-out",
            deep ? "opacity-0" : "opacity-100",
          )}
        />
      )}
      {/* Hai lớp kính, CHỒNG NHAU và chỉ đổi `opacity` — mấu chốt: `transition`
          KHÔNG áp được cho `backdrop-filter`, nên muốn độ mờ kính chuyển mượt
          thì phải mờ dần cả LỚP mang blur, chứ không phải đổi giá trị blur.
          Ở opacity 0 lớp coi như không tồn tại, blur của nó cũng tắt theo.

          Đổi màu chữ thì KHÔNG mờ dần được (class `dark` bật/tắt tức thì), nên
          hai lớp này chuyển nhanh — 300ms — để mắt đọc ra là một cú đổi vật
          liệu, thay vì thấy chữ mực nằm trên kính còn đang trong. */}

      {/* Lớp TRONG (đỉnh trang có hero): blur 2px, không tint, không hairline.
          Ảnh hero gần như nguyên vẹn, chỉ hơi "có mặt kính". */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
          deep ? "opacity-0" : "opacity-100",
        )}
      />
      {/* Lớp ĐỤC: kính trắng + hairline mép dưới. Hairline dùng `border` — cùng
          vạch ngăn với thanh lọc dính ngay bên dưới, nên hai thanh xếp chồng
          lúc cuộn đọc ra là một khối chứ không phải hai vật liệu khác nhau.
          Thanh dính sát y=0 nên mép trên không bao giờ lộ ra, chỉ cần
          `border-b`. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 border-b border-border bg-background/80 backdrop-blur-lg backdrop-saturate-150 transition-opacity duration-300 ease-out",
          deep ? "opacity-100" : "opacity-0",
        )}
      />
      {children}
    </header>
  );
}
