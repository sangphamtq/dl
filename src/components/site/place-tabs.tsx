"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MapPinned, MessagesSquare } from "@/components/icons";
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

  // Bản đồ + Cộng đồng tách riêng → render bên phải (không cuộn mất).
  const mapTab = items.find((it) => it.icon === "map");
  const communityTab = items.find((it) => it.icon === "community");
  const navItems = items.filter(
    (it) => it.icon !== "map" && it.icon !== "community",
  );

  // Có ít nhất 2 tab, hoặc có bản đồ/cộng đồng để gắn nút → mới hiện thanh.
  if (navItems.length <= 1 && !mapTab && !communityTab) return null;

  return (
    <>
    <div ref={sentinelRef} aria-hidden className="h-0" />
    {/* Hero đã bỏ viền → hairline dưới thanh tab là đường phân cách duy nhất (luôn hiện).
        Khi đã dính lên dưới header: thêm bóng mềm để nổi khỏi nội dung cuộn. */}
    <div
      className={cn(
        "sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg transition-shadow duration-200",
        stuck && "shadow-sm",
      )}
    >
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* flex-1 để dải tab luôn chiếm hết phần trống → lớp mask chỉ ăn vào
            khoảng trống khi chưa tràn, và fade đúng chữ khi tràn. */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,black_calc(100%_-_2rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  "relative shrink-0 whitespace-nowrap px-3 py-3.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <TabLabel label={it.label} />
              </Link>
            );
          })}
        </nav>
        {/* Nhóm bên phải: Cộng đồng + Bản đồ — cùng là route như tab bên trái
            nhưng là "công cụ" xem cả điểm đến, nên gom thành segmented liền
            khối (nền track + viên nổi cho mục đang mở) thay vì gạch chân như
            tab nội dung; bản thân khối track đã đủ tách hai vùng, khỏi cần
            hairline. Mobile chỉ còn icon để không giành chỗ của dải tab.
            Nút Video đã bỏ khỏi thanh này — video giờ phát thẳng trong mục
            "Đôi nét" của trang Place. */}
        {(communityTab || mapTab) && (
          <div className="flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-muted p-0.5 ring-1 ring-inset ring-border/60">
            {[communityTab, mapTab].map((tab) => {
              if (!tab) return null;
              const active = pathname === tab.href;
              const Icon = tab.icon === "map" ? MapPinned : MessagesSquare;
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
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors sm:px-3",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active && "text-primary",
                    )}
                    aria-hidden
                  />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
