"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Nút "Lịch trình của tôi" trên header — cùng kiểu nút chuông; tô nền brand
// nhạt khi đang ở trang lịch trình (trạng thái active).
export function LichTrinhNavLink() {
  const pathname = usePathname();
  // Sáng khi đang ở BẤT KỲ đâu trong tính năng, kể cả trang mẫu công khai —
  // người dùng không phân biệt nhánh, họ chỉ biết "mình đang ở phần lịch trình".
  const active = pathname === "/lich-trinh" || pathname.startsWith("/lich-trinh/");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/lich-trinh/cua-toi"
          aria-label="Lịch trình của tôi"
          aria-current={active ? "page" : undefined}
          className={cn(
            "grid size-10 place-items-center rounded-full transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-muted",
          )}
        >
          <NavIcon name="route" active={active} className="size-[1.15rem]" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Lịch trình của tôi</TooltipContent>
    </Tooltip>
  );
}
