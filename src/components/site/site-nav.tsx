"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NavGroupMenu } from "./nav-group-menu";

export type NavLink = { href: string; label: string; badge?: string };
export type NavGroup = { label: string; href: string; items: NavLink[] };
export type NavEntry = NavLink | NavGroup;

// Nav desktop: mỗi entry là link phẳng, hoặc nhóm dropdown (khi có `items`).
export function SiteNav({
  entries,
  className,
}: {
  entries: NavEntry[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("items-center gap-1 h-full", className)}>
      {entries.map((e) =>
        "items" in e ? (
          <NavGroupMenu
            key={e.label}
            label={e.label}
            href={e.href}
            items={e.items}
          />
        ) : (
          <Link
            key={e.href}
            href={e.href}
            aria-current={
              pathname === e.href || pathname.startsWith(`${e.href}/`)
                ? "page"
                : undefined
            }
            className={cn(
              "relative flex h-full items-center px-3 text-sm uppercase transition-colors",
              pathname === e.href || pathname.startsWith(`${e.href}/`)
                ? "text-primary drop-shadow-sm"
                : "text-foreground hover:text-primary",
            )}
          >
            {e.label}
            {e.badge && (
              <Badge className="ml-1 h-4 shrink-0 -translate-y-1.5 border-transparent bg-warm/15 px-1 text-[0.6rem] font-semibold normal-case leading-none text-warm">
                {e.badge}
              </Badge>
            )}
          </Link>
        ),
      )}
    </nav>
  );
}
