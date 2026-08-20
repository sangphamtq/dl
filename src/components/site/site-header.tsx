import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { getUnreadCount } from "@/lib/notifications";
import { getProvinces } from "@/lib/locations";
import { getHomeProvince } from "@/lib/home-province";
import { ablyEnabled } from "@/lib/ably";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { DaDenNavLink } from "./da-den-nav-link";
import { LichTrinhNavLink } from "./lich-trinh-nav-link";
import { HeaderSearch } from "./header-search";
import { SiteNav, type NavEntry, type NavLink } from "./site-nav";
import { HeaderChrome } from "./header-chrome";
import type { HeroLayout } from "@/generated/prisma/enums";
import { TooltipProvider } from "@/components/ui/tooltip";

// Nav: 1 nhóm dropdown (click nhãn → `href`) + 2 link phẳng.
//
// TẠM BỎ khỏi header (trang vẫn còn, chỉ không có lối vào từ nav):
//  · Nhóm "Uy tín" → /sale (Cộng tác viên) và /kiem-tra (Kiểm tra uy tín).
//  · "Cộng đồng" → /cong-dong.
//  · Danh sách con của nhóm thông tin → /cau-hoi-thuong-gap, /lien-he,
//    /dieu-khoan, /bao-mat (cả bốn đều đang "Sắp có") — nay còn một link phẳng
//    "Giới thiệu" đi thẳng tới /gioi-thieu, trang duy nhất có nội dung thật.
// Bật lại thì thêm `items` trở lại là xong; `NavEntry` nhận cả link phẳng lẫn nhóm.
const NAV: NavEntry[] = [
  {
    label: "Khám phá",
    href: "/diem-den",
    items: [
      { href: "/diem-den", label: "Điểm đến" },
      { href: "/dia-diem", label: "Địa điểm" },
      { href: "/ban-do", label: "Bản đồ du lịch" },
      { href: "/lich-trinh", label: "Lịch trình mẫu" },
    ],
  },
  { href: "/blog", label: "Cẩm nang" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

// Mobile: sheet liệt kê phẳng toàn bộ (nhóm dropdown trải thành các mục con).
const MOBILE_LINKS: NavLink[] = NAV.flatMap((e) => {
  if ("columns" in e && e.columns)
    return e.columns.map((c) => ({
      href: c.href,
      label: c.title,
      badge: c.badge,
    }));
  if ("items" in e && e.items) return e.items;
  return [e as NavLink];
});

// Header giờ được render MỘT LẦN ở `src/app/(site)/layout.tsx`, không phải ở
// từng trang. Vì vậy nó không nhận `overlay`/`tone` nữa — `HeaderChrome` tự tra
// theo đường dẫn (xem `@/lib/site-chrome`) rồi công bố kết quả qua `data-tone`
// trên thẻ <header>. Mọi thứ trong này cần biết bản màu thì đọc qua biến thể
// `group-data-[tone=light]/header:` — không thể nhận prop, vì giá trị đó tính ở
// client còn đây là Server Component.
export async function SiteHeader({
  heroLayout,
}: {
  heroLayout: HeroLayout;
}) {
  const [session, settings, provinces] = await Promise.all([
    auth(),
    getSettings(),
    getProvinces(),
  ]);
  const user = session?.user;
  const [unread, homeProvince] = await Promise.all([
    user?.id ? getUnreadCount(user.id) : Promise.resolve(0),
    getHomeProvince(user?.id),
  ]);
  const provinceNames = provinces.map((p) => p.name);

  return (
    <HeaderChrome heroLayout={heroLayout}>
      {/* Băng nền tràn viền do HeaderChrome vẽ; ở đây chỉ bó NỘI DUNG vào
          `max-w-7xl` — trùng container của hero và các section bên dưới nên
          logo/nav thẳng hàng với nội dung trang.
          text-shadow mảnh vì kính rất nhạt: chữ trắng cần một chút viền tối để
          không tan vào nội dung trôi phía sau. Cố ý giữ nhẹ, đậm hơn là nhoè.
          Bản `light` KHÔNG có bóng chữ: mực trên nền sáng thì bóng tối chỉ làm
          chữ bẩn, và ở đây cũng không có ảnh nào trôi phía sau để mà tách. */}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-1 px-4 [text-shadow:0_1px_2px_rgb(0_0_0/0.28)] group-data-[tone=light]/header:[text-shadow:none] sm:gap-2 sm:px-6">
        {/* Cụm trái — điều hướng mobile + logo */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <MobileNav
            links={MOBILE_LINKS}
            isAuthed={!!user}
            provinces={provinceNames}
            homeProvince={homeProvince}
          />

          {/* Logo — tách mascot & chữ để canh giữa riêng: chữ "halivivu" cắt sát
              nên tâm hộp = tâm chữ, thẳng hàng với nav (ảnh ghép trước đây bị mascot
              đội tâm lên, làm chữ lệch xuống). */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo_mark.png"
              alt=""
              width={31}
              height={36}
              priority
              className="h-8 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] group-data-[tone=light]/header:drop-shadow-none sm:h-11"
            />
            {/* Wordmark là chữ MỘT MÀU PHẲNG #0E3E27 (xanh rất tối) → trên băng
                kính tối là chìm, nên đảo thành trắng bằng `brightness-0 invert`.
                Mascot bên trái KHÔNG đụng tới nên logo vẫn giữ màu.
                Bản `light` giữ NGUYÊN màu gốc — đó mới là màu thương hiệu, đảo
                trắng trên nền sáng thì mất hẳn chữ. */}
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              priority
              className="h-3.5 w-auto brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] group-data-[tone=light]/header:brightness-100 group-data-[tone=light]/header:invert-0 group-data-[tone=light]/header:drop-shadow-none sm:h-4.5"
            />
          </Link>
        </div>

        {/* Desktop nav — căn trái, nối tiếp logo */}
        <SiteNav entries={NAV} className="hidden lg:ml-3 lg:flex xl:ml-6" />

        {/* Cụm phải — tiện ích: tìm kiếm · tài khoản (flex-1, dồn về mút phải) */}
        <TooltipProvider delayDuration={300}>
        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Tìm kiếm — ô bấm + Command palette (⌘K); dưới lg là icon */}
          <HeaderSearch />

          {user ? (
            <>
              {/* Cụm tiện ích: icon TRẦN, chỉ hiện nền tròn khi hover/active.
                  Bỏ khung segmented mờ vì cạnh ô tìm kiếm (đã có nền) và avatar
                  thì ba khối nền xếp liền nhau — nặng, và trên hero ảnh thành ba
                  mảng xám. Giờ chỉ còn MỘT mảng nền duy nhất là ô tìm kiếm. */}
              <div className="ml-0.5 flex items-center gap-0.5">
                <DaDenNavLink />
                {/* Lịch trình (ẩn trên màn rất hẹp — vẫn có trong menu + nút nổi) */}
                <div className="hidden sm:flex">
                  <LichTrinhNavLink />
                </div>
                <NotificationBell
                  initialUnread={unread}
                  userId={user.id}
                  realtimeEnabled={ablyEnabled()}
                />
              </div>
              {/* Hairline ngăn "hành động" (tiện ích) với "tài khoản" */}
              <span
                aria-hidden
                className="mx-1.5 h-6 w-px bg-foreground/25"
              />
              <UserMenu
                user={{
                  name: user.name,
                  email: user.email,
                  image: user.image,
                  role: user.role,
                }}
                provinces={provinceNames}
                homeProvince={homeProvince}
              />
            </>
          ) : (
            /* MỘT nút duy nhất, không phải cặp "Đăng ký · Đăng nhập".
               Lý do: /login chỉ có Google/Facebook — OAuth không phân biệt đăng
               ký với đăng nhập (lần đầu tự tạo tài khoản), nên nút "Đăng ký" cũ
               dẫn tới đúng trang kia, một trang mang tiêu đề "Đăng nhập". Ngoài
               ra ba viên pill cùng cỡ, cùng bo tròn xếp liền nhau (ô tìm kiếm ·
               Đăng ký · Đăng nhập) làm ô tìm kiếm đọc ra như nút thứ ba. Mọi lối
               vào khác của site (mobile-nav, menu hamburger, LoginDrawer) vốn đã
               chỉ có một nút "Đăng nhập" — nay header khớp.

               XANH LÁ (`primary`) chứ không phải cam (`warm`). Cam là màu duy
               nhất trong header phải ĐI VÁ mới đọc được: `--warm-foreground` ở
               scope sáng là trắng, mà trắng trên #ff8800 chỉ được ~2.4:1 (AA cần
               4.5:1) nên phải ép riêng màu chữ cho từng tone. Cặp
               `brand`/`brand-foreground` thì trắng trên #2e871c được ~4.6:1,
               đạt AA mà không cần ngoại lệ nào. Xanh cũng là màu của chính
               wordmark trong logo, nên nút và logo giờ là một bộ thay vì hai
               điểm màu cãi nhau qua thanh header.

               Dùng `brand` chứ KHÔNG phải `primary`: trong scope `.dark` (tone
               tối của header) `--primary` tự sáng lên thành xanh bạc hà — đúng
               cho chữ/nền xanh trên nền gần đen, nhưng sai cho một viên nút ĐỤC
               vốn tự mang nền của nó đi. Hệ quả là cùng một nút ra hai sắc xanh
               khác hẳn giữa trang có hero và trang nền sáng. `--brand` cố ý
               không khai báo lại trong `.dark` — xem chú thích ở `globals.css`.

               KHÔNG icon, không đĩa, không bóng đổ màu: nhãn hai chữ trên nền
               đặc đã là tín hiệu đủ mạnh cạnh một ô tìm kiếm chỉ có hairline.
               Mọi thứ thêm vào đây đều là trang trí.

               GÓC: `rounded-full`. Đã thử bo theo `--radius` (10px) cho bớt
               dáng "viên nang mặc định" rồi BỎ — đừng thử lại. Lý do: viên tròn
               là ngôn ngữ của site chứ không phải một lựa chọn lười. Trong các
               control cùng cỡ (h-9…h-11) thì 14 chỗ bo tròn hết cỡ so với 9 chỗ
               bo nhẹ; nút CTA của hero, chip lọc, ô tìm kiếm trang /diem-den đều
               tròn. Bo vuông riêng cụm header thì header thành hòn đảo, và trên
               /diem-den nó ngồi ngay trên một ô tìm kiếm tròn làm đúng việc đó.
               (`Button` của shadcn dùng `rounded-md`, nhưng đó là form/CMS —
               không phải chrome public.)

               `[text-shadow:none]`: hàng cha đắp bóng chữ cho chữ trắng nổi trên
               ảnh hero; trên nền đặc thì không có ảnh nào để tách, bóng tối chỉ
               làm nhãn bẩn. */
            <Link
              href="/login"
              className="ml-1.5 inline-flex h-10 items-center rounded-full bg-brand px-4.5 text-sm font-semibold text-brand-foreground transition-[background-color,transform] duration-200 [text-shadow:none] hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Đăng nhập
            </Link>
          )}
        </div>
        </TooltipProvider>
      </div>
    </HeaderChrome>
  );
}
