"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Glyph } from "@/components/site/glyphs";
import { R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TRIP_SECTIONS, tripSectionHref, type TripSection } from "@/lib/trip-sections";

function useActiveToken(tripId: string): string | null {
  const path = usePathname();
  const rest = path.replace(`/lich-trinh/cua-toi/${tripId}`, "").replace(/^\//, "");
  return rest || null;
}

function navClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  window.history.pushState(null, "", href);
}

const rowBase =
  "flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Row({
  section,
  tripId,
  active,
  onNavigate,
}: {
  section: TripSection;
  tripId: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const href = tripSectionHref(tripId, section.token);
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => {
        navClick(e, href);
        onNavigate?.();
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        rowBase,
        // Mục đang mở = một mảnh "tờ" trắng trên nền canvas, cùng ngôn ngữ với tờ lịch trình.
        active
          ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      <Glyph
        name={section.glyph}
        className={cn("size-4 shrink-0", active && "text-warm")}
      />
      <span className="truncate">{section.label}</span>
    </Link>
  );
}

export function TripSideNav({ tripId, collapsed }: { tripId: string; collapsed?: boolean }) {
  const token = useActiveToken(tripId);

  if (collapsed) {
    return (
      <nav aria-label="Mục của lịch trình" className="grid gap-1">
        {TRIP_SECTIONS.map((s) => {
          const active = s.token === token;
          return (
            <Link
              key={s.label}
              href={tripSectionHref(tripId, s.token)}
              prefetch={false}
              onClick={(e) => navClick(e, tripSectionHref(tripId, s.token))}
              title={s.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                R_CTRL,
                "relative grid size-8 place-items-center justify-self-center transition-colors",
                active
                  ? "bg-background text-warm shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              <Glyph name={s.glyph} className="size-4" />
              <span className="sr-only">{s.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Mục của lịch trình" className="grid gap-0.5">
      {TRIP_SECTIONS.map((s) => (
        <Row key={s.label} section={s} tripId={tripId} active={s.token === token} />
      ))}
    </nav>
  );
}

export function TripSectionSheet({ tripId }: { tripId: string }) {
  const token = useActiveToken(tripId);
  const [open, setOpen] = useState(false);
  const current = TRIP_SECTIONS.find((s) => s.token === token) ?? TRIP_SECTIONS[0];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            R_CTRL,
            "inline-flex h-9 items-center gap-1.5 bg-muted px-3 text-sm font-medium transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden",
          )}
        >
          <Glyph name={current.glyph} className="size-4 shrink-0 text-warm" />
          <span className="max-w-[8rem] truncate">{current.label}</span>
          <Glyph name="chevron-down" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-[6px]">
        <SheetHeader className="pb-0">
          <SheetTitle>Mục của chuyến này</SheetTitle>
          <SheetDescription className="sr-only">
            Chuyển giữa lịch trình, ghi chú, đồ mang theo, phân công và chi phí.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-0.5 px-4 pb-6">
          {TRIP_SECTIONS.map((s) => (
            <Row
              key={s.label}
              section={s}
              tripId={tripId}
              active={s.token === token}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
