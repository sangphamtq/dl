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

/**
 * Chữ của một mục menu header: KHÔNG gạch chân, hiệu ứng NHẸ — mục thường ĐỦ màu chữ; rê vào chỉ NHẠT đi một nấc (không đổi
 * độ đậm); đang ở trang đó thì đậm vừa (500). Đã thử và BỎ: rê/đang ở = 600 ("nặng quá") · mục thường nhạt 70% ("mờ").
 * ⚠️ Đổi độ đậm làm chữ rộng ra ⇒ các mục bên cạnh bị xô. Một bản chữ đậm ẨN (`h-0 invisible`) nằm cùng cột giữ sẵn bề rộng
 * lúc đậm, nên rê qua không làm menu nhảy.
 */
export function NavLabel({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <span className="inline-flex flex-col items-center py-1">
      <span
        className={cn(
          "transition-colors duration-200",
          active
            ? "font-medium text-foreground"
            : "font-normal text-foreground group-hover/nav:text-foreground/65",
        )}
      >
        {children}
      </span>
      <span aria-hidden className="invisible h-0 overflow-hidden font-medium">
        {children}
      </span>
    </span>
  );
}

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
        className="group/nav relative flex h-full items-center gap-1 pl-3 pr-2 text-base font-normal text-foreground"
      >
        <NavLabel active={active}>{label}</NavLabel>
        <ChevronDown
          className={cn(
            "size-4 opacity-80 transition-transform duration-200",
            open && "rotate-180 opacity-100",
          )}
          aria-hidden
        />
      </Link>

      <div
        className={cn(
          "absolute left-0 top-full z-50 pt-2 transition-opacity duration-100 [text-shadow:none]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {columns ? (
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
