import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  href,
  count,
  unit,
  linkLabel,
  actions,
  size = "lead",
  serif = false,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string;
  linkLabel?: string;
  actions?: React.ReactNode;
  size?: "lead" | "minor";
  serif?: boolean;
}) {
  const link = href && (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 transition-colors",
        serif
          ? "text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          : "text-sm font-medium text-primary hover:text-primary/80",
      )}
    >
      <span>
        {linkLabel ?? "Xem tất cả"}
        {count != null && (
          <span className="tabular-nums">
            {" "}
            {count}
            {unit ? ` ${unit}` : ""}
          </span>
        )}
      </span>
      <Ic
        icon="arrow-right"
        className="size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2
        className={cn(
          "min-w-0 text-foreground",
          serif
            ? "font-[family-name:var(--font-display)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]"
            : "font-[family-name:var(--font-display)] font-bold leading-[1.15] tracking-[-0.03em]",
          size === "lead"
            ? serif
              ? "text-[clamp(1.375rem,2.8vw,2rem)]"
              : "text-[clamp(1.75rem,3.2vw,2.5rem)]"
            : serif
              ? "text-lg sm:text-xl"
              : "text-xl sm:text-2xl",
        )}
      >
        {title}
      </h2>
      {(actions || href) && (
        <div className="flex shrink-0 items-center gap-4">
          {actions}
          {link}
        </div>
      )}
    </div>
  );
}
