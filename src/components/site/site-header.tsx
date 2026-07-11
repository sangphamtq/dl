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
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";

// Badge vai trò cạnh avatar — chỉ hiện cho staff (admin/editor).
const STAFF_ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-primary/10 text-primary" },
  editor: { label: "Editor", className: "bg-muted text-muted-foreground" },
};

// Nav: 2 nhóm dropdown (click nhãn → `href`) + 2 link phẳng ở giữa.
const NAV: NavEntry[] = [
  {
    label: "Khám phá",
    href: "/diem-den",
    items: [
      { href: "/diem-den", label: "Điểm đến" },
      { href: "/ban-do", label: "Bản đồ du lịch" },
      { href: "/lich-trinh", label: "Lịch trình", badge: "Sắp có" },
    ],
  },
  {
    label: "Dịch vụ",
    href: "/dich-vu",
    columns: [
      {
        href: "/luu-tru",
        title: "Lưu trú",
        desc: "Homestay, khách sạn, resort đã xác minh",
        badge: "Sắp có",
      },
      {
        href: "/thue-xe",
        title: "Thuê xe",
        desc: "Xe máy, ô tô, đưa đón sân bay",
        badge: "Sắp có",
      },
      {
        href: "/trai-nghiem",
        title: "Tour & trải nghiệm",
        desc: "Tour, vé tham quan, hoạt động",
        badge: "Sắp có",
      },
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

export async function SiteHeader() {
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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 w-full items-center gap-1 px-4 sm:gap-2 sm:px-6 lg:px-8">
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
              className="h-8 w-auto sm:h-11"
            />
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              priority
              className="h-3.5 w-auto sm:h-4.5"
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
              {/* Cụm tiện ích gom trên nền segmented mờ — đọc như một khối */}
              <div className="ml-1 flex items-center gap-0.5 rounded-full bg-muted/40 p-0.5">
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
              {user.role && STAFF_ROLE_BADGE[user.role] && (
                <Badge
                  className={`ml-0.5 hidden border-transparent px-1.5 text-[0.7rem] font-semibold sm:inline-flex ${STAFF_ROLE_BADGE[user.role].className}`}
                >
                  {STAFF_ROLE_BADGE[user.role].label}
                </Badge>
              )}
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
                className="hidden h-9 items-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                Đăng ký
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-full bg-warm px-4 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
        </TooltipProvider>
      </div>
    </header>
  );
}
