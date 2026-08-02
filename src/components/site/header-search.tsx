"use client";

import { useEffect, useState } from "react";
import { Search } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      {/* Desktop: ô giả input, bấm mở palette. Cố ý HẸP — nav vừa tăng cỡ chữ
          nên chỗ trống ở khoảng 1024–1280px rất sát. Nhãn "Tìm kiếm" bỏ dấu ba
          chấm; gợi ý phím ⌘K đã chuyển vào ô input trong modal.
          h-10 + bg-muted/40: khớp CHÍNH XÁC nhóm tiện ích bên cạnh (nút size-9
          trong khung p-0.5 = 40px, nền muted/40) để hai khối thành một hàng
          liền mạch, không lệch cao và không lệch sắc. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tìm kiếm"
        className="hidden h-10 w-36 items-center gap-1.5 rounded-full border border-transparent bg-muted/40 pl-3.5 pr-4 text-sm text-muted-foreground transition-colors hover:bg-muted/70 lg:flex xl:w-44"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Tìm kiếm</span>
      </button>

      {/* Mobile/tablet (< lg): icon mở palette */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Tìm kiếm"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted/70 lg:hidden"
          >
            <Search className="size-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>Tìm kiếm</TooltipContent>
      </Tooltip>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
