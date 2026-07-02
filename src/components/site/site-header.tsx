import Link from "next/link";
import Image from "next/image";
import { Search, Route } from "lucide-react";
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
import { HeaderSearch } from "./header-search";
import { HomeProvincePicker } from "./home-province-picker";
import { SiteNav, type NavEntry } from "./site-nav";
import { Badge } from "@/components/ui/badge";

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
      { href: "/ban-do", label: "Bản đồ du lịch", badge: "Sắp có" },
      { href: "/lich-trinh", label: "Lịch trình", badge: "Sắp có" },
    ],
  },
  {
    label: "Dịch vụ",
    href: "/dich-vu",
    items: [
      { href: "/luu-tru", label: "Lưu trú", badge: "Sắp có" },
      { href: "/thue-xe", label: "Thuê xe", badge: "Sắp có" },
      { href: "/trai-nghiem", label: "Tour & trải nghiệm", badge: "Sắp có" },
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
const MOBILE_LINKS = NAV.flatMap((e) => ("items" in e ? e.items : [e]));

// Ngôn ngữ chung cho mọi nút biểu tượng bên phải (search, đã đến, chuông) —
// giữ cụm tiện ích đồng nhất một kiểu.
export const HEADER_ICON_BTN =
  "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

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
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <MobileNav
          links={MOBILE_LINKS}
          isAuthed={!!user}
          provinces={provinceNames}
          homeProvince={homeProvince}
        />

        {/* Logo — tách mascot & chữ để canh giữa riêng: chữ "halivivu" cắt sát
            nên tâm hộp = tâm chữ, thẳng hàng với nav (ảnh ghép trước đây bị mascot
            đội tâm lên, làm chữ lệch xuống). */}
        <Link href="/" className="mr-1 flex shrink-0 items-center gap-2">
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

        {/* Desktop nav */}
        <SiteNav entries={NAV} className="hidden lg:flex" />

        {/* Cụm phải — tiện ích: tỉnh · tìm kiếm · tài khoản */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {/* Tỉnh của bạn (desktop) — mobile nằm trong sheet điều hướng */}
          <div className="mr-0.5 hidden lg:flex">
            <HomeProvincePicker provinces={provinceNames} value={homeProvince} />
          </div>
          {/* Search (desktop rộng): gợi ý live */}
          <HeaderSearch />
          {/* Search icon (mobile → trước 2xl) */}
          <Link
            href="/tim-kiem"
            aria-label="Tìm kiếm"
            className={`${HEADER_ICON_BTN} 2xl:hidden`}
          >
            <Search className="size-5" />
          </Link>

          {user ? (
            <>
              <span
                aria-hidden
                className="mx-1.5 hidden h-5 w-px bg-border sm:block"
              />
              <DaDenNavLink />
              {/* Lịch trình của tôi (ẩn trên màn rất hẹp — vẫn có trong menu + nút nổi) */}
              <div className="hidden sm:flex">
                <Link
                  href="/lich-trinh"
                  aria-label="Lịch trình của tôi"
                  title="Lịch trình của tôi"
                  className={HEADER_ICON_BTN}
                >
                  <Route className="size-5" />
                </Link>
              </div>
              <NotificationBell
                initialUnread={unread}
                userId={user.id}
                realtimeEnabled={ablyEnabled()}
              />
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
              />
            </>
          ) : (
            <Link
              href="/login"
              className="ml-2 inline-flex h-9 items-center rounded-full bg-warm px-4 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
