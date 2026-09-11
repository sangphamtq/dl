"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  BedDouble,
  Car,
  Clock,
  Compass,
  Mountain,
  Pin,
  TriangleAlert,
  UtensilsCrossed,
} from "@/components/icons";
import type { LucideIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { formatMinutes, fmtDuration, type TripWarning } from "@/lib/trip-time";
import type { ItemView, ResolvedItem } from "@/lib/trip";
import type { TripItemKind } from "@/lib/trip-time";
import { ALL_ON, type TripFields } from "@/components/trip/trip-fields";

const TYPE_ICON: Record<TripItemKind, LucideIcon> = {
  spot: Mountain,
  eatery: UtensilsCrossed,
  accommodation: BedDouble,
  activity: Compass,
  custom: Pin,
};

const TIME = "w-[3.25rem] shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums sm:w-16 sm:text-[0.95rem]";

function Rail({ node }: { node?: ReactNode }) {
  return (
    <div className="relative flex w-5 shrink-0 justify-center sm:w-6">
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border"
      />
      {node}
    </div>
  );
}

export function RailItem({
  item,
  index,
  actions,
  grip,
  note,
  stay,
  innerRef,
  style,
  handleProps,
  dragging,
  stale,
  fields = ALL_ON,
}: {
  item: ItemView;
  index: number;
  actions?: ReactNode;
  grip?: ReactNode;
  note?: ReactNode;
  stay?: ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
  stale?: boolean;
  fields?: TripFields;
}) {
  const draggable = handleProps != null;
  const noTime = item.arriveMin < 0;

  return (
    <li
      ref={innerRef}
      style={style}
      className={cn("group flex gap-2.5 sm:gap-3", dragging && "opacity-40")}
    >
      <span className={cn(TIME, (stale || noTime) && "text-muted-foreground/50")}>
        {noTime ? "···" : formatMinutes(item.arriveMin)}
      </span>

      <Rail
        node={
          <span
            {...handleProps}
            className={cn(
              "relative mt-0.5 grid size-[1.375rem] shrink-0 place-items-center rounded-full bg-primary text-[0.7rem] font-semibold tabular-nums text-primary-foreground ring-4 ring-background",
              draggable &&
                "cursor-grab touch-none before:absolute before:-inset-2 before:content-[''] active:cursor-grabbing",
            )}
            aria-hidden={draggable ? true : undefined}
          >
            {index + 1}
          </span>
        }
      />

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-start gap-3">
          <Thumb item={item} hideImage={!fields.image} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="min-w-0 font-medium leading-snug">
                {item.href ? (
                  <Link href={item.href} draggable={false} className="hover:text-primary">
                    {item.name}
                  </Link>
                ) : (
                  item.name
                )}
              </p>
              <div className="flex shrink-0 items-center gap-0.5">
                {grip}
                {actions}
              </div>
            </div>

            {(fields.stay || (fields.hours && item.openingHours)) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {fields.stay &&
                  (stay ?? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden />
                      {fmtDuration(item.effectiveStayMin)}
                    </span>
                  ))}
                {fields.hours && item.openingHours && <span>Mở {item.openingHours}</span>}
              </p>
            )}

            {fields.note &&
              (note ??
                (item.note && (
                  <p className="mt-1.5 text-xs italic leading-relaxed text-muted-foreground">
                    {item.note}
                  </p>
                )))}

            {item.warnings.map((w, i) => (
              <Warning key={`${w.code}-${i}`} warning={w} />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

export function RailLeg({ item }: { item: ItemView }) {
  return (
    <li className="flex gap-2.5 sm:gap-3" aria-hidden={false}>
      <span className={cn(TIME, "invisible")}>—</span>
      <Rail />
      <p className="flex min-w-0 flex-1 items-center gap-1.5 pb-5 text-xs text-muted-foreground">
        {item.driveToNextMin != null ? (
          <>
            <Car className="size-3.5 shrink-0" aria-hidden />
            {item.driveApprox ? "~" : ""}
            {fmtDuration(item.driveToNextMin)} di chuyển
          </>
        ) : (
          <span className="italic">chưa ước tính được đường đi</span>
        )}
      </p>
    </li>
  );
}

export function Thumb({
  item,
  size = "md",
  hideImage,
}: {
  item: ResolvedItem;
  size?: "sm" | "md";
  hideImage?: boolean;
}) {
  const Icon = TYPE_ICON[item.kind];
  const box = size === "sm" ? "size-10" : "size-12";

  if (!item.image || hideImage) {
    return (
      <div className={cn("grid shrink-0 place-items-center rounded-lg bg-muted", box)}>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">{item.typeLabel}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 rounded-lg bg-muted", box)}>
      <Image
        src={item.image}
        alt={item.name}
        fill
        draggable={false}
        sizes={size === "sm" ? "40px" : "48px"}
        className="rounded-lg object-cover"
      />
      <span className="absolute -bottom-1 -left-1 grid size-[1.375rem] place-items-center rounded-full bg-background text-foreground/70 ring-1 ring-border">
        <Icon className="size-3.5" aria-hidden />
        <span className="sr-only">{item.typeLabel}</span>
      </span>
    </div>
  );
}

export function Warning({
  warning,
  className,
}: {
  warning: TripWarning;
  className?: string;
}) {
  const high = warning.level === "high";
  const Icon = warning.level === "info" ? AlertCircle : TriangleAlert;
  return (
    <p
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed",
        high && "rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive",
        warning.level === "medium" && "text-warm",
        warning.level === "info" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      {warning.text}
    </p>
  );
}

export const MICRO = "text-[0.66rem] font-semibold uppercase tracking-[0.14em]";

export function DayHeading({
  index,
  title,
  titleNode,
  dateLabel,
  span,
  right,
}: {
  index: number;
  title: string | null;
  titleNode?: ReactNode;
  dateLabel: string | null;
  span: string | null;
  right?: ReactNode;
}) {
  const named = titleNode !== undefined || Boolean(title);
  const DISPLAY =
    "font-[family-name:var(--font-display)] font-bold leading-tight tracking-tight";

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        {named ? (
          <>
            <span className={cn(MICRO, "flex items-center gap-2 text-warm")}>
              Ngày {index + 1}
              {dateLabel && (
                <>
                  <span aria-hidden className="h-2.5 w-px bg-border" />
                  <span className="text-muted-foreground">{dateLabel}</span>
                </>
              )}
            </span>
            {titleNode ?? (
              <h2 className={cn(DISPLAY, "mt-1 text-2xl sm:text-[1.75rem]")}>{title}</h2>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className={cn(DISPLAY, "text-2xl sm:text-[1.75rem]")}>Ngày {index + 1}</h2>
            {dateLabel && (
              <span className="text-sm text-muted-foreground">{dateLabel}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {span && (
          <span className="text-sm tabular-nums text-muted-foreground">{span}</span>
        )}
        {right}
      </div>
    </div>
  );
}
