"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Route } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Nút "Lịch trình của tôi" trên header — cùng kiểu nút chuông; tô nền brand
// nhạt khi đang ở trang lịch trình (trạng thái active).
export function LichTrinhNavLink() {
  const pathname = usePathname();
  const active =
    pathname === "/lich-trinh" || pathname.startsWith("/lich-trinh/");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/lich-trinh"
          aria-label="Lịch trình của tôi"
          aria-current={active ? "page" : undefined}
          className={cn(
            "grid size-9 place-items-center rounded-full transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-muted",
          )}
        >
          <Route className="size-4" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Lịch trình của tôi</TooltipContent>
    </Tooltip>
  );
}
