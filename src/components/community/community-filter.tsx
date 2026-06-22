import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { THREAD_TYPES } from "@/lib/community";
import { threadTypeIcon } from "./thread-type-badge";

// Hàng lọc theo loại bài — pill trung tính, active dùng tông primary.
export function CommunityFilter({
  current,
  counts,
  hrefFor,
}: {
  current: string; // "all" | type
  counts: (value: string) => number;
  hrefFor: (value: string) => string;
}) {
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors";
  const cls = (active: boolean) =>
    cn(
      base,
      active
        ? "border-transparent bg-primary/10 text-primary"
        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
    );

  const items = [
    { value: "all", label: "Tất cả", Icon: LayoutGrid },
    ...THREAD_TYPES.map((t) => ({
      value: t.value,
      label: t.label,
      Icon: threadTypeIcon(t.value),
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(({ value, label, Icon }) => (
        <Link
          key={value}
          href={hrefFor(value)}
          scroll={false}
          className={cls(current === value)}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
          <span className="text-xs opacity-60">{counts(value)}</span>
        </Link>
      ))}
    </div>
  );
}
