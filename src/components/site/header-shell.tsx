"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Header chrome nhạy theo cuộn: ở đỉnh trang thì trong suốt & không viền
// (hòa vào hero), khi cuộn xuống thì đặc lại + viền mảnh + bóng nhẹ.
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 shadow-sm shadow-black/[0.03] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75"
          : "border-b border-transparent bg-background/40 backdrop-blur-md supports-[backdrop-filter]:bg-background/25",
      )}
    >
      {children}
    </header>
  );
}
