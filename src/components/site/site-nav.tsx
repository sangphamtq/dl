"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Nav desktop kiểu biên tập: chữ gọn, gạch chân ngắn (accent) cho mục đang xem.
export function SiteNav({
  links,
  className,
}: {
  links: { href: string; label: string }[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("items-center gap-1", className)}>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-center rounded-full bg-primary transition-transform duration-300 ease-out",
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
