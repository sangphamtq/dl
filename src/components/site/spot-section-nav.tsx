"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPinned, MessagesSquare } from "@/components/icons";
import { cn } from "@/lib/utils";

// id = mục cuộn trong trang (anchor). href = mục điều hướng sang trang khác.
// icon = mục nút đặc biệt render BÊN PHẢI thanh (Cộng đồng / Bản đồ) kèm icon,
// giống PlaceTabs bên điểm đến.
export type SectionItem = {
  id: string;
  label: string;
  href?: string;
  icon?: "map" | "community";
};

// Thanh điều hướng mục dính cho trang địa điểm — nhảy nhanh tới từng mục khi
// bài giới thiệu dài, kèm scroll-spy làm nổi mục đang xem. Style bám sát
// PlaceTabs (trang điểm đến): mục thường gạch chân, nhóm Cộng đồng/Bản đồ tách
// riêng bên phải (có icon). currentId: khi ở trang con (vd cộng đồng), ép mục
// đó active và tắt scroll-spy.
export function SpotSectionNav({
  items,
  currentId,
}: {
  items: SectionItem[];
  currentId?: string;
}) {
  const [active, setActive] = useState(currentId ?? items[0]?.id ?? "");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  // Mục thường (bên trái) vs mục nút icon (bên phải).
  const navItems = items.filter((it) => !it.icon);
  const communityItem = items.find((it) => it.icon === "community");
  const mapItem = items.find((it) => it.icon === "map");

  // Scroll-spy: mục nào ở ~1/3 trên màn hình thì active. Tắt khi ở trang con
  // (currentId set) vì các anchor không nằm trên trang này.
  useEffect(() => {
    if (currentId) return;
    const els = navItems
      .filter((i) => !i.href)
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el != null);
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [navItems, currentId]);

  // Sentinel ngay trên thanh: khi nó vượt lên trên mốc dính (top-16 = 64px)
  // → thanh đang ghim dưới header → thêm bóng mềm (giống PlaceTabs).
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

  if (navItems.length <= 1 && !communityItem && !mapItem) return null;

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  const itemClass = (isActive: boolean) =>
    cn(
      "relative shrink-0 whitespace-nowrap px-3 py-3.5 text-sm font-medium transition-colors",
      isActive
        ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
        : "text-muted-foreground hover:text-foreground",
    );
  const rightClass = (isActive: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 py-3.5 text-sm font-medium transition-colors",
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-0" />
      <div
        className={cn(
          "sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg transition-shadow duration-200",
          stuck && "shadow-sm",
        )}
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((it) => {
              const isActive = active === it.id;
              // Mục điều hướng sang trang khác → Link thật (không cuộn).
              if (it.href) {
                return (
                  <Link
                    key={it.id}
                    href={it.href}
                    aria-current={isActive ? "true" : undefined}
                    className={itemClass(isActive)}
                  >
                    {it.label}
                  </Link>
                );
              }
              // Mục cuộn trong trang (anchor).
              return (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  onClick={(e) => jump(e, it.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={itemClass(isActive)}
                >
                  {it.label}
                </a>
              );
            })}
          </nav>

          {/* Nhóm bên phải: Cộng đồng + Bản đồ (có icon), giống điểm đến */}
          {(communityItem || mapItem) && (
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {communityItem && (
                <Link
                  href={communityItem.href ?? "#"}
                  aria-current={active === communityItem.id ? "true" : undefined}
                  className={rightClass(active === communityItem.id)}
                >
                  <MessagesSquare className="size-4" aria-hidden />
                  {communityItem.label}
                </Link>
              )}
              {mapItem && (
                <Link
                  href={mapItem.href ?? "#"}
                  aria-current={active === mapItem.id ? "true" : undefined}
                  className={rightClass(active === mapItem.id)}
                >
                  <MapPinned className="size-4" aria-hidden />
                  {mapItem.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
