"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { R_BADGE } from "@/lib/radius";
import { PROVINCE_NAME_BY_SLUG } from "@/lib/provinces";
import { VN_MAP_PATHS } from "./vietnam-map-paths";
import { VN_ISLANDS, VN_MAP_VIEWBOX_WIDE } from "./vietnam-islands";

// Bản đồ Việt Nam — tối giản: đất một tông xám ấm, tỉnh đã đến tô cam, cả khối
// có bóng đổ mềm để tạo chiều sâu. Hover hiện tên tỉnh, nhãn bám trên vùng tỉnh.
export function VietnamMap({
  visited,
  accent,
  className,
  onToggle,
}: {
  visited: Set<string>;
  /** Màu tô tỉnh đã đến — người dùng tự chọn, lưu ở `User.mapCardOptions`. */
  accent: string;
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
                // Màu tô của tỉnh ĐÃ ĐẾN là một hex tuỳ người dùng nên phải
                // đi qua `style`, không qua class. Kéo theo: trạng thái rê
                // chuột đổi bằng ĐỘ MỜ chứ không bằng một class màu thứ hai —
                // `hover:fill-*` không biết gì về hex đó.
                style={isVisited ? { fill: accent } : undefined}
                className={cn(
                  "stroke-background duration-200 [stroke-width:0.7]",
                  onToggle && "cursor-pointer",
                  isVisited
                    ? "transition-opacity hover:opacity-85"
                    : "fill-stone-200 transition-colors hover:fill-stone-300 dark:fill-stone-700/70 dark:hover:fill-stone-600",
                )}
              >
                {/* MỘT chuỗi duy nhất, ghép sẵn trong JS — KHÔNG để hai biểu
                    thức con cạnh nhau trong `<title>`. Bản trước làm vậy và nó
                    là nguồn của một lỗi hydration im lặng trên cả trang: hai
                    child liền nhau thì React SSR phải chèn dấu ngăn giữa chúng,
                    mà `<title>` của SVG không giữ được dấu ngăn đó, nên cây
                    client không khớp cây server và React dựng lại toàn bộ nhánh
                    (hiện thành "1 Issue" trong overlay dev). Nhánh
                    `isVisited ? … : ""` còn góp thêm: chuỗi rỗng không sinh ra
                    node nào ở server nhưng client vẫn chờ một node. */}
                <title>{`${PROVINCE_NAME_BY_SLUG[slug] ?? slug}${isVisited ? " — đã đến" : ""}`}</title>
              </path>
            );
          })}
        </g>
      </svg>

      {hover && pos && (
        // Nhãn rê chuột: viên VUÔNG nền MỰC ĐẶC. Bản trước là
        // `rounded-full` + `bg-card/95` + viền + bóng + `backdrop-blur` — vừa
        // lạc bộ bo góc, vừa khai độ nổi ba lần cho một mẩu chữ 12px, mà nền
        // mờ thì đọc lem nhem đúng lúc nó nằm trên vùng cam của tỉnh đã đến.
        <div
          className={cn(
            R_BADGE,
            "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap bg-foreground px-2 py-1 text-xs font-medium text-background shadow-sm",
          )}
          style={{ left: pos.x, top: pos.y }}
        >
          {PROVINCE_NAME_BY_SLUG[hover] ?? hover}
          {visited.has(hover) && (
            <span className="ml-2 font-semibold text-warm-bright">đã đến</span>
          )}
        </div>
      )}
    </div>
  );
}
