import Link from "next/link";

// Tiêu đề section trang Place: tên + số lượng (cạnh tên) + link "Xem tất cả"
// gạch chân mảnh. Dùng chung mọi section để nhất quán.
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
          className="shrink-0 text-sm text-muted-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Xem tất cả
          {count != null && (
            <span className="tabular-nums">
              {" "}
              {count}
              {unit ? ` ${unit}` : ""}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
