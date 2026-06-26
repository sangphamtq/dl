"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PROVINCE_NAME_BY_SLUG } from "@/lib/provinces";
import { VN_MAP_PATHS } from "./vietnam-map-paths";
import { VN_ISLANDS, VN_MAP_VIEWBOX_WIDE } from "./vietnam-islands";

// Bản đồ Việt Nam — tối giản: đất một tông xám ấm, tỉnh đã đến tô cam, cả khối
// có bóng đổ mềm để tạo chiều sâu. Hover hiện tên tỉnh, nhãn bám trên vùng tỉnh.
export function VietnamMap({
  visited,
  className,
  onToggle,
}: {
  visited: Set<string>;
  className?: string;
  onToggle?: (slug: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function enter(slug: string, e: React.MouseEvent<SVGPathElement>) {
    const wrap = wrapRef.current?.getBoundingClientRect();
    if (wrap) {
      const r = e.currentTarget.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2 - wrap.left, y: r.top - wrap.top });
    }
    setHover(slug);
  }
  function clear() {
    setHover(null);
    setPos(null);
  }

  const shapes = [
    ...VN_MAP_PATHS,
    ...VN_ISLANDS.map((i) => ({ slug: i.parentSlug, d: i.d })),
  ];

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <svg
        viewBox={VN_MAP_VIEWBOX_WIDE}
        role="img"
        aria-label="Bản đồ các tỉnh thành Việt Nam đã đến"
        className="h-auto w-full"
      >
        <defs>
          <filter id="vn-shadow" x="-6%" y="-3%" width="112%" height="110%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="5"
              floodColor="#0f172a"
              floodOpacity="0.12"
            />
          </filter>
        </defs>

        <g filter="url(#vn-shadow)">
          {shapes.map(({ slug, d }, i) => {
            const isVisited = visited.has(slug);
            return (
              <path
                key={`${slug}-${i}`}
                d={d}
                data-slug={slug}
                onMouseEnter={(e) => enter(slug, e)}
                onMouseLeave={clear}
                onClick={onToggle ? () => onToggle(slug) : undefined}
                className={cn(
                  "stroke-background transition-colors duration-200 [stroke-width:0.7]",
                  onToggle && "cursor-pointer",
                  isVisited
                    ? "fill-warm hover:fill-warm/90"
                    : "fill-stone-200 hover:fill-stone-300 dark:fill-stone-700/70 dark:hover:fill-stone-600",
                )}
              >
                <title>
                  {PROVINCE_NAME_BY_SLUG[slug] ?? slug}
                  {isVisited ? " — đã đến" : ""}
                </title>
              </path>
            );
          })}
        </g>
      </svg>

      {hover && pos && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-full border border-border/60 bg-card/95 px-2.5 py-1 text-xs font-medium shadow-md backdrop-blur"
          style={{ left: pos.x, top: pos.y }}
        >
          {PROVINCE_NAME_BY_SLUG[hover] ?? hover}
          {visited.has(hover) && <span className="ml-1.5 text-warm">• đã đến</span>}
        </div>
      )}
    </div>
  );
}
