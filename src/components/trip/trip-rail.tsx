"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { formatMinutes, fmtDuration, type TripWarning } from "@/lib/trip-time";
import type { ItemView, ResolvedItem } from "@/lib/trip";
import { isTask, type TripItemKind } from "@/lib/trip-time";
import { ALL_ON, type TripFields } from "@/components/trip/trip-fields";

const TYPE_GLYPH: Record<TripItemKind, GlyphName> = {
  spot: "mountain",
  eatery: "bowl",
  accommodation: "bed",
  activity: "compass",
  custom: "pin",
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
  // Tắt hết dòng phụ ⇒ mục chỉ còn một dòng tên, đệm 20px là quá thưa cho một danh sách.
  const warnings = fields.warn ? item.warnings : [];
  const bare = !fields.image && !fields.stay && !fields.hours && !fields.note && warnings.length === 0;

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
            data-rail-dot
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

      <div className={cn("min-w-0 flex-1", bare ? "pb-3" : "pb-5")}>
        <div className="flex items-start gap-3">
          {fields.image && <Thumb item={item} />}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="flex min-w-0 items-start gap-1.5 font-medium leading-snug">
                {!fields.image && (
                  <span className="mt-[0.2rem] shrink-0 text-muted-foreground">
                    <Glyph name={glyphOf(item)} className="size-3.5" />
                    <span className="sr-only">{item.typeLabel}</span>
                  </span>
                )}
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
                      <Glyph name="clock" className="size-3.5" />
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

            {warnings.map((w, i) => (
              <Warning key={`${w.code}-${i}`} warning={w} />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

function fmtKm(km: number): string {
  return `${km < 10 ? km.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) : Math.round(km)} km`;
}

export function RailLeg({ item }: { item: ItemView }) {
  if (item.legHidden) return null;
  return (
    <li className="flex gap-2.5 sm:gap-3" aria-hidden={false}>
      <span className={cn(TIME, "invisible")}>—</span>
      <Rail />
      <p className="flex min-w-0 flex-1 items-center gap-1.5 pb-5 text-xs text-muted-foreground">
        {item.driveToNextMin != null ? (
          <>
            <Glyph name="car" className="size-3.5 shrink-0" />
            {item.driveApprox ? "~" : ""}
            {fmtDuration(item.driveToNextMin)} di chuyển
            {item.driveKm != null && (
              <span className="ml-3 tabular-nums">{fmtKm(item.driveKm)}</span>
            )}
          </>
        ) : (
          <span className="italic">chưa ước tính được đường đi</span>
        )}
      </p>
    </li>
  );
}

function glyphOf(item: ResolvedItem): GlyphName {
  return isTask(item) ? "note" : TYPE_GLYPH[item.kind];
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
  const glyph = glyphOf(item);
  const box = size === "sm" ? "size-10" : "size-12";

  if (!item.image || hideImage) {
    return (
      <div className={cn(R_CTRL, "grid shrink-0 place-items-center bg-muted", box)}>
        <Glyph name={glyph} className="size-4 text-muted-foreground" />
        <span className="sr-only">{item.typeLabel}</span>
      </div>
    );
  }

  return (
    <div className={cn(R_CTRL, "relative shrink-0 overflow-hidden bg-muted", box)}>
      <Image
        src={item.image}
        alt={item.name}
        fill
        draggable={false}
        sizes={size === "sm" ? "40px" : "48px"}
        className="object-cover"
      />
      {/* Huy hiệu loại nằm TRONG ảnh, nền đặc — bản cũ tràn ra ngoài khung và
          phải thêm `ring` để tách khỏi ảnh; ở đây nền đã đủ tách. */}
      <span
        className={cn(
          "absolute bottom-0 left-0 grid place-items-center rounded-tr-[4px] bg-background text-foreground/70",
          size === "sm" ? "size-[0.875rem]" : "size-[1.125rem]",
        )}
      >
        <Glyph name={glyph} className={size === "sm" ? "size-2.5" : "size-3"} />
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
  const glyph: GlyphName = warning.level === "info" ? "info" : "warn";
  return (
    <p
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed",
        high && "rounded-[4px] bg-destructive/10 px-2 py-1 font-medium text-destructive",
        warning.level === "medium" && "text-warm",
        warning.level === "info" && "text-muted-foreground",
        className,
      )}
    >
      <Glyph name={glyph} className="mt-px size-3.5 shrink-0" />
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
  active = false,
}: {
  index: number;
  title: string | null;
  titleNode?: ReactNode;
  dateLabel: string | null;
  span: string | null;
  right?: ReactNode;
  active?: boolean;
}) {
  const named = titleNode !== undefined || Boolean(title);
  const DISPLAY =
    "font-[family-name:var(--font-display)] font-bold leading-tight tracking-tight";

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      {/* Vạch "ngày đang mở" nằm trên khối tên chứ không trên section: cao tiêu đề
          đổi theo khổ chữ và theo có/không tên ngày, đặt số cứng là lệch. */}
      <div
        className={cn(
          "relative min-w-0",
          active &&
            "before:absolute before:inset-y-0 before:-left-3 before:w-[3px] before:rounded-[2px] before:bg-warm",
        )}
      >
        {named ? (
          <>
            <span className={cn(MICRO, "flex items-center gap-x-4 text-warm")}>
              Ngày {index + 1}
              {dateLabel && <span className="text-muted-foreground">{dateLabel}</span>}
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
