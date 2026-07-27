"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/toc";

// Mục lục — khối tint bên trong thẻ summary (bám style trang tham khảo):
// nền #f7faf6, tiêu đề "Mục lục", link mờ, mục đang đọc đậm + gạch chân.
export function ArticleTocBox({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Mục lục"
      className="mt-4 rounded-xl bg-[#f7faf6] p-5 dark:bg-white/5"
    >
      <p className="text-[1.25rem] font-bold leading-tight text-[#2e2e2e] dark:text-white">
        Mục lục
      </p>
      <ol className="mt-3 space-y-2">
        {(() => {
          let n = 0;
          return items.map((it) => {
            const num = it.level !== 3 ? ++n : null;
            return (
              <li key={it.id} className={it.level === 3 ? "ml-4" : ""}>
                <a
                  href={`#${it.id}`}
                  className={cn(
                    "flex gap-2 text-base leading-snug transition-colors",
                    active === it.id
                      ? "font-medium text-[#2e2e2e] underline dark:text-white"
                      : "text-[#2e2e2e]/40 hover:text-[#2e2e2e] hover:underline dark:text-white/40 dark:hover:text-white",
                  )}
                >
                  {num !== null && <span className="shrink-0 tabular-nums">{num}.</span>}
                  <span>{it.text}</span>
                </a>
              </li>
            );
          });
        })()}
      </ol>
    </nav>
  );
}
