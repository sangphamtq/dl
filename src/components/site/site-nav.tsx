"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NavGroupMenu, NavLabel } from "./nav-group-menu";

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
    // font-heading (Plus Jakarta Sans) thay vì font thân (Cabin): nav là chữ
    // cấu trúc, cùng họ với tiêu đề thì header đọc như một khối riêng tách khỏi
    // nội dung. Font đã nạp sẵn cho h1–h6 nên không tốn thêm request.
    // Đổi font menu = đổi đúng class này. Utility có sẵn: font-sans, font-heading,
    // font-rounded, font-script, font-mono (`--font-display` KHÔNG khai trong
    // @theme nên không có class tương ứng).
    <nav className={cn("h-full items-center gap-1 font-heading", className)}>
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
            className="group/nav relative flex h-full items-center px-3 text-base font-medium text-white"
          >
            <NavLabel active={active}>{e.label}</NavLabel>
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
