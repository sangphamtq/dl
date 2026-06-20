"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type SectionItem = { id: string; label: string };

// Thanh điều hướng mục dính cho trang địa điểm — nhảy nhanh tới từng mục khi
// bài giới thiệu dài, kèm scroll-spy làm nổi mục đang xem.
export function SpotSectionNav({ items }: { items: SectionItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

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
      // Dải kích hoạt mỏng quanh ~1/3 trên màn hình.
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

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
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <a
              key={it.id}
              href={`#${it.id}`}
              onClick={(e) => jump(e, it.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap px-3.5 py-3.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {it.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
