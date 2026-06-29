"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Nút "Đã đến" trên header — tô active (tông cam) khi đang ở trang bản đồ.
export function DaDenNavLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/tai-khoan/da-den");

  return (
    <Link
      href="/tai-khoan/da-den"
      title="Bản đồ nơi tôi đã đến"
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors sm:px-3",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <MapIcon className="size-5 sm:size-4" />
      <span className="hidden sm:inline">Đã đến</span>
    </Link>
  );
}
