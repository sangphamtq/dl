"use client";

import { useEffect, useState } from "react";
import { NavIcon } from "./nav-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommandPalette } from "./command-palette";

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
            className="grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-foreground/10"
          >
            <NavIcon name="search" active={open} className="size-[1.35rem]" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Tìm kiếm</TooltipContent>
      </Tooltip>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
