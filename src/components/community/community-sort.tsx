import Link from "next/link";
import { ArrowDownWideNarrow } from "@/components/icons";
import { cn } from "@/lib/utils";
import { THREAD_SORTS } from "@/lib/community";

// Chọn cách sắp xếp feed: theo cập nhật / theo ngày tạo.
export function CommunitySort({
  current,
  hrefFor,
}: {
  current: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 text-sm">
      <ArrowDownWideNarrow
        className="size-4 text-muted-foreground"
        aria-hidden
      />
      {THREAD_SORTS.map((s) => (
        <Link
          key={s.value}
          href={hrefFor(s.value)}
          scroll={false}
          className={cn(
            "rounded-lg px-2 py-1 transition-colors",
            current === s.value
              ? "font-medium text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
