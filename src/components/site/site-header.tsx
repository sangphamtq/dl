import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { getUnreadCount } from "@/lib/notifications";
import { ablyEnabled } from "@/lib/ably";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { DaDenNavLink } from "./da-den-nav-link";
import { HeaderSearch } from "./header-search";
import { SiteNav } from "./site-nav";

const NAV_LINKS = [
  { href: "/diem-den", label: "Điểm đến" },
  { href: "/blog", label: "Cẩm nang" },
  { href: "/cong-dong", label: "Cộng đồng" },
  { href: "/sale", label: "Cộng tác viên" },
  { href: "/kiem-tra", label: "Kiểm tra uy tín" },
];

// Ngôn ngữ chung cho mọi nút biểu tượng bên phải (search, đã đến, chuông) —
// giữ cụm tiện ích đồng nhất một kiểu.
export const HEADER_ICON_BTN =
  "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export async function SiteHeader() {
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  const user = session?.user;
  const unread = user?.id ? await getUnreadCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <MobileNav links={NAV_LINKS} isAuthed={!!user} />

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
        <SiteNav links={NAV_LINKS} className="hidden md:flex" />

        {/* Right side — cụm tiện ích: tìm kiếm | tài khoản */}
        <div className="ml-auto flex items-center gap-0.5">
          {/* Search (desktop): gợi ý live */}
          <HeaderSearch />
          {/* Search icon (mobile/tablet) */}
          <Link
            href="/tim-kiem"
            aria-label="Tìm kiếm"
            className={`${HEADER_ICON_BTN} lg:hidden`}
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
