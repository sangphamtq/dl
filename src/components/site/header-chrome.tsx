"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { HeroLayout } from "@/generated/prisma/enums";
import { chromeFor } from "@/lib/site-chrome";
import {
  getPageLoading,
  getServerPageLoading,
  subscribePageLoading,
} from "./loading-state";
import { cn } from "@/lib/utils";

let scrolledCache = false;
function subscribe(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
function getScrolled() {
  const y = window.scrollY;
  if (!scrolledCache && y > 64) scrolledCache = true;
  else if (scrolledCache && y < 16) scrolledCache = false;
  return scrolledCache;
}
const getServerScrolled = () => false;

export function HeaderChrome({
  heroLayout,
  children,
}: {
  heroLayout: HeroLayout;
  children: React.ReactNode;
}) {
  const scrolled = useSyncExternalStore(
    subscribe,
    getScrolled,
    getServerScrolled,
  );
  // Đang hiện màn chờ ⇒ sau lưng header là nền trang trống, KHÔNG phải hero.
  const loading = useSyncExternalStore(
    subscribePageLoading,
    getPageLoading,
    getServerPageLoading,
  );
  const { overlay, pinned } = chromeFor(usePathname(), heroLayout);
  // Header KHÔNG dính thì luôn đục: nó không đè lên gì cả, mà kính trong đặt
  // trên nền trang thì thành một vệt bệt, không ra thanh cũng không ra nền.
  // `loading` cùng một lý do: trong lúc chờ tải, hero chưa tồn tại.
  const deep = loading || !overlay || scrolled || !pinned;

  return (
    <header
      data-deep={deep}
      data-tone={deep ? "light" : "dark"}
      className={cn(
        "group/header relative top-0 z-50 hidden w-full lg:block",
        !deep && "dark",
        overlay ? "fixed" : pinned ? "sticky" : null,
      )}
    >
      {overlay && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/40 via-black/10 to-transparent transition-opacity duration-300 ease-out",
            deep ? "opacity-0" : "opacity-100",
          )}
        />
      )}

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
          deep ? "opacity-0" : "opacity-100",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 border-b border-border bg-background/80 backdrop-blur-lg backdrop-saturate-150 transition-opacity duration-300 ease-out",
          deep ? "opacity-100" : "opacity-0",
        )}
      />
      {children}
    </header>
  );
}
