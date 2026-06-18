"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceTab } from "@/lib/place-meta";

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
export function PlaceTabs({ items }: { items: PlaceTab[] }) {
  const pathname = usePathname();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Cuộn tab active vào giữa khi đổi route.
  useIsoLayoutEffect(() => {
    tabRefs.current[pathname]?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [pathname, items]);

  if (items.length <= 1) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
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
                {it.icon ? (
                  <LayoutGrid className="size-4" aria-hidden />
                ) : (
                  <TabLabel label={it.label} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
