"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Nút "Nơi đã đến" trên header — icon tròn, đồng bộ với nút lịch trình & chuông.
// Icon lấy từ `nav-icons.tsx` (bộ vẽ tay dùng chung với thanh tab dưới): đang ở
// trang này thì đổi sang bản ĐẶC, y như cách thanh tab iOS báo mục đang mở.
export function DaDenNavLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/tai-khoan/da-den");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/tai-khoan/da-den"
          aria-label="Nơi đã đến"
          aria-current={active ? "page" : undefined}
          className={cn(
            "grid size-10 place-items-center rounded-full transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-muted",
          )}
        >
          <NavIcon name="checkin" active={active} className="size-[1.15rem]" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Nơi đã đến</TooltipContent>
    </Tooltip>
  );
}
