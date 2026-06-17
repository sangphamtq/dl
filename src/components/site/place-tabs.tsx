"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
      className={cn(
        "transition-colors",
        pending && "animate-pulse text-primary",
      )}
    >
      {label}
    </span>
  );
}

// Thanh tab sticky: điều hướng giữa trang Place ("Tổng quan") và các trang
// danh sách listing. Chỉ báo active là gạch trượt mượt; tràn thì cuộn ngang.
export function PlaceTabs({ items }: { items: PlaceTab[] }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);

  // Đặt gạch chỉ báo dưới tab active; cập nhật khi đổi route / resize.
  useIsoLayoutEffect(() => {
    const place = () => {
      const node = tabRefs.current[pathname];
      if (node) {
        setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
        node.scrollIntoView({ block: "nearest", inline: "center" });
      } else {
        setIndicator(null);
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname, items]);

  if (items.length <= 1) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav
          ref={navRef}
          className="relative flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
                className={cn(
                  "relative shrink-0 whitespace-nowrap px-3.5 py-3.5 text-sm font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <TabLabel label={it.label} />
              </Link>
            );
          })}

          {/* Gạch chỉ báo trượt */}
          {indicator && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
              style={{
                left: indicator.left + 14,
                width: Math.max(indicator.width - 28, 0),
              }}
            />
          )}
        </nav>
      </div>
    </div>
  );
}
