"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Item = { href: string; label: string; badge?: string };
type Column = { href: string; title: string; desc?: string; badge?: string };

const WARM_BADGE =
  "h-4 shrink-0 border-transparent bg-warm/15 px-1 text-[0.6rem] font-semibold leading-none text-warm";

// Nhóm nav dạng dropdown: mở khi hover/focus, đóng khi rời chuột hoặc click.
// State JS (không dựa :focus-within) để click xong không bị "pin". Hai kiểu panel:
// danh sách (items) hoặc mega-menu thẻ theo cột (columns).
export function NavGroupMenu({
  label,
  href,
  items,
  columns,
}: {
  label: string;
  href: string;
  items?: Item[];
  columns?: Column[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (h: string) =>
    pathname === h || pathname.startsWith(`${h}/`);
  const active = (items ?? columns ?? []).some((t) => isActive(t.href));

  return (
    <div
      className="relative flex h-full items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        onClick={() => setOpen(false)}
        className={cn(
          "relative flex h-full items-center gap-1 pl-3 pr-2.5 text-sm font-medium transition-colors",
          active
            ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
            : open
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            open ? "rotate-180 text-foreground" : "text-muted-foreground",
          )}
          aria-hidden
        />
      </Link>

      {/* pt-2 = "cầu" hover liền mạch giữa nhãn và panel */}
      <div
        className={cn(
          "absolute left-0 top-full z-50 pt-2 transition-opacity duration-100",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {columns ? (
          // Mega-menu: mỗi cột là một thẻ danh mục
          <div className="flex gap-1 rounded-2xl border border-border/60 bg-popover p-2 shadow-lg shadow-black/5">
            {columns.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex w-48 flex-col gap-0.5 rounded-xl px-3 py-2.5 transition-colors",
                  isActive(c.href) ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {c.title}
                  {c.badge && <Badge className={WARM_BADGE}>{c.badge}</Badge>}
                </span>
                {c.desc && (
                  <span className="text-xs leading-snug text-muted-foreground">
                    {c.desc}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          // Danh sách đơn cột
          <div className="min-w-[11rem] rounded-2xl border border-border/60 bg-popover p-1.5 shadow-lg shadow-black/5">
            {items?.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive(i.href)
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {i.label}
                {i.badge && <Badge className={WARM_BADGE}>{i.badge}</Badge>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
