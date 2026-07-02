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
    <nav className={cn("items-center gap-1 h-full", className)}>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-3 pt-2.5 pb-1.5 text-sm transition-colors uppercase h-full flex items-center",
              active
                ? "text-primary drop-shadow-sm"
                : "text-foreground hover:text-primary",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
