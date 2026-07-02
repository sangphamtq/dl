import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { getUnreadCount } from "@/lib/notifications";
import { ablyEnabled } from "@/lib/ably";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { DaDenNavLink } from "./da-den-nav-link";
import { HeaderSearch } from "./header-search";
import { HeaderShell } from "./header-shell";
import { SiteNav } from "./site-nav";

const NAV_LINKS = [
  { href: "/diem-den", label: "Điểm đến" },
  { href: "/blog", label: "Cẩm nang" },
  { href: "/cong-dong", label: "Cộng đồng" },
  { href: "/sale", label: "Cộng tác viên" },
  { href: "/kiem-tra", label: "Kiểm tra uy tín" },
];

export async function SiteHeader() {
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  const user = session?.user;
  const unread = user?.id ? await getUnreadCount(user.id) : 0;

  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <MobileNav links={NAV_LINKS} isAuthed={!!user} />

        {/* Logo */}
        <Link
          href="/"
          aria-label={settings.siteName}
          className="group mr-1 flex shrink-0 items-center gap-2.5"
        >
          <span className="grid size-9 place-items-center overflow-hidden rounded-xl shadow-sm ring-1 ring-border/70 transition duration-300 group-hover:-rotate-6 group-hover:ring-primary/50">
            <Image
              src="/icon-192.png"
              alt=""
              width={36}
              height={36}
              className="size-full object-cover"
            />
          </span>
          <span className="hidden text-[15px] font-bold leading-none tracking-tight text-foreground sm:inline">
            {settings.siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <SiteNav links={NAV_LINKS} className="hidden md:flex" />

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {/* Search (desktop): gợi ý live */}
          <HeaderSearch />
          {/* Search icon (mobile/tablet) */}
          <Link
            href="/tim-kiem"
            aria-label="Tìm kiếm"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "rounded-full lg:hidden",
            )}
          >
            <Search className="size-5" />
          </Link>

          {user ? (
            <>
              <DaDenNavLink />
              <NotificationBell
                initialUnread={unread}
                userId={user.id}
                realtimeEnabled={ablyEnabled()}
              />
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
              className="ml-1 inline-flex h-9 items-center rounded-full bg-warm px-4 text-sm font-semibold text-warm-foreground shadow-sm shadow-warm/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-warm/90 hover:shadow-md hover:shadow-warm/30"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
