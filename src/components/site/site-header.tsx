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
      { href: "/lich-trinh", label: "Lịch trình", badge: "Sắp có" },
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

export async function SiteHeader({
  /** Chìm trên hero: header `fixed` (hero bắt đầu từ y=0 và chạy dưới nó) và
   *  tint gần như trong veo cho tới khi cuộn. Chỉ bật ở trang có hero ảnh tràn
   *  viền; trang thường dùng `sticky` + tint đậm sẵn. Cả hai chế độ đều là băng
   *  kính chữ trắng — header không bao giờ đặc lại. */
  overlay = false,
}: {
  overlay?: boolean;
} = {}) {
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
    <HeaderChrome overlay={overlay}>
      {/* Băng nền tràn viền do HeaderChrome vẽ; ở đây chỉ bó NỘI DUNG vào
          `max-w-7xl` — trùng container của hero và các section bên dưới nên
          logo/nav thẳng hàng với nội dung trang.
          text-shadow mảnh vì kính rất nhạt: chữ trắng cần một chút viền tối để
          không tan vào nội dung trôi phía sau. Cố ý giữ nhẹ, đậm hơn là nhoè. */}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-1 px-4 [text-shadow:0_1px_2px_rgb(0_0_0/0.28)] sm:gap-2 sm:px-6">
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
              className="h-8 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] sm:h-11"
            />
            {/* Wordmark là chữ MỘT MÀU PHẲNG #0E3E27 (xanh rất tối) → trên băng
                kính tối là chìm, nên đảo thành trắng bằng `brightness-0 invert`.
                Mascot bên trái KHÔNG đụng tới nên logo vẫn giữ màu. */}
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              priority
              className="h-3.5 w-auto brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] sm:h-4.5"
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
                className="mx-1.5 h-6 w-px bg-white/25"
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
            <div className="ml-1 flex items-center gap-2">
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-full border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:inline-flex"
              >
                Đăng ký
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-full bg-warm px-4 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
        </TooltipProvider>
      </div>
    </HeaderChrome>
  );
}
