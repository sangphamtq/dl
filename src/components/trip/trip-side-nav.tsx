"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glyph } from "@/components/site/glyphs";
import { R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { TRIP_NAV, tripSectionHref, type TripSection } from "@/lib/trip-sections";

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
  "flex h-9 items-center gap-3 rounded-[4px] px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
        // Mục đang mở: viên TRẮNG nổi trên nền `band` của cột trái — một mảng xám đậm hơn nền
        // một chút thì gần như không thấy.
        active
          ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_rgb(0_0_0/0.03)]"
          : "font-medium text-foreground/75 hover:bg-foreground/[0.05] hover:text-foreground",
      )}
    >
      <Glyph
        name={section.glyph}
        className={cn("size-[1.125rem] shrink-0", active ? "text-warm" : "text-foreground/55")}
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
        {TRIP_NAV.map((s) => {
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
                "relative grid size-9 place-items-center justify-self-center transition-colors",
                active
                  ? "bg-background text-warm shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_rgb(0_0_0/0.03)]"
                  : "text-foreground/55 hover:bg-foreground/[0.05] hover:text-foreground",
              )}
            >
              <Glyph name={s.glyph} className="size-[1.125rem]" />
              <span className="sr-only">{s.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Mục của lịch trình" className="grid gap-0.5">
      {TRIP_NAV.map((s) => (
        <Row key={s.label} section={s} tripId={tripId} active={s.token === token} />
      ))}
    </nav>
  );
}

/**
 * Dải mục trên ĐIỆN THOẠI: mọi mục hiện sẵn, một chạm là sang (bản cũ là viên chọn mục mở tấm trượt — hai chạm,
 * và không nhìn thấy có những mục nào). Kiểu viên phân đoạn — khác hẳn thanh gạch chân cam của khung nhìn BÊN
 * TRONG một mục, để hai tầng điều hướng không lẫn nhau.
 */
export function TripSectionTabs({ tripId, className }: { tripId: string; className?: string }) {
  const token = useActiveToken(tripId);
  return (
    // Icon TRÊN chữ: bốn mục chia đều bề ngang và vừa tới 320px — xếp ngang icon + chữ thì cần ~420px, mục
    // cuối bị đẩy khỏi màn hình mà không ai biết là còn.
    <nav aria-label="Mục của lịch trình" className={className}>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-[6px] bg-foreground/[0.05] p-1">
        {TRIP_NAV.map((s) => {
          const active = s.token === token;
          const href = tripSectionHref(tripId, s.token);
          return (
            <Link
              key={s.label}
              href={href}
              prefetch={false}
              onClick={(e) => navClick(e, href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[4px] px-1 py-1.5 text-[0.75rem] leading-tight transition-colors",
                active
                  ? "bg-background font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                  : "font-medium text-foreground/65",
              )}
            >
              <Glyph name={s.glyph} className={cn("size-[1.125rem] shrink-0", active ? "text-warm" : "text-foreground/45")} />
              <span className="max-w-full text-center">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
