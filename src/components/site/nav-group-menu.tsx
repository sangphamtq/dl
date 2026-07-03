"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
          "flex h-full items-center gap-1 px-3 text-sm uppercase transition-colors",
          active
            ? "text-primary drop-shadow-sm"
            : "text-foreground hover:text-primary",
        )}
      >
        {label}
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
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
          <div className="flex gap-1 rounded-lg border bg-popover p-2 shadow-sm">
            {columns.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex w-48 flex-col gap-0.5 rounded-md px-3 py-2.5 transition-colors",
                  isActive(c.href) ? "bg-muted" : "hover:bg-muted",
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
          <div className="min-w-[11rem] rounded-lg border bg-popover p-1 shadow-sm">
            {items?.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(i.href)
                    ? "text-primary"
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
