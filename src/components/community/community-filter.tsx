import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { THREAD_TYPES } from "@/lib/community";
import { threadTypeIcon } from "./thread-type-badge";

// Hàng lọc theo loại bài — dạng segmented: active tô đặc primary, còn lại ghost.
export function CommunityFilter({
  current,
  counts,
  hrefFor,
}: {
  current: string; // "all" | type
  counts: (value: string) => number;
  hrefFor: (value: string) => string;
}) {
  const items = [
    { value: "all", label: "Tất cả", Icon: LayoutGrid },
    ...THREAD_TYPES.map((t) => ({
      value: t.value,
      label: t.label,
      Icon: threadTypeIcon(t.value),
    })),
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(({ value, label, Icon }) => {
        const active = current === value;
        const n = counts(value);
        return (
          <Link
            key={value}
            href={hrefFor(value)}
            scroll={false}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
            <span
              className={cn(
                "text-xs tabular-nums",
                active ? "text-primary-foreground/70" : "opacity-60",
              )}
            >
              {n}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
