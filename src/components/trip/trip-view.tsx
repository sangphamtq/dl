"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Clock,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  Route,
  TriangleAlert,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DayView, ItemView } from "@/lib/trip";
import { formatMinutes, fmtDuration, type TripWarning } from "@/lib/trip-time";
import { cloneTrip } from "@/app/(site)/lich-trinh/actions";
import { TripMap } from "@/components/trip/trip-map";

// Khung nhìn CHỈ ĐỌC của một lịch trình — dùng cho cả hai đích:
//   · /lich-trinh/s/[shareId]  — bản chia sẻ của người dùng
//   · /lich-trinh/mau/[slug]   — lịch trình mẫu do biên tập soạn
// Khác trang soạn ở chỗ không có thao tác nào ngoài "Dùng lịch trình này".
export function TripView({
  trip,
  days,
}: {
  trip: {
    id: string;
    title: string;
    summary: string | null;
    placeName: string | null;
    placeSlug: string | null;
    isTemplate: boolean;
  };
  days: DayView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0] ?? null;
  const totalItems = days.reduce((s, d) => s + d.items.length, 0);

  function clone() {
    start(async () => {
      const res = await cloneTrip(trip.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã lưu vào lịch trình của bạn");
      router.push(`/lich-trinh/${res.data.id}`);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-gradient-to-b from-sky-100/70 to-background dark:from-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          {trip.isTemplate ? (
            <p className="text-sm font-medium text-warm">Lịch trình gợi ý</p>
          ) : (
            <p className="text-sm font-medium text-warm">Lịch trình được chia sẻ</p>
          )}

          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{trip.title}</h1>
              {trip.summary && (
                <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                  {trip.summary}
                </p>
              )}
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden />
                  {days.length} ngày
                </span>
                <span aria-hidden>·</span>
                <span>{totalItems} điểm dừng</span>
                {trip.placeName && trip.placeSlug && (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/diem-den/${trip.placeSlug}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <MapPin className="size-4" aria-hidden />
                      {trip.placeName}
                    </Link>
                  </>
                )}
              </p>
            </div>

            <Button
              onClick={clone}
              disabled={pending}
              className="rounded-full bg-warm text-warm-foreground hover:bg-warm/90"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Dùng lịch trình này
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b px-4 py-2 lg:hidden">
        <div className="inline-flex rounded-full bg-muted p-1">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMobileView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                mobileView === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {v === "list" ? <Route className="size-4" aria-hidden /> : <MapIcon className="size-4" aria-hidden />}
              {v === "list" ? "Lịch trình" : "Bản đồ"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className={cn("min-w-0 px-4 py-6 sm:px-6", mobileView === "map" && "hidden lg:block")}>
          {days.map((day) => (
            <section
              key={day.id}
              onMouseDown={() => setActiveDayId(day.id)}
              className={cn(
                "mb-4 rounded-2xl border bg-card p-4 transition-shadow",
                day.id === activeDay?.id ? "shadow-lg shadow-black/5 ring-1 ring-primary/20" : "shadow-sm",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  Ngày {day.index + 1}
                  {day.title && (
                    <span className="ml-2 text-base font-medium text-muted-foreground">{day.title}</span>
                  )}
                </h2>
                {day.items.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    {formatMinutes(day.startMin)} – {formatMinutes(day.endMin)}
                  </span>
                )}
              </div>

              {day.note && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{day.note}</p>
              )}

              {day.warnings.map((w) => (
                <Warning key={w.code} warning={w} className="mt-2" />
              ))}

              {day.items.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Ngày trống.</p>
              ) : (
                <ol className="mt-3 space-y-1">
                  {day.items.map((item, i) => (
                    <ViewRow key={item.id} item={item} index={i} last={i === day.items.length - 1} />
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>

        <div
          className={cn(
            "relative min-h-[24rem] border-l lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]",
            mobileView === "list" && "hidden lg:block",
          )}
        >
          <TripMap
            key={activeDay?.id ?? "empty"}
            dayLabel={activeDay ? `Ngày ${activeDay.index + 1}` : ""}
            points={(activeDay?.items ?? [])
              .filter((i) => i.lat != null && i.lng != null)
              .map((i, idx) => ({
                id: i.id,
                order: idx + 1,
                name: i.name,
                kind: i.kind,
                lat: i.lat as number,
                lng: i.lng as number,
              }))}
          />
        </div>
      </div>
    </div>
  );
}

function ViewRow({ item, index, last }: { item: ItemView; index: number; last: boolean }) {
  return (
    <li>
      <div className="group flex gap-3 rounded-xl p-2">
        <div className="flex w-12 shrink-0 flex-col items-center pt-1">
          <span className="text-sm font-semibold tabular-nums">{formatMinutes(item.arriveMin)}</span>
          <span className="mt-1 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
        </div>

        {item.image ? (
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
          </div>
        ) : (
          <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted">
            <Route className="size-4 text-muted-foreground/50" aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-snug">
            {item.href ? (
              <Link href={item.href} className="hover:text-primary">
                {item.name}
                <ArrowUpRight
                  className="ml-0.5 inline size-3.5 align-[-2px] opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            ) : (
              item.name
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[item.typeLabel, item.categoryLabel, item.areaLabel].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {fmtDuration(item.effectiveStayMin)}
            </span>
            {item.openingHours && <span>Mở: {item.openingHours}</span>}
            {item.bestTime && <span className="text-primary">Đẹp nhất: {item.bestTime}</span>}
          </p>
          {item.note && (
            <p className="mt-1 text-xs italic leading-relaxed text-muted-foreground">{item.note}</p>
          )}
          {item.warnings.map((w, i) => (
            <Warning key={`${w.code}-${i}`} warning={w} className="mt-1.5" />
          ))}
        </div>
      </div>

      {!last && (
        <div className="flex items-center gap-2 py-1 pl-[3.75rem] text-xs text-muted-foreground">
          <span className="h-4 w-px bg-border" aria-hidden />
          {item.driveToNextMin != null ? (
            <span className="inline-flex items-center gap-1">
              <Navigation className="size-3.5" aria-hidden />
              {item.driveApprox ? "~" : ""}
              {fmtDuration(item.driveToNextMin)} di chuyển
            </span>
          ) : (
            <span className="italic">chưa ước tính được đường đi</span>
          )}
        </div>
      )}
    </li>
  );
}

function Warning({ warning, className }: { warning: TripWarning; className?: string }) {
  const Icon = warning.level === "info" ? AlertCircle : TriangleAlert;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-md px-2 py-1 text-xs leading-relaxed",
        warning.level === "high" && "bg-destructive/10 text-destructive",
        warning.level === "medium" && "bg-warm/10 text-warm",
        warning.level === "info" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      {warning.text}
    </p>
  );
}
