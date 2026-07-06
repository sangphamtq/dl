"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SectionItem = { id: string; label: string };

// Thanh điều hướng mục dính cho trang địa điểm — nhảy nhanh tới từng mục khi
// bài giới thiệu dài, kèm scroll-spy làm nổi mục đang xem. Style bám sát
// PlaceTabs (trang điểm đến): active gạch chân, dính lên header thì đổ bóng.
export function SpotSectionNav({ items }: { items: SectionItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  // Scroll-spy: mục nào ở ~1/3 trên màn hình thì active.
  useEffect(() => {
    const els = items
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
  }, [items]);

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

  if (items.length <= 1) return null;

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-0" />
      <div
        className={cn(
          "sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg transition-shadow duration-200",
          stuck && "shadow-sm",
        )}
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center px-4 sm:px-6">
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((it) => {
              const isActive = active === it.id;
              return (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  onClick={(e) => jump(e, it.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap px-3 py-3.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {it.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
