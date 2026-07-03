"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Route } from "lucide-react";
import { cn } from "@/lib/utils";

// Nút "Lịch trình của tôi" trên header — cùng kiểu nút chuông; tô nền brand
// nhạt khi đang ở trang lịch trình (trạng thái active).
export function LichTrinhNavLink() {
  const pathname = usePathname();
  const active =
    pathname === "/lich-trinh" || pathname.startsWith("/lich-trinh/");

  return (
    <Link
      href="/lich-trinh"
      aria-label="Lịch trình của tôi"
      title="Lịch trình của tôi"
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
  );
}
