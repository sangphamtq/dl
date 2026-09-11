"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavIcon, type NavIconName } from "./nav-icons";
import { CommandPalette } from "./command-palette";
import { MobileMenuSheet } from "./mobile-menu-sheet";
import { cn } from "@/lib/utils";

const HIDDEN_ON = ["/cms", "/sale", "/login", "/offline"];

type Item = {
  label: string;
  icon: NavIconName;
} & (
  | {
      href: string;
      exact?: boolean;
      match?: string[];
      action?: never;
    }
  | {
      /** Mục hành động: mở lớp phủ, KHÔNG đổi trang. */
      action: "menu";
      href?: never;
    }
);

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Trang chủ",
    icon: "home",
    exact: true,
  },
  {
    href: "/diem-den",
    label: "Khám phá",
    icon: "compass",
    match: [
      "/diem-den",
      "/dia-diem",
      "/hoat-dong",
      "/luu-tru",
      "/trai-nghiem",
      "/tim-kiem",
    ],
  },
  {
    href: "/ban-do",
    label: "Bản đồ",
    icon: "map",
  },
  { action: "menu", label: "Menu", icon: "menu" },
];

function isActive(pathname: string, it: Item) {
  if (!it.href) return false;
  if (it.exact) return pathname === it.href;
  const prefixes = it.match ?? [it.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  const hidden = HIDDEN_ON.some((p) => pathname.startsWith(p));
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (hidden) return;
    const el = document.documentElement;
    el.dataset.bottomNav = "";
    return () => {
      delete el.dataset.bottomNav;
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const el = document.documentElement;

    const update = () => {
      const covered = Math.round(el.clientHeight - vv.height - vv.offsetTop);
      const chrome = covered > 0 && covered < 160 ? covered : 0;
      el.style.setProperty("--browser-bottom-chrome", `${chrome}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.removeProperty("--browser-bottom-chrome");
    };
  }, [hidden]);

  if (hidden) return null;

  // Trang bản đồ cao đúng 100dvh và KHÔNG cuộn (/ban-do và
  // /diem-den/[slug]/ban-do) — độn thêm chỗ trống ở đó chỉ tạo ra một quãng cuộn
  // thừa. Thanh tab nổi đè lên bản đồ, đúng kiểu app bản đồ.
  const overlayOnly = pathname.endsWith("/ban-do");

  return (
    <>
      {!overlayOnly && (
        <div
          aria-hidden
          className="h-[calc(3.125rem+max(env(safe-area-inset-bottom),0.5rem)+0.375rem)] shrink-0 lg:hidden"
        />
      )}

      <nav
        aria-label="Điều hướng nhanh"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 lg:hidden",
          "bg-background/95 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150",
          "pb-[calc(max(env(safe-area-inset-bottom),0.5rem)+0.375rem+var(--browser-bottom-chrome,0px))]",
        )}
      >
        <ul className="flex h-[3.0625rem] items-stretch">
          {ITEMS.map((it) => {
            const active = it.action ? menu : isActive(pathname, it);
            const inner = (
              <>
                <NavIcon
                  name={it.icon}
                  active={active}
                  className="size-[1.5625rem] shrink-0"
                />
                <span className="text-[0.625rem] font-medium leading-none tracking-[-0.01em]">
                  {it.label}
                </span>
              </>
            );
            const klass = cn(
              "flex h-full w-full flex-col items-center justify-center gap-[3px] transition-opacity duration-100 active:opacity-50",
              active ? "text-primary" : "text-muted-foreground",
            );

            return (
              <li key={it.href ?? it.action} className="flex-1">
                {it.action ? (
                  <button
                    type="button"
                    onClick={() => setMenu(true)}
                    aria-expanded={active}
                    aria-label={it.label}
                    className={klass}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={klass}
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <CommandPalette open={search} onOpenChange={setSearch} />
      <MobileMenuSheet
        open={menu}
        onOpenChange={setMenu}
        onSearch={() => {
          setMenu(false);
          setTimeout(() => setSearch(true), 220);
        }}
      />
    </>
  );
}
