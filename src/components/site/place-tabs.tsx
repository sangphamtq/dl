"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceTab } from "@/lib/place-meta";

// Spinner hiện khi link đang điều hướng (phải là con của <Link>).
function TabSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="size-3.5 animate-spin" aria-hidden />;
}

// Thanh tab sticky: điều hướng giữa trang Place ("Tổng quan") và các trang
// danh sách listing ("xem tất cả" của từng loại). Active theo route hiện tại.
export function PlaceTabs({ items }: { items: PlaceTab[] }) {
  const pathname = usePathname();
  if (items.length <= 1) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="flex flex-wrap items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-sm font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {it.label}
                <TabSpinner />
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
