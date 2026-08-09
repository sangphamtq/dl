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
// Header là một BĂNG KÍNH TRÀN VIỀN dính sát mép trên: nền tối trong mờ + blur
// chạy hết bề ngang, hairline ở mép dưới, chỉ NỘI DUNG bó vào `max-w-7xl` —
// trùng container của hero và các section bên dưới, nên logo/nav thẳng hàng với
// nội dung trang thay vì dính mép màn hình ở màn rộng.
//
// CHIỀU CAO HEADER = h-16 = 64px. Các thanh lọc/tab dính bên dưới (place-tabs,
// spot-section-nav, spot-filter, destination-filter) dùng `top-16` cho khớp —
// đổi số ở đây thì phải đổi cả bên đó (kể cả `rootMargin` của observer).
//
// Header KHÔNG BAO GIỜ đặc lại: ở mọi trang public nó luôn là kính chữ trắng,
// nội dung trang trôi bên dưới vẫn thấy được. Cuộn xuống chỉ làm tint đậm thêm,
// thanh không xê dịch.
//
// Hai chế độ chỉ khác nhau ở vị trí trong luồng và độ đậm lúc nghỉ:
// - `overlay` (trang có hero ảnh tràn viền): `fixed` để hero bắt đầu từ y=0 và
//   chạy dưới header; lúc chưa cuộn thì tint gần như trong veo, ảnh nguyên vẹn.
// - thường: `sticky` (nội dung bắt đầu ngay dưới thanh, không bị khuất) và tint
//   đậm sẵn — vì sau lưng có thể là một trang trắng toát.
//
// Mẹo màu: gắn luôn class `dark` lên header. Dự án khai báo
// `@custom-variant dark (&:is(.dark *))` nên MỌI thành phần con (nav, ô tìm
// kiếm, menu người dùng…) tự đổi sang token dark = chữ sáng trên nền tối,
// khỏi phải sửa màu cứng trong từng component.
//
// Hai trạng thái phải KHÁC NHAU RÕ, và thứ mắt bắt được là ĐỘ MỜ KÍNH chứ
// không phải sắc độ tint:
// - nghỉ (đỉnh trang có hero): blur 2px, không tint, không hairline;
// - cuộn: blur mạnh + black/20 + hairline (trên nền trắng ra ~#cacaca).
// Tint /20 rất nhạt nên chữ trắng chỉ ~1.6:1, dưới xa ngưỡng AA (4.5:1) — bù
// bằng blur + bóng chữ (xem site-header). Thang để quay lại nếu cần đọc rõ
// hơn: /25 ≈ 2.3:1 · /40 ≈ 3.4:1 · /55 ≈ 5:1 (đạt AA).
// TONE — băng kính có HAI bản màu, chọn theo thứ nằm SAU LƯNG header ở đầu
// trang, không phải theo sở thích:
//   · `dark` (mặc định): trang mở bằng ảnh/dải tối — hero trang chủ, trang
//     Place. Kính tối, chữ trắng, có bóng chữ.
//   · `light`: trang mở bằng nền sáng — danh sách, tra cứu (vd /diem-den).
//     Kính sáng, chữ mực, hairline `border`. Dùng bản dark ở đây thì tint
//     `black/20` trên nền trắng ra một vệt xám ~#cacaca và chữ trắng trên đó
//     chỉ còn ~1.7:1 — vừa khó đọc vừa trông như một thanh bị bẩn.
// Cách bật/tắt: chỉ ở class `dark` trên <header>. Dự án khai
// `@custom-variant dark (&:is(.dark *))` nên MỌI thành phần con tự đổi theo —
// với điều kiện chúng dùng token. Vì vậy các chỗ trong header trước đây viết
// cứng `text-white`/`bg-white/15` đã đổi hết sang `foreground` (trong scope
// dark, `--foreground` là oklch(.985) ≈ trắng, nên bản tối KHÔNG đổi một pixel
// nào), và gạch chân nav dùng `bg-current`.
export type HeaderTone = "dark" | "light";

export function HeaderChrome({
  overlay,
  tone = "dark",
  children,
}: {
  overlay: boolean;
  tone?: HeaderTone;
  children: React.ReactNode;
}) {
  const scrolled = useSyncExternalStore(
    subscribe,
    getScrolled,
    getServerScrolled,
  );
  const deep = !overlay || scrolled;
  const light = tone === "light";

  return (
    <header
      data-deep={deep}
      className={cn(
        // CHỈ từ lg. Ở mobile không có header: điều hướng dồn hết xuống thanh
        // tab dưới (Trang chủ · Khám phá · Tìm kiếm · Cộng đồng · Menu) — ngón
        // cái với tới được, và trả lại 64px trên cùng cho nội dung.
        // Kéo theo: mọi thanh dính bên dưới phải neo `top-0 lg:top-16`.
        "group/header relative top-0 z-50 hidden w-full lg:block",
        !light && "dark",
        overlay ? "fixed" : "sticky",
      )}
    >
      {/* Scrim đỉnh — chỉ lúc còn trong veo trên hero. Cao hơn header và fade
          hẳn ra ngoài mép dưới: nếu gradient chỉ cao bằng header thì nó phải
          tắt trong đúng 4rem, mắt đọc ra thành một thanh tối vắt ngang.
          Bản `light` không có scrim: nó tồn tại để dằn ẢNH cho chữ trắng đọc
          được, mà bản này thì chữ đã là mực trên nền sáng. */}
      {overlay && !light && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/40 via-black/10 to-transparent transition-opacity duration-500 ease-out",
            deep ? "opacity-0" : "opacity-100",
          )}
        />
      )}
      {/* Hai lớp kính, CHỒNG NHAU và chỉ đổi `opacity` — mấu chốt: `transition`
          KHÔNG áp được cho `backdrop-filter`, nên muốn độ mờ kính chuyển mượt
          thì phải mờ dần cả LỚP mang blur, chứ không phải đổi giá trị blur.
          Ở opacity 0 lớp coi như không tồn tại, blur của nó cũng tắt theo. */}

      {/* Lớp NGHỈ (đỉnh trang có hero): kính rất nhẹ — blur 2px, không tint,
          không hairline. Ảnh hero gần như nguyên vẹn, chỉ hơi "có mặt kính". */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 backdrop-blur-[2px] transition-opacity duration-500 ease-out",
          deep ? "opacity-0" : "opacity-100",
        )}
      />
      {/* Lớp CUỘN: kính thật — blur mạnh + tint + hairline mép dưới. Thanh dính
          sát y=0 nên mép trên không bao giờ lộ ra, chỉ cần `border-b`.
          Bản `light` KHÔNG phải bản dark đảo ngược: tint đi từ black/20 sang
          `background/75` (trắng đục) và hairline dùng `border` — tức cùng một
          vạch ngăn với thanh lọc dính ngay bên dưới, nên hai thanh xếp chồng
          lúc cuộn đọc ra là một khối chứ không phải hai vật liệu khác nhau. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 border-b backdrop-blur-lg backdrop-saturate-150 transition-opacity duration-500 ease-out",
          light
            ? "border-border bg-background/75"
            : "border-white/20 bg-black/20",
          deep ? "opacity-100" : "opacity-0",
        )}
      />
      {children}
    </header>
  );
}
