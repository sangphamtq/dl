import Link from "next/link";
import { Ic } from "@/components/icon";

// Tiêu đề section trang Place: tên đậm + link "Xem tất cả →" turquoise (khớp
// phong cách trang chủ). Dùng chung mọi section để nhất quán.
export function SectionHeading({
  title,
  href,
  count,
  unit,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string; // đơn vị đi kèm số trong link, vd "địa điểm" → "Xem tất cả 8 địa điểm"
}) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
        >
          Xem tất cả
          {count != null && (
            <span className="tabular-nums">
              {" "}
              {count}
              {unit ? ` ${unit}` : ""}
            </span>
          )}
          <Ic
            icon="arrow-right"
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}
