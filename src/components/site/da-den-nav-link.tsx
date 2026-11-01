"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icons";
import { HEADER_ICON_BTN } from "@/lib/header-ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
          className={HEADER_ICON_BTN}
        >
          <NavIcon name="checkin" active={false} className="size-[1.15rem]" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Nơi đã đến</TooltipContent>
    </Tooltip>
  );
}
