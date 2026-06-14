import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [
  { href: "/diem-den", label: "Điểm đến" },
  { href: "/blog", label: "Cẩm nang" },
];

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <MobileNav links={NAV_LINKS} isAuthed={!!user} />

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Image
            src="/icon-192.png"
            alt="Hành Trình Việt"
            width={32}
            height={32}
            className="size-8 rounded-lg"
          />
          <span className="hidden sm:inline">Hành Trình Việt</span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Search pill (desktop) */}
          <Link
            href="/diem-den"
            className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          >
            <Search className="size-4" aria-hidden />
            Tìm điểm đến…
          </Link>
          {/* Search icon (mobile/tablet) */}
          <Link
            href="/diem-den"
            aria-label="Tìm kiếm"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "lg:hidden",
            )}
          >
            <Search className="size-5" />
          </Link>

          {user ? (
            <UserMenu
              user={{
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
              }}
            />
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
