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

// Nav: 2 nhóm dropdown (click nhãn → `href`) + 2 link phẳng ở giữa.
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
  { href: "/cong-dong", label: "Cộng đồng" },
  {
    label: "Uy tín",
    href: "/kiem-tra",
    items: [
      { href: "/sale", label: "Cộng tác viên" },
      { href: "/kiem-tra", label: "Kiểm tra uy tín" },
    ],
  },
  {
    label: "Thông tin",
    href: "/gioi-thieu",
    items: [
      { href: "/gioi-thieu", label: "Giới thiệu" },
      { href: "/cau-hoi-thuong-gap", label: "Câu hỏi thường gặp", badge: "Sắp có" },
      { href: "/lien-he", label: "Liên hệ", badge: "Sắp có" },
      { href: "/dieu-khoan", label: "Điều khoản", badge: "Sắp có" },
      { href: "/bao-mat", label: "Bảo mật", badge: "Sắp có" },
    ],
  },
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
  /** Chìm trên hero: header `fixed`, nền trong suốt tới khi cuộn. Chỉ bật ở
   *  trang có hero ảnh tràn viền — nền sáng thì chữ trắng không đọc được. */
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
      {/* Thanh nền vẫn tràn viền (viền đáy + nền mờ chạy hết bề ngang), chỉ NỘI
          DUNG bó vào container max-w-7xl — trùng đúng container của hero và các
          section bên dưới, nên logo/nav thẳng hàng với nội dung trang thay vì
          dính mép màn hình ở màn rộng. */}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
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
              className="h-8 w-auto transition-[filter] duration-500 group-data-[solid=false]/header:drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] sm:h-11"
            />
            {/* Wordmark là chữ MỘT MÀU PHẲNG #0E3E27 (xanh rất tối) → đặt lên
                ảnh hero là chìm. Khi header trong suốt thì đảo thành trắng bằng
                `brightness-0 invert`; mascot bên trái KHÔNG đụng tới nên logo
                vẫn giữ màu. Header đặc thì trả về ảnh gốc. */}
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              priority
              className="h-3.5 w-auto transition-[filter] duration-500 group-data-[solid=false]/header:brightness-0 group-data-[solid=false]/header:invert group-data-[solid=false]/header:drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] sm:h-4.5"
            />
          </Link>
        </div>

        {/* Desktop nav — căn giữa */}
        <SiteNav entries={NAV} className="hidden lg:flex" />

        {/* Cụm phải — tiện ích: tìm kiếm · tài khoản (flex-1, dồn phải) */}
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
              <span aria-hidden className="mx-1.5 h-6 w-px bg-border" />
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
                className="hidden h-10 items-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
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
