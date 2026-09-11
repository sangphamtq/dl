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

const NAV: NavEntry[] = [
  {
    href: "/diem-den",
    label: "Điểm đến",
    include: ["/dia-diem", "/ban-do"],
  },
  {
    href: "/lich-trinh",
    label: "Lịch trình mẫu",
    exclude: ["/lich-trinh/cua-toi", "/lich-trinh/s"],
  },
  { href: "/blog", label: "Cẩm nang" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

const MOBILE_LINKS: NavLink[] = NAV as NavLink[];

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
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-1 px-4 [text-shadow:0_1px_2px_rgb(0_0_0/0.28)] group-data-[tone=light]/header:[text-shadow:none] sm:gap-2 sm:px-6">
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <MobileNav
            links={MOBILE_LINKS}
            isAuthed={!!user}
            provinces={provinceNames}
            homeProvince={homeProvince}
          />

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

        <SiteNav entries={NAV} className="hidden lg:ml-3 lg:flex xl:ml-6" />

        <TooltipProvider delayDuration={300}>
        <div className="flex flex-1 items-center justify-end gap-1">
          <HeaderSearch />

          {user ? (
            <>
              <span aria-hidden className="mx-1.5 h-6 w-px bg-foreground/25" />
              <div className="flex items-center gap-0.5">
                <DaDenNavLink />
                <div className="hidden sm:flex">
                  <LichTrinhNavLink />
                </div>
                <NotificationBell
                  initialUnread={unread}
                  userId={user.id}
                  realtimeEnabled={ablyEnabled()}
                />
              </div>
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
            <Link
              href="/login"
              className="ml-1.5 inline-flex h-10 items-center rounded-lg bg-brand px-4.5 text-sm font-semibold text-brand-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(0_0_0/0.18)] transition-[background-color,transform] duration-200 [text-shadow:none] hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
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
