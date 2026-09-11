"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavIcon, type NavIconName } from "@/components/site/nav-icons";
import { Glyph } from "@/components/site/glyphs";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";
import type { PlaceTab } from "@/lib/place-meta";

// Icon của một mục → tên trong bộ `nav-icons` (SVG tự vẽ, KHÔNG phải `Ic`/
// Material Symbols). Cùng bộ với thanh tab dưới và cụm icon header: nét mảnh
// 1.7 trên khung 24, hình mở, và có sẵn cặp VIỀN/ĐẶC để báo mục đang mở —
// đúng cách thanh này vốn đã phân biệt trạng thái.
function iconName(tab: PlaceTab): NavIconName {
  if (tab.icon === "map") return "map";
  if (tab.icon === "community") return "community";
  if (tab.icon === "overview") return "overview";
  switch (tab.href.split("/").pop()) {
    case "dia-diem":
      return "spot";
    case "hoat-dong":
      return "experience";
    case "am-thuc":
      return "food";
    case "luu-tru":
      return "stay";
    case "di-chuyen":
      return "route";
    default:
      return "overview";
  }
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("transition-colors", pending && "animate-pulse text-primary")}>
      {label}
    </span>
  );
}

export function PlaceTabs({
  items,
  place,
}: {
  items: PlaceTab[];
  place?: { slug: string; name: string; image: string | null };
}) {
  const pathname = usePathname();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const navRef = useRef<HTMLElement | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const measure = (nav: HTMLElement | null) => {
    if (!nav) return;
    const left = nav.scrollLeft > 4;
    const right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4;
    setEdge((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  };
  useIsoLayoutEffect(() => {
    const nav = navRef.current;
    const el = tabRefs.current[pathname];
    if (!nav || !el) return;
    const offset =
      el.getBoundingClientRect().left -
      nav.getBoundingClientRect().left +
      nav.scrollLeft;
    nav.scrollTo({ left: offset - (nav.clientWidth - el.clientWidth) / 2 });
  }, [pathname, items]);

  const mapTab = items.find((it) => it.icon === "map");
  const communityTab = items.find((it) => it.icon === "community");
  const navItems = items.filter(
    (it) =>
      it.icon !== "map" &&
      it.icon !== "community" &&
      !(place && it.icon === "overview"),
  );

  if (navItems.length <= 1 && !mapTab && !communityTab) return null;

  return (
    <div className="sticky top-0 lg:top-16 z-40 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 font-heading sm:px-6">
          {place && (
            <>
              <Link
                href={`/diem-den/${place.slug}`}
                className="group -ml-1 flex min-w-0 shrink-0 items-center gap-2 pr-1 text-sm"
                title={`Về tổng quan ${place.name}`}
              >
                <Glyph
                  name="back"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5"
                />
                {place.image && (
                  <span
                    className={cn(
                      R_BADGE,
                      "relative size-7 shrink-0 overflow-hidden bg-muted",
                    )}
                  >
                    <Image
                      src={place.image}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </span>
                )}
                <span className="hidden truncate font-semibold tracking-tight transition-colors group-hover:text-primary sm:block">
                  {place.name}
                </span>
              </Link>
              <span
                aria-hidden
                className="h-5 w-px shrink-0 bg-border/70"
              />
            </>
          )}

          <nav
            ref={(el) => {
              navRef.current = el;
              measure(el);
            }}
            onScroll={(e) => measure(e.currentTarget)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              edge.left && edge.right &&
                "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%_-_2rem),transparent)]",
              edge.left && !edge.right &&
                "[mask-image:linear-gradient(to_right,transparent,black_2rem)]",
              !edge.left && edge.right &&
                "[mask-image:linear-gradient(to_right,black_calc(100%_-_2rem),transparent)]",
            )}
          >
            {navItems.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  ref={(el) => {
                    tabRefs.current[it.href] = el;
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-2.5 text-sm transition-colors lg:h-8",
                    active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  <NavIcon
                    name={iconName(it)}
                    active={active}
                    className={cn(
                      "hidden size-[1.1rem] shrink-0 sm:block",
                      active ? "text-warm" : "opacity-70",
                    )}
                  />
                  <TabLabel label={it.label} />
                </Link>
              );
            })}
          </nav>

          {/* Nhóm bên phải: Cộng đồng + Bản đồ — cùng là route như tab bên trái
              nhưng là "công cụ" xem cả điểm đến. Phân biệt bằng VỊ TRÍ + hairline
              dọc + icon, KHÔNG bằng một khối nền riêng: khối nền làm chúng nặng
              hơn cả tab nội dung. Mobile chỉ còn icon để không giành chỗ dải tab. */}
          {(communityTab || mapTab) && (
            <div className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-3">
              {[communityTab, mapTab].map((tab) => {
                if (!tab) return null;
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    ref={(el) => {
                      tabRefs.current[tab.href] = el;
                    }}
                    aria-current={active ? "page" : undefined}
                    aria-label={tab.label}
                    title={tab.label}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center gap-2 px-2 text-sm transition-colors sm:px-2.5 lg:h-8",
                      active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <NavIcon
                      name={iconName(tab)}
                      active={active}
                      className={cn(
                        "size-[1.1rem] shrink-0",
                        active ? "text-warm" : "opacity-70",
                      )}
                    />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
