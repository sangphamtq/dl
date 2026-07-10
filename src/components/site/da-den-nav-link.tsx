"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinCheck } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Nút "Nơi đã đến" trên header — icon tròn, đồng bộ với nút lịch trình & chuông.
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
            "grid size-9 place-items-center rounded-full transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-muted",
          )}
        >
          <MapPinCheck className="size-4" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Nơi đã đến</TooltipContent>
    </Tooltip>
  );
}
