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
import { HeaderSearch } from "./header-search";
import { SiteNav } from "./site-nav";

const NAV_LINKS = [
  { href: "/diem-den", label: "Điểm đến" },
  { href: "/blog", label: "Cẩm nang" },
  { href: "/cong-dong", label: "Cộng đồng" },
];

export async function SiteHeader() {
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  const user = session?.user;
  const unread = user?.id ? await getUnreadCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <MobileNav links={NAV_LINKS} isAuthed={!!user} />

        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-bold tracking-tight"
        >
          <span className="grid size-9 place-items-center overflow-hidden rounded-xl ring-1 ring-border/60 transition-transform group-hover:-rotate-3">
            <Image
              src="/icon-192.png"
              alt={settings.siteName}
              width={36}
              height={36}
              className="size-full object-cover"
            />
          </span>
          <span className="hidden text-base sm:inline">
            {settings.siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <SiteNav links={NAV_LINKS} className="ml-3 hidden md:flex" />

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
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
              className="inline-flex h-9 items-center rounded-full bg-warm px-4 text-sm font-semibold text-warm-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-warm/90"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
