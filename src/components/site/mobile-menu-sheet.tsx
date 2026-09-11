"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Info,
  LayoutDashboard,
  LogOut,
  MapPinCheck,
  Route,
  Search,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { HomeProvincePicker } from "./home-province-picker";

const STAFF = ["admin", "editor"];

type NavData = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    role: string | null;
  } | null;
  unread: number;
  provinces: string[];
  homeProvince: string | null;
};

const NAV = [
  { href: "/lich-trinh", label: "Lịch trình mẫu", Icon: CalendarDays },
  { href: "/blog", label: "Cẩm nang", Icon: BookOpen },
  { href: "/gioi-thieu", label: "Giới thiệu", Icon: Info },
];

const MINE = [
  { href: "/thong-bao", label: "Thông báo", Icon: Bell, badgeUnread: true },
  { href: "/tai-khoan/da-den", label: "Đã đến", Icon: MapPinCheck },
  { href: "/lich-trinh/cua-toi", label: "Lịch trình", Icon: Route },
];

export function MobileMenuSheet({
  open,
  onOpenChange,
  onSearch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: () => void;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<NavData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    fetch("/api/nav-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NavData | null) => {
        if (!alive) return;
        setData(d);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [open, loaded]);

  const user = data?.user;
  const close = () => onOpenChange(false);
  const isOn = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="font-heading">
        <DrawerTitle className="sr-only">Menu</DrawerTitle>

        <div className="overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="button"
            onClick={onSearch}
            className="mb-2 flex h-11 w-full items-center gap-2.5 rounded-lg bg-muted px-4 text-sm text-muted-foreground ring-1 ring-inset ring-border/60 transition-colors hover:bg-muted/70 active:scale-[0.99]"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Tìm điểm đến, quán ăn, chỗ ở…</span>
          </button>

          <nav>
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={isOn(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3.5 text-[0.95rem] transition-colors",
                  isOn(href)
                    ? "bg-primary/10 font-semibold text-primary"
                    : "font-medium text-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/60"
                  aria-hidden
                />
              </Link>
            ))}
          </nav>

          <hr className="my-3 border-border/60" />

          {!loaded ? (
            <div className="h-14 animate-pulse rounded-2xl bg-muted" />
          ) : user ? (
            <>
              <Link
                href="/tai-khoan/da-den"
                onClick={close}
                className="flex items-center gap-3 rounded-2xl bg-muted/60 p-2.5 transition-colors hover:bg-muted"
              >
                <Avatar className="size-9">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback>
                    {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {user.name ?? "Tài khoản"}
                  </span>
                  {user.email && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {MINE.map(({ href, label, Icon, badgeUnread }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-xs transition-colors",
                      isOn(href)
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="truncate">{label}</span>
                    {badgeUnread && (data?.unread ?? 0) > 0 && (
                      <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-warm px-1 text-[0.625rem] font-semibold tabular-nums leading-4 text-warm-foreground">
                        {data!.unread > 9 ? "9+" : data!.unread}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {STAFF.includes(user.role ?? "") && (
                <Link
                  href="/cms"
                  onClick={close}
                  className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <LayoutDashboard
                    className="size-5 shrink-0 opacity-70"
                    aria-hidden
                  />
                  <span className="flex-1">Quản trị nội dung</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="flex h-11 items-center justify-center rounded-lg bg-warm text-sm font-semibold text-warm-foreground shadow-sm shadow-warm/25 transition hover:bg-warm/90"
            >
              Đăng nhập
            </Link>
          )}

          {loaded && data && (
            <div className="mt-3 rounded-2xl bg-muted/50 p-3">
              <p className="text-sm font-semibold">Bạn đang ở tỉnh nào?</p>
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                Để gợi ý điểm đến gần và cách di chuyển từ tỉnh của bạn.
              </p>
              <HomeProvincePicker
                full
                provinces={data.provinces}
                value={data.homeProvince}
                onSelected={close}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 text-xs text-muted-foreground">
            {user && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <LogOut className="size-3.5" aria-hidden />
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
