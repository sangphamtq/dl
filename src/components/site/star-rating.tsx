import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Hiển thị sao (0–5) với sao lẻ (fill theo %). Thuần — dùng được ở server & client.
// value: số sao (vd 3.7). size: class kích thước icon. showValue: hiện số bên cạnh.
export function StarRating({
  value,
  size = "size-4",
  showValue = false,
  className,
}: {
  value: number;
  size?: string;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex" aria-hidden>
        {/* Nền: 5 sao rỗng */}
        <span className="flex text-muted-foreground/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={size} />
          ))}
        </span>
        {/* Lớp phủ: 5 sao đầy, cắt theo % */}
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-warm"
          style={{ width: `${pct}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn(size, "shrink-0 fill-current")} />
          ))}
        </span>
      </span>
      {showValue && (
        <span className="text-sm font-semibold tabular-nums">
          {value.toFixed(1).replace(".", ",")}
        </span>
      )}
    </span>
  );
}
