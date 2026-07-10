"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

// Nút "Nơi đã đến" trên header — icon tròn, đồng bộ với nút lịch trình & chuông.
export function DaDenNavLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/tai-khoan/da-den");

  return (
    <Link
      href="/tai-khoan/da-den"
      title="Nơi đã đến"
      aria-label="Nơi đã đến"
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted",
      )}
    >
      <MapPinCheck className="size-4" aria-hidden />
    </Link>
  );
}
