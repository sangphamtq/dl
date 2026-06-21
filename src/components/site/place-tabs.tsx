"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutGrid, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceTab } from "@/lib/place-meta";
import {
  PlaceVideoTabButton,
  type PlaceVideo,
} from "@/components/site/tiktok-videos";

// useLayoutEffect chạy được ở client; tránh cảnh báo khi SSR.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Nhãn tab — khi đang điều hướng tới tab này thì sáng lên + nhấp nháy nhẹ.
function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn("transition-colors", pending && "animate-pulse text-primary")}
    >
      {label}
    </span>
  );
}

// Thanh tab sticky: điều hướng giữa trang Place và các trang danh sách listing.
// Active phân biệt bằng màu chữ; tràn thì cuộn ngang (tab active tự vào tầm nhìn).
export function PlaceTabs({
  items,
  videos = [],
  placeName = "",
}: {
  items: PlaceTab[];
  videos?: PlaceVideo[];
  placeName?: string;
}) {
  const pathname = usePathname();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Nút Video chỉ hiện khi thanh đã "dính" (cuộn qua hero) — đầu trang hero
  // đã có card video rồi nên khỏi trùng.
  const [stuck, setStuck] = useState(false);

  // Cuộn tab active vào giữa khi đổi route.
  useIsoLayoutEffect(() => {
    tabRefs.current[pathname]?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [pathname, items]);

  // Sentinel ngay trên thanh: khi nó vượt lên trên mốc dính (top-16 = 64px)
  // → thanh đang ghim → bật nút.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Tab Bản đồ tách riêng → render thành nút nổi bật bên phải (không cuộn mất).
  const mapTab = items.find((it) => it.icon === "map");
  const navItems = items.filter((it) => it.icon !== "map");

  // Có ít nhất 2 tab, hoặc có video/bản đồ để gắn nút → mới hiện thanh.
  if (navItems.length <= 1 && videos.length === 0 && !mapTab) return null;

  return (
    <>
    <div ref={sentinelRef} aria-hidden className="h-0" />
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6">
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                aria-label={it.icon ? it.label : undefined}
                title={it.icon ? it.label : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap py-3.5 text-sm font-medium transition-colors",
                  it.icon ? "px-3" : "px-3.5",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {it.icon === "overview" ? (
                  <LayoutGrid className="size-4" aria-hidden />
                ) : (
                  <TabLabel label={it.label} />
                )}
              </Link>
            );
          })}
        </nav>
        {/* Nhóm bên phải: Video (trái) + Bản đồ (ngoài cùng phải) */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <PlaceVideoTabButton
            videos={videos}
            placeName={placeName}
            className={cn(
              "transition-all duration-300",
              stuck
                ? "translate-x-0 opacity-100"
                : "pointer-events-none translate-x-2 opacity-0",
            )}
          />
          {mapTab && (
            <Link
              href={mapTab.href}
              ref={(el) => {
                tabRefs.current[mapTab.href] = el;
              }}
              aria-current={pathname === mapTab.href ? "page" : undefined}
              className={cn(
                "group inline-flex shrink-0 items-center gap-2 rounded-full border bg-card/70 py-1 pl-1 pr-3 shadow-sm shadow-black/5 backdrop-blur transition-all hover:-translate-y-px hover:shadow-md",
                pathname === mapTab.href
                  ? "border-primary/50"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                <MapPinned className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{mapTab.label}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
