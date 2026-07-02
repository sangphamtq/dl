"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Nút "Đã đến" trên header — icon gọn, khớp hệ nút biểu tượng; tô tông brand
// khi đang ở trang bản đồ.
export function DaDenNavLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/tai-khoan/da-den");

  return (
    <Link
      href="/tai-khoan/da-den"
      title="Nơi tôi đã đến"
      aria-label="Nơi tôi đã đến"
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors lg:w-auto lg:px-3",
        active
          ? "text-primary drop-shadow-sm"
          : "text-foreground hover:text-primary",
      )}
    >
      <MapPinCheck className="size-4" />
      <span className="hidden lg:inline">Đã đến</span>
    </Link>
  );
}
