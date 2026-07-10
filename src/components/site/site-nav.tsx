"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NavGroupMenu } from "./nav-group-menu";

export type NavLink = { href: string; label: string; badge?: string };
export type NavColumn = {
  href: string;
  title: string;
  desc?: string;
  badge?: string;
};
// Group có HOẶC danh sách (items) HOẶC mega-menu theo cột (columns) — bắt buộc một.
export type NavGroup = { label: string; href: string } & (
  | { items: NavLink[]; columns?: never }
  | { columns: NavColumn[]; items?: never }
);
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
    <nav className={cn("h-full items-center gap-1", className)}>
      {entries.map((e) => {
        if ("items" in e || "columns" in e)
          return (
            <NavGroupMenu
              key={e.label}
              label={e.label}
              href={e.href}
              items={e.items}
              columns={e.columns}
            />
          );
        const active =
          pathname === e.href || pathname.startsWith(`${e.href}/`);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-full items-center px-3 text-sm font-medium transition-colors",
              active
                ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {e.label}
            {e.badge && (
              <Badge className="ml-1 h-4 shrink-0 -translate-y-1.5 border-transparent bg-warm/15 px-1 text-[0.6rem] font-semibold normal-case leading-none text-warm">
                {e.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
