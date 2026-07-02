"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Item = { href: string; label: string; badge?: string };

// Nhóm nav dạng dropdown: mở khi hover/focus, đóng khi rời chuột hoặc click.
// Dùng state JS (không dựa vào :focus-within) để click xong không bị "pin" mở.
// Click vào nhãn nhóm điều hướng tới `href`.
export function NavGroupMenu({
  label,
  href,
  items,
}: {
  label: string;
  href: string;
  items: Item[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = items.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

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
        <div className="min-w-[11rem] rounded-lg border bg-popover p-1 shadow-sm">
          {items.map((i) => {
            const itemActive =
              pathname === i.href || pathname.startsWith(`${i.href}/`);
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-md px-3 py-2 text-sm transition-colors",
                  itemActive
                    ? "text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {i.label}
                {i.badge && (
                  <Badge className="h-4 shrink-0 border-transparent bg-warm/15 px-1 text-[0.6rem] font-semibold leading-none text-warm">
                    {i.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
