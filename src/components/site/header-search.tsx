"use client";

import { useEffect, useState } from "react";
import { NavIcon } from "./nav-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommandPalette } from "./command-palette";
import { HEADER_ICON_BTN } from "@/lib/header-ui";

export function HeaderSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Tìm kiếm"
            onClick={() => setOpen(true)}
            className={HEADER_ICON_BTN}
          >
            <NavIcon name="search" active={false} className="size-[1.15rem]" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Tìm kiếm</TooltipContent>
      </Tooltip>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
