"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NavGroupMenu, NavLabel } from "./nav-group-menu";

export type NavLink = {
  href: string;
  label: string;
  badge?: string;
  /**
   * Nhánh con KHÔNG thuộc mục này — bỏ qua khi tính trạng thái "đang ở đây".
   *
   * Mặc định một mục sáng lên khi `pathname` bắt đầu bằng `href`, đúng cho gần
   * hết: ở /dia-diem/thac-ban-ba thì "Địa điểm" sáng là phải. Nhưng /lich-trinh
   * có nhánh con là khu vực RIÊNG TƯ của người dùng (/lich-trinh/cua-toi) —
   * mục công khai "Lịch trình mẫu" sáng ở đó là chỉ sai chỗ.
   */
  exclude?: string[];
  /**
   * Nhánh KHÁC cũng thuộc mục này dù không nằm dưới `href`.
   *
   * /dia-diem và /ban-do không còn là mục riêng trên nav — chúng là hai lối
   * duyệt khác của cùng kho nội dung, và lối vào nằm ngay trong trang
   * /diem-den. Đứng ở đó mà không mục nào sáng thì người dùng mất dấu mình
   * đang ở đâu trong site.
   */
  include?: string[];
};
export type NavColumn = {
  href: string;
  title: string;
  desc?: string;
  badge?: string;
};

export type NavGroup = { label: string; href: string } & (
  | { items: NavLink[]; columns?: never }
  | { columns: NavColumn[]; items?: never }
);
export type NavEntry = NavLink | NavGroup;

export function SiteNav({
  entries,
  className,
}: {
  entries: NavEntry[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
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
        const under = (h: string) =>
          pathname === h || pathname.startsWith(`${h}/`);
        const active =
          (under(e.href) || (e.include?.some(under) ?? false)) &&
          !e.exclude?.some(under);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={active ? "page" : undefined}
            className="group/nav relative flex h-full items-center px-3 text-base font-normal text-foreground"
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
