"use client";

import { useEffect, useState } from "react";
import { Search } from "@/components/icons";
import { CommandPalette } from "./command-palette";

// Ô tìm kiếm header: ở lg+ là "ô" bấm mở Command palette (⌘K); dưới lg là icon.
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
      {/* Desktop (lg+): ô giả input, bấm mở palette */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tìm kiếm"
        className="hidden h-9 w-48 items-center gap-2 rounded-full border border-transparent bg-muted/60 pl-3.5 pr-2 text-sm text-muted-foreground transition-colors hover:bg-muted lg:flex xl:w-56"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Tìm kiếm…</span>
        <kbd className="pointer-events-none hidden items-center rounded-full border bg-background px-2 font-mono text-[0.7rem] text-muted-foreground xl:inline-flex">
          ⌘K
        </kbd>
      </button>

      {/* Mobile/tablet (< lg): icon mở palette */}
      <button
        type="button"
        aria-label="Tìm kiếm"
        onClick={() => setOpen(true)}
        className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
      >
        <Search className="size-4" aria-hidden />
      </button>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
