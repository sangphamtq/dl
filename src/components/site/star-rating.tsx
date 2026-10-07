import { cn } from "@/lib/utils";

// Sao ĐẶC tự vẽ: bộ icon dùng chung chỉ có `star` dạng VIỀN (path có lỗ bên
// trong) nên `fill-current` không tô kín được.
function SolidStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

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
        <span className="flex text-muted-foreground/25">
          {Array.from({ length: 5 }).map((_, i) => (
            <SolidStar key={i} className={size} />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-warm"
          style={{ width: `${pct}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <SolidStar key={i} className={cn(size, "shrink-0")} />
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
