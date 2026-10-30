"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { formatMinutes, fmtDuration, type TripWarning } from "@/lib/trip-time";
import type { ItemView, ResolvedItem } from "@/lib/trip";
import { isTask, stayLabel, type TripItemKind } from "@/lib/trip-time";
import { ALL_ON, type TripFields } from "@/components/trip/trip-fields";
import { SPECIAL_LABEL, specialGlyph } from "@/lib/trip-special";
import { KIND_INK, KindIcon, TRAVEL_INK, TravelIcon, type HeadKind } from "@/components/trip/travel-icon";

const TYPE_GLYPH: Record<TripItemKind, GlyphName> = {
  spot: "mountain",
  eatery: "bowl",
  accommodation: "bed",
  activity: "compass",
  custom: "pin",
};

// Điện thoại: cột giờ HẸP (2.5rem, chữ nhỏ hơn) — giờ vẫn đứng bên trái chấm số như một bảng giờ, nhưng không
// ăn mất một phần tư bề ngang như cột 3.25rem cũ. Khoảng cách tới trục cũng hẹp hơn (gap-2).
const TIME = "w-11 shrink-0 pt-0.5 text-right text-[0.9375rem] font-semibold tabular-nums sm:w-16 sm:text-base";
const HOUR_WARNINGS = new Set<TripWarning["code"]>(["closed", "opensLater", "closingSoon"]);

const ROW_GAP = "gap-2 sm:gap-3";

/**
 * Trục dọc 2px. Nét LIỀN = đang ở một chỗ (nơi + việc làm ở đó); nét ĐỨT = đang đi giữa hai
 * nơi (dòng "di chuyển") — nhìn trục là thấy ngày chia thành ở/đi.
 */
const LINE: Record<DotTone, string> = {
  place: "w-0.5 bg-kind-place/35",
  meal: "w-0.5 bg-kind-meal/35",
  stay: "w-0.5 bg-kind-stay/35",
  travel: "w-0.5 bg-kind-travel/30",
  neutral: "w-0.5 bg-foreground/15",
};

function Rail({
  node,
  dashed,
  below,
  tone = "neutral",
}: {
  node?: ReactNode;
  dashed?: boolean;
  below?: ReactNode;
  /** Đoạn trục của một mục nhuốm màu loại của mục đó — dọc trục thấy nhịp chơi / ăn / ở / đi. */
  tone?: DotTone;
}) {
  return (
    <div className="relative flex w-5 shrink-0 flex-col items-center sm:w-6">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 -translate-x-1/2",
          dashed ? "border-l-2 border-dashed border-foreground/20" : LINE[tone],
        )}
      />
      {node}
      {below && <div className="relative z-10 mt-1.5">{below}</div>}
    </div>
  );
}

/**
 * Nhãn THỜI GIAN nằm TRÊN TRỤC, ngay dưới mốc của mục — trục là chiều thời gian, thời lượng là một đoạn của nó.
 * Chỉ là chữ xám nhỏ, KHÔNG viền / không đậm (biên tập: "đơn giản hơn"); nền trắng chỉ để vạch trục ngắt sau chữ.
 */
export const STAY_PILL =
  "block whitespace-nowrap bg-background py-px text-xs font-medium leading-4 tabular-nums text-foreground/70";

/** "45′" · "1g30" · "0′" — nhãn gọn đủ chỗ trên trục. */
export function stayShort(min: number): string {
  if (min <= 0) return "0′";
  if (min < 60) return `${min}′`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}g${String(r).padStart(2, "0")}` : `${h}g`;
}

function RailStay({ item }: { item: ItemView }) {
  // "0′" dưới mốc chỉ là nhiễu — ghé qua thì để trống.
  if (item.effectiveStayMin <= 0) return null;
  return (
    <span className={STAY_PILL} title={stayLabel(item)}>
      {stayShort(item.effectiveStayMin)}
    </span>
  );
}

/** Phần thân một mục: ảnh, tên, thời lượng / giờ mở, ghi chú, cảnh báo — không có giờ & trục. */
function ItemBody({
  item,
  fields,
  grip,
  actions,
  note,
  stay,
  name,
  iconHead,
}: {
  item: ItemView;
  fields: TripFields;
  grip?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
  stay?: ReactNode;
  /** Thay chỗ tên (trang soạn: ô sửa tên cho mục tự thêm). */
  name?: ReactNode;
  /** Thẻ nơi ở trang soạn: ô icon đầu thẻ thay ô ảnh (ảnh lùi thành nền mờ bên phải — `RailItem`). */
  iconHead?: boolean;
}) {
  const warnings = fields.warn ? item.warnings : [];

  // Hoạt động đứng riêng (không là thẻ của một nơi trong ngày): nói nó diễn ra ở đâu. Thuộc nhóm "Địa chỉ" của Hiển thị.
  const at = fields.address && item.kind === "activity" && !item.nested ? item.atName : null;
  const look = lookOf(item);
  if (look === "transport") return <TicketBody {...{ item, fields, grip, actions, name }} warnings={warnings} />;
  if (item.kind === "custom")
    return <CompactBody {...{ item, fields, grip, actions, name, look }} warnings={warnings} />;
  const tiled = isTiled(look);
  const head = !fields.icon ? null : tiled ? look : iconHead ? headKindOf(item) : null;
  const address = fields.address ? item.address : null;
  // Bữa ăn / lưu trú: ô icon màu ở đầu thẻ (như thẻ Di chuyển) THAY ảnh — icon đã nói loại, khỏi nhãn vai trên tên.
  const area = fields.address && look === "stay" ? item.areaLabel : null;
  return (
    // `data-row-part`: phần NỘI DUNG thấy được (không gồm đệm) — dấu + chèn giữa hai hàng đo
    // khoảng trắng thật từ đáy phần này tới chấm số hàng dưới.
    <div data-row-part>
    <div className="flex items-start gap-3">
      {/* Thẻ của trang soạn / bữa ăn / lưu trú không bao giờ có ô ảnh nhỏ — ảnh ở nền; tắt icon thì đầu thẻ để trống. */}
      {head ? <HeadTile look={head} /> : fields.image && !iconHead && !tiled && <Thumb item={item} />}

      <div className="min-w-0 flex-1">
        {/* VAI của mục trong lịch ("Ăn trưa" ở quán này, "Nhận phòng" ở chỗ ở này) — nhãn nhỏ trên tên. */}
        {item.role && !tiled && (
          <p className="mb-0.5 flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Glyph name={item.special === "meal" ? "bowl" : "bed"} className="size-3.5" />
            {item.role}
          </p>
        )}
        <div className="flex items-start justify-between gap-1">
          <p
            className={cn(
              "flex min-w-0 items-start gap-1.5 text-[1.0625rem] font-bold leading-snug tracking-[-0.01em] sm:text-lg",
            )}
          >
            {head && <InlineKindIcon look={head} />}
            {fields.icon && !fields.image && !head && (
              <span className="mt-[0.2rem] shrink-0 text-muted-foreground">
                <Glyph name={glyphOf(item)} className="size-3.5" />
                <span className="sr-only">{item.typeLabel}</span>
              </span>
            )}
            {/* Tên dài: tối đa HAI dòng (tràn thì "…"), không cắt một dòng như ô nhập cũ. */}
            <span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]">
              {/* Mục của site có trang ⇒ tên là liên kết, gạch chân chấm để thấy ngay đó là một ĐỐI
                  TƯỢNG của dự án chứ không phải chữ tự gõ (mục tự gõ không bao giờ có href). */}
              {name ?? (item.href ? (
                <Link
                  href={item.href}
                  draggable={false}
                  className="transition-colors hover:text-primary-ink"
                >
                  {item.name}
                </Link>
              ) : (
                item.name
              ))}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {grip}
            {actions}
          </div>
        </div>

        {(fields.stay || at || area || address || item.bookingCode) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {at && <span>tại {at}</span>}
            {area && (
              <span className="inline-flex min-w-0 items-start gap-1">
                <Glyph name="pin" className="mt-[0.2rem] size-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{area}</span>
              </span>
            )}
            {item.bookingCode && (
              <span>
                Mã <strong className="font-semibold tabular-nums text-foreground">{item.bookingCode}</strong>
              </span>
            )}
            {address && (
              <span className="inline-flex min-w-0 items-start gap-1">
                <Glyph name="pin" className="mt-[0.2rem] size-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{address}</span>
              </span>
            )}
            {fields.stay &&
              (stay ?? (
                <span className="inline-flex items-center gap-1">
                  <Glyph name="clock" className="size-3.5" />
                  {stayLabel(item)}
                </span>
              ))}
          </p>
        )}
        {fields.note && !note && item.note && <NoteLine text={item.note} className="hidden sm:flex" />}
      </div>
    </div>
    {/* Điện thoại: ghi chú HẾT bề ngang thẻ (dưới ảnh) — kẹp trong cột chữ cạnh ảnh thì mỗi dòng còn vài chữ.
        Từ `sm`: bản trong cột chữ, ngay dưới tên. Hai bản, `display` chọn. */}
    {fields.note && (note ?? (item.note && <NoteLine text={item.note} className="sm:hidden" />))}
    {warnings.map((w, i) => (
      // Có icon đầu thẻ (từ `sm`) ⇒ cảnh báo thẳng cột chữ (icon w-7 + gap-3), không chạy ra dưới icon.
      <Warning key={`${w.code}-${i}`} warning={w} hours={item.openingHours} className={head ? "sm:pl-10" : undefined} />
    ))}
    </div>
  );
}

/**
 * THẺ VÉ (Di chuyển): ô icon phương tiện + "Hà Nội ┄┄┄ TP. Hồ Chí Minh". KHÔNG in giờ (cột giờ bên trái đã có, thời lượng ở
 * nhãn dưới mốc trên trục) và không in tên phương tiện (icon nói).
 */
function TicketBody({
  item,
  fields,
  grip,
  actions,
  name,
  warnings,
}: {
  item: ItemView;
  fields: TripFields;
  grip?: ReactNode;
  actions?: ReactNode;
  name?: ReactNode;
  warnings: TripWarning[];
}) {
  const mode = item.travelMode;
  const ends = item.travelFrom || item.travelTo;
  // Tiêu đề tự đặt khác tên ghép "A – B" thì vẫn hiện (vd. "Chuyến đêm").
  const ownTitle = name ?? (ends && item.name !== [item.travelFrom, item.travelTo].filter(Boolean).join(" – ") ? item.name : null);
  return (
    <div data-row-part>
      <div className="flex items-center gap-3">
        {/* Dưới `sm` ô icon ăn mất 48px của một cột chữ vốn chỉ còn ~120px ⇒ icon nhỏ đứng trước tên điểm đi. */}
        <span className={cn("hidden w-7 shrink-0 justify-center", fields.icon && "sm:flex", TRAVEL_INK)}>
          {mode ? <TravelIcon mode={mode} className="size-6" /> : <Glyph name="route" className="size-5" />}
          <span className="sr-only">{item.typeLabel}</span>
        </span>

        <div className="min-w-0 flex-1">
          {ownTitle && <p className="truncate text-sm text-muted-foreground">{ownTitle}</p>}
          {ends ? (
            <>
              {/* Dưới `sm` không đủ chỗ cho vạch nối, mà một chuỗi "A – B" bị bẻ thành 4 dòng ở 320px ⇒ hai đầu HAI DÒNG. */}
              <p className="text-[1.0625rem] font-bold leading-snug break-words sm:hidden">
                <span className="flex items-start gap-1.5">
                  {fields.icon && mode && <TravelIcon mode={mode} className={cn("mt-px size-5 shrink-0", TRAVEL_INK)} />}
                  <span className="min-w-0">{item.travelFrom ?? "…"}</span>
                </span>
                <span className={cn("block", fields.icon && mode && "pl-[1.625rem]")}>
                  <span className="font-normal text-muted-foreground">đến </span>
                  {item.travelTo ?? "…"}
                </span>
              </p>
              <p className="hidden items-center gap-3 text-lg font-bold leading-snug tracking-[-0.01em] sm:flex">
                <span className="min-w-0 truncate">{item.travelFrom ?? "…"}</span>
                <span aria-hidden className="h-0 min-w-8 flex-1 border-t-2 border-dashed border-kind-travel/35" />
                <span className="sr-only">đến</span>
                <span className="min-w-0 truncate">{item.travelTo ?? "…"}</span>
              </p>
            </>
          ) : (
            <p className="text-[1.0625rem] font-bold leading-snug sm:text-lg">{name ?? item.name}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 self-start">
          {grip}
          {actions}
        </div>
      </div>
      {fields.note && item.note && <NoteLine text={item.note} className={fields.icon ? "sm:pl-10" : undefined} />}
      {warnings.map((w, i) => (
        <Warning key={`${w.code}-${i}`} warning={w} className={fields.icon ? "sm:pl-10" : undefined} />
      ))}
    </div>
  );
}

/** Thân của mục tự thêm KHÔNG phải Di chuyển: không ảnh — icon loại đứng trần trước tên. */
function CompactBody({
  item,
  fields,
  grip,
  actions,
  name,
  look,
  warnings,
}: {
  item: ItemView;
  fields: TripFields;
  grip?: ReactNode;
  actions?: ReactNode;
  name?: ReactNode;
  look: Exclude<ItemLook, "transport">;
  warnings: TripWarning[];
}) {
  const tiled = isTiled(look);
  // Tên chỉ là nhãn loại ("Bữa ăn", "Nhận phòng" — icon đầu thẻ đã nói) ⇒ dòng chính nói thứ icon CHƯA nói: chỗ nào, hoặc
  // chưa có chỗ.
  const echo = tiled && !name && !!item.special && same(item.name, SPECIAL_LABEL[item.special]);
  const address = fields.address ? item.address : null;
  const where = address ?? item.stayOf;
  const placeholder =
    item.special === "meal" ? "Chưa chọn quán" : item.special === "checkin" ? "Chưa chọn chỗ ở" : "Chưa ghi chỗ ở";
  const headline = echo ? (where ?? placeholder) : (name ?? item.name);
  const showAddress = address && !(echo && where === address);
  return (
    <div data-row-part>
      <div className="flex items-start gap-2.5">
        {/* Icon loại đứng TRẦN trước tên — không bọc ô nền (ô xám + icon là kiểu "thẻ mẫu" lặp ở mọi hàng). */}
        {!fields.icon ? null : tiled ? (
          <HeadTile look={look} />
        ) : (
          <span className="mt-[0.2rem] shrink-0 text-muted-foreground">
            <Glyph name={glyphOf(item)} className="size-4" />
            <span className="sr-only">{item.typeLabel}</span>
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            {fields.icon && tiled && <InlineKindIcon look={look} />}
            <p
              className={cn(
                "line-clamp-2 min-w-0 flex-1 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere] sm:text-lg",
                look === "rest" && "text-muted-foreground",
                tiled && (echo && !where ? "font-medium text-muted-foreground" : "font-bold"),
              )}
            >
              {headline}
            </p>
            <div className="flex shrink-0 items-center gap-0.5">
              {grip}
              {actions}
            </div>
          </div>

          {!echo && tiled && !address && item.special !== "checkout" && (
            <p className="mt-0.5 text-sm text-muted-foreground">{placeholder}</p>
          )}
          {(item.bookingCode || showAddress) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {item.bookingCode && (
                <span>
                  Mã <strong className="font-semibold tabular-nums text-foreground">{item.bookingCode}</strong>
                </span>
              )}
              {showAddress && (
                <span className="inline-flex min-w-0 items-start gap-1">
                  <Glyph name="pin" className="mt-[0.2rem] size-3.5 shrink-0" />
                  <span className="[overflow-wrap:anywhere]">{address}</span>
                </span>
              )}
            </p>
          )}
          {fields.note && item.note && <NoteLine text={item.note} />}
        </div>
      </div>
      {warnings.map((w, i) => (
        <Warning
          key={`${w.code}-${i}`}
          warning={w}
          className={!fields.icon ? undefined : tiled ? "sm:pl-[2.375rem]" : "pl-[1.625rem]"}
        />
      ))}
    </div>
  );
}

/** Lời dặn: đọc được (14px, không nghiêng) nhưng là tầng PHỤ — chữ xám, không nền, không viền. */
function NoteLine({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("mt-1.5 flex gap-1.5 text-sm leading-relaxed text-muted-foreground", className)}>
      <Glyph name="note" className="mt-[0.2rem] size-3.5 shrink-0 opacity-70" />
      <p className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{text}</p>
    </div>
  );
}

function isBare(item: ItemView, fields: TripFields): boolean {
  return (
    !fields.image &&
    !fields.stay &&
    !fields.note &&
    (!fields.warn || item.warnings.length === 0)
  );
}

type DotTone = "place" | "meal" | "stay" | "travel" | "neutral";

/**
 * Màu mốc trên trục — CÙNG màu loại với thẻ (`--kind-*`), để nhìn trục là thấy nhịp đi / chơi / ăn / ở. Ô số: viền + chữ màu
 * loại, nền pha 10% vào nền trang (ĐỤC — mốc phải che được vạch trục). Chấm nhỏ: đặc màu loại. Lớp viết đủ chữ để Tailwind quét.
 */
const DOT_NUM: Record<DotTone, string> = {
  place: "border-kind-place/70 bg-[color-mix(in_oklab,var(--kind-place)_10%,var(--background))] text-kind-place group-hover:border-kind-place",
  meal: "border-kind-meal/70 bg-[color-mix(in_oklab,var(--kind-meal)_10%,var(--background))] text-kind-meal group-hover:border-kind-meal",
  stay: "border-kind-stay/70 bg-[color-mix(in_oklab,var(--kind-stay)_10%,var(--background))] text-kind-stay group-hover:border-kind-stay",
  travel: "border-kind-travel/70 bg-background text-kind-travel group-hover:border-kind-travel",
  neutral: "border-foreground/45 bg-background text-foreground group-hover:border-foreground/80",
};
const DOT_SMALL: Record<DotTone, string> = {
  place: "bg-kind-place/70 group-hover:bg-kind-place",
  meal: "bg-kind-meal/70 group-hover:bg-kind-meal",
  stay: "bg-kind-stay/70 group-hover:bg-kind-stay",
  travel: "bg-kind-travel/70 group-hover:bg-kind-travel",
  neutral: "bg-foreground/45 group-hover:bg-foreground/75",
};

function dotTone(item: ResolvedItem): DotTone {
  const look = lookOf(item);
  if (look === "meal" || look === "stay") return look;
  if (look === "transport") return "travel";
  if (look === "place") {
    const k = headKindOf(item);
    return k === "spot" || k === "activity" ? "place" : k;
  }
  return "neutral";
}

function RailDot({
  number,
  handleProps,
  tone = "neutral",
}: {
  /** null = mốc phụ (việc, bữa ăn, di chuyển…): chấm nhỏ, không số. Icon loại đã nằm trong thẻ — không lặp ở trục. */
  number: number | null;
  handleProps?: Record<string, unknown>;
  tone?: DotTone;
}) {
  const draggable = handleProps != null;
  return (
    <span
      {...handleProps}
      data-rail-dot
      className={cn(
        "relative shrink-0 ring-4 ring-background transition-colors duration-200",
        number == null
          ? cn("mt-[0.4rem] size-2.5 rounded-[2px]", DOT_SMALL[tone])
          : // Rê vào thẻ thì mốc của nó đậm lên — thấy ngay thẻ đang rê thuộc mốc nào trên trục.
            cn(
              "mt-0.5 grid size-[1.375rem] place-items-center rounded-[4px] border text-[0.6875rem] font-bold tabular-nums",
              DOT_NUM[tone],
            ),
        draggable &&
          "cursor-grab touch-none before:absolute before:-inset-2 before:content-[''] active:cursor-grabbing",
      )}
      aria-hidden={draggable ? true : undefined}
    >
      {number}
    </span>
  );
}

export function RailItem({
  item,
  index,
  number,
  as: Tag = "li",
  actions,
  grip,
  note,
  stay,
  name,
  innerRef,
  style,
  handleProps,
  dragging,
  stale,
  tags,
  card,
  fields = ALL_ON,
}: {
  item: ItemView;
  index: number;
  /** Trang soạn: bọc nội dung thành THẺ kéo được (dựng ở `SortableStop`, nơi có `useSortable`). */
  card?: (content: ReactNode) => ReactNode;
  /** Thẻ "làm gì ở đây" ngay dưới tên. */
  tags?: ReactNode;
  /** Số trên chấm; mặc định `stopNo`. */
  number?: number | null;
  /** "div" khi nằm trong một `StopRow`. */
  as?: "li" | "div";
  actions?: ReactNode;
  grip?: ReactNode;
  note?: ReactNode;
  stay?: ReactNode;
  name?: ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
  stale?: boolean;
  fields?: TripFields;
}) {
  const noTime = item.arriveMin < 0;
  const look = lookOf(item);
  const iconHead = !!card && look === "place";
  // Ảnh của nơi / quán / chỗ ở LÙI thành nền mờ ở nửa phải thẻ: không ăn bề ngang của tên (kể cả 320px), vẫn cho thấy chỗ
  // đó trông thế nào. Mục tự thêm không có ảnh ⇒ không nền.
  const backdrop =
    !!card && (look === "place" || look === "meal" || look === "stay") && fields.image && item.image;
  // Dải thẻ hoạt động / gợi ý quán thẳng cột chữ khi đầu thẻ có icon (từ `sm`): icon w-7 + khoảng cách của từng thân thẻ.
  const tagPad = !fields.icon
    ? undefined
    : iconHead
      ? "sm:pl-10"
      : isTiled(look) && item.kind === "custom"
        ? "sm:pl-[2.375rem]"
        : undefined;
  const body = (
    <>
      <ItemBody {...{ item, grip, actions, note, name, iconHead }} fields={{ ...fields, stay: false }} />
      {tags && <div className={tagPad}>{tags}</div>}
    </>
  );

  return (
    <Tag
      ref={innerRef}
      style={style}
      // `min-w-0`: hàng là con của một ô GRID (`StopRow`) — mặc định nó không co dưới bề rộng tối thiểu của nội dung, một
      // tấm vé "Hà Nội ┄ Phan Thiết" là đủ đẩy cả trang tràn ngang trên điện thoại.
      className={cn("group flex min-w-0", ROW_GAP, dragging && "opacity-40")}
    >
      {/* Thẻ có đệm trên ⇒ giờ và mốc dịch xuống theo, cho thẳng dòng tên. */}
      <span
        className={cn(TIME, card && "pt-3", (stale || noTime) && "text-muted-foreground/50")}
      >
        {noTime ? "···" : formatMinutes(item.arriveMin)}
      </span>

      <div className="flex shrink-0">
      <Rail
        node={
          <span className={cn("relative flex", card && "pt-2.5")}>
            <RailDot
              number={number !== undefined ? number : (item.stopNo ?? index + 1)}
              handleProps={handleProps}
              tone={dotTone(item)}
            />
          </span>
        }
        below={fields.stay ? (stay ?? <RailStay item={item} />) : null}
        tone={dotTone(item)}
      />
      </div>

      {card ? (
        <div className="min-w-0 flex-1 pb-3">
          {card(
            backdrop ? (
              <>
                <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2 sm:w-[42%]">
                  <Image
                    src={backdrop}
                    alt=""
                    fill
                    draggable={false}
                    sizes="(min-width: 640px) 240px, 150px"
                    // Mờ dần về TRÁI (chỗ tên đứng) — mặt nạ chứ không phải lớp trắng phủ, để dark mode tự đúng.
                    className="object-cover opacity-70 [mask-image:linear-gradient(to_right,transparent,black_85%)] dark:opacity-50"
                  />
                </div>
                <div className="relative">{body}</div>
              </>
            ) : (
              body
            ),
          )}
        </div>
      ) : (
        // Tắt hết dòng phụ ⇒ mục chỉ còn một dòng tên, đệm 20px là quá thưa cho một danh sách.
        <div className={cn("min-w-0 flex-1", isBare(item, fields) ? "pb-3" : "pb-5")}>
          {/* Thời gian đã nằm trên trục ⇒ dòng thông tin dưới tên chỉ còn giờ mở cửa. */}
          {body}
        </div>
      )}
    </Tag>
  );
}

/**
 * HÌNH của một mục — phân biệt bằng HÌNH, không bằng màu (màu đã khoá nghĩa ở §3: xanh = thời điểm, cam = cảnh báo).
 * - `place`: nơi của site — thẻ lớn có ảnh + số mốc, xương sống của ngày.
 * - `transport`: Di chuyển — THẺ VÉ: ô icon phương tiện có màu, giờ đi ┄ thời lượng ┄ giờ đến (`TicketBody`).
 * - `minor`: mục tự thêm (nhận/trả phòng, bữa ăn, việc, nơi tự gõ) — thẻ gọn, icon nhỏ thay ảnh.
 * - `rest`: Nghỉ — viền đứt, nền trong suốt: một KHOẢNG TRỐNG của ngày.
 */
export type ItemLook = "place" | "transport" | "minor" | "rest" | "meal" | "stay";

/**
 * - `meal` / `stay`: bữa ăn (tự thêm, hoặc quán mang vai bữa) và lưu trú (chỗ ở của site, nhận/trả phòng tự thêm) — ô icon
 *   màu ở đầu thẻ như thẻ Di chuyển (`HeadTile`), thay cho ảnh.
 */
export function lookOf(item: ResolvedItem): ItemLook {
  if (item.special === "meal" && (item.kind === "custom" || item.kind === "eatery")) return "meal";
  if (item.kind === "accommodation") return "stay";
  if (item.kind === "custom" && (item.special === "checkin" || item.special === "checkout")) return "stay";
  if (item.kind !== "custom") return "place";
  if (item.special === "transport") return "transport";
  if (item.special === "rest") return "rest";
  // Mục tự thêm (kể cả NƠI tự thêm có địa chỉ — nó vẫn lấy số mốc) không bao giờ có ảnh: dựng dạng gọn, đừng để một ô
  // ảnh rỗng viền đứt to bằng ảnh thật.
  return "minor";
}

/**
 * Khung THẺ ở trang soạn theo hình của mục. Cùng đệm ở mọi hình — giờ và mốc trên trục canh theo đệm đó.
 * - Mọi thẻ: KHÔNG viền, KHÔNG nền; rê vào mới có nền nhạt (`CARD_HOVER`). KHÔNG vạch màu mép trái.
 *   Lớp tĩnh viết đủ chữ để Tailwind quét được.
 * - Nghỉ: viền đứt, nền trong suốt — một KHOẢNG TRỐNG của ngày.
 */
// KHÔNG viền, KHÔNG nền: thẻ là chữ trơn trên tờ trắng — trục + icon + giờ đã đủ tách từng mục. Nền nhạt CHỈ hiện khi rê
// (để biết thẻ bấm / kéo được). Nhấn / kéo thì nền trắng + bóng (`SortableStop`).
const CARD_HOVER = "hover:bg-[color-mix(in_oklab,var(--color-foreground)_3.5%,var(--color-background))]";
const LOOK_CARD: Record<ItemLook, string> = {
  // `relative overflow-hidden`: ảnh nền mờ neo theo khung và bị góc bo cắt.
  place: cn("relative overflow-hidden", CARD_HOVER),
  meal: cn("relative overflow-hidden", CARD_HOVER),
  stay: cn("relative overflow-hidden", CARD_HOVER),
  transport: CARD_HOVER,
  minor: CARD_HOVER,
  rest: CARD_HOVER,
};

export function cardClass(look: ItemLook): string {
  return cn("rounded-[6px] px-3 py-2.5", LOOK_CARD[look]);
}

/**
 * Thẻ hoạt động của một nơi — "làm gì ở đây". KHÔNG giờ: thời gian ở nơi đó là tổng, nằm ở mốc của
 * nơi. Thẻ bấm được (sang trang hoạt động) nên có viền; hoạt động cần giờ riêng (tour, đặt chỗ) thì
 * tách thành mục riêng.
 */
export function ActivityTags({
  tags,
  action,
  add,
}: {
  tags: ItemView[];
  /** Trang soạn: nút ⋯ cuối mỗi thẻ. */
  action?: (tag: ItemView) => ReactNode;
  /** Trang soạn: thẻ "+ Hoạt động" cuối dải. */
  add?: ReactNode;
}) {
  if (tags.length === 0 && !add) return null;
  return (
    <ul aria-label="Làm gì ở đây" className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <li
          key={t.id}
          className={cn(
            // Chip ĐẶC, không viền: đậm hơn tấm thẻ một nấc (đọc được cả trên thẻ, trên ảnh nền và trên trang xem nền trắng).
            "group/tag inline-flex h-8 min-w-0 max-w-full items-center rounded-[4px] bg-[color-mix(in_oklab,var(--color-foreground)_7%,var(--color-background))] text-sm transition-colors",
            t.href && "hover:bg-[color-mix(in_oklab,var(--color-foreground)_11%,var(--color-background))]",
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5 pl-2 pr-2">
            <Glyph name="compass" className="size-3.5 shrink-0 text-kind-place" />
            {t.href ? (
              <Link href={t.href} draggable={false} className="truncate font-medium hover:text-primary-ink">
                {t.name}
              </Link>
            ) : (
              <span className="truncate font-medium">{t.name}</span>
            )}
          </span>
          {action?.(t)}
        </li>
      ))}
      {add && <li className="inline-flex">{add}</li>}
    </ul>
  );
}

/** Một hàng của dòng thời gian: mục gốc (và thẻ của nó). */
export function StopRow({
  children,
  rowId,
  innerRef,
  style,
  dragging,
}: {
  children: ReactNode;
  /** id mục gốc của hàng. */
  rowId?: string;
  /** Trang soạn: CẢ HÀNG là một mục kéo–thả — kéo nơi thì thẻ của nó đi theo. */
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  dragging?: boolean;
}) {
  return (
    <li
      ref={innerRef}
      style={style}
      data-stop-row={rowId ?? ""}
      // Đang kéo: chính hàng này đi theo tay — nổi lên trên các hàng nó trượt qua.
      // Vạch ngăn MẢNH giữa hai hàng, chỉ trong CỘT THẺ (lùi đúng cột giờ + trục + hai khoảng cách: 5rem / 7rem từ `sm`) —
      // thẻ không viền không nền nên cần một nhịp ngăn nhẹ. Hàng cuối ngày và hàng đang kéo không có.
      className={cn(
        "group/stop relative grid bg-background",
        "after:pointer-events-none after:absolute after:bottom-1 after:left-20 after:right-0 after:h-px after:bg-foreground/[0.08] last:after:hidden sm:after:left-28",
        dragging && "z-20 after:hidden",
      )}
    >
      {/* `grid`: ô con kéo hết chiều cao — trục không đứt. */}
      <div className="grid min-w-0">{children}</div>
    </li>
  );
}


function fmtKm(km: number): string {
  return `${km < 10 ? km.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) : Math.round(km)} km`;
}

export function RailLeg({
  item,
  as: Tag = "li",
  className,
}: {
  item: ItemView;
  /** "div" khi nằm TRONG hàng kéo được (đi theo hàng, không đứng yên giữa các hàng đang trượt). */
  as?: "li" | "div";
  className?: string;
}) {
  if (item.legHidden) return null;
  return (
    <Tag className={cn("flex transition-opacity", ROW_GAP, className)}>
      <span className={cn(TIME, "invisible")}>—</span>
      <Rail dashed />
      <p className="flex min-w-0 flex-1 items-center gap-1.5 pb-5 text-sm text-muted-foreground">
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
    </Tag>
  );
}

function isTiled(look: ItemLook): look is "meal" | "stay" {
  return look === "meal" || look === "stay";
}

function same(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("vi") === b.trim().toLocaleLowerCase("vi");
}

/** Ô icon đầu thẻ bữa ăn / lưu trú — cùng khuôn với ô phương tiện của thẻ Di chuyển. Dưới `sm` nhường chỗ cho chữ. */
function headKindOf(item: ResolvedItem): HeadKind {
  if (item.kind === "eatery") return "meal";
  if (item.kind === "accommodation") return "stay";
  return item.kind === "activity" ? "activity" : "spot";
}

function HeadTile({ look }: { look: HeadKind }) {
  // Icon TRẦN màu loại, không ô nền: màu đã có ở mốc + đoạn trục ngay bên trái, thêm một ô màu nữa là nói lần thứ ba.
  return (
    <span className="mt-0.5 hidden w-7 shrink-0 justify-center sm:flex">
      <KindIcon kind={look} className={cn("size-6", KIND_INK[look])} />
    </span>
  );
}

/** Điện thoại: icon nhỏ đứng trước tên thay cho ô icon. */
function InlineKindIcon({ look }: { look: HeadKind }) {
  return <KindIcon kind={look} className={cn("mt-px size-5 shrink-0 sm:hidden", KIND_INK[look])} />;
}

function glyphOf(item: ResolvedItem): GlyphName {
  if (item.kind === "custom" && item.special) return specialGlyph(item.special, item.travelMode);
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
  // Khổ điện thoại nhỏ đi một nấc: mỗi 8px ở đây là 8px chữ của tên mục (375px đã bị bóp còn ~100px).
  const box = size === "sm" ? "size-8 sm:size-10" : "size-11 sm:size-14";

  if (!item.image || hideImage) {
    return (
      <div
        className={cn(
          R_CTRL,
          "grid shrink-0 place-items-center",
          // Tự gõ: ô viền nét đứt, không nền — cùng ngôn ngữ với dòng "tự thêm" trong hộp thêm.
          // Mục của site (kể cả chưa có ảnh): ô nền đặc.
          item.kind === "custom" ? "border border-dashed border-border" : "bg-muted",
          box,
        )}
      >
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
        sizes={size === "sm" ? "40px" : "56px"}
        className="object-cover"
      />
      {/* KHÔNG dán huy hiệu loại lên ảnh — ảnh tự nói nó là gì, ô ký hiệu chỉ cho mục chưa có ảnh. */}
      <span className="sr-only">{item.typeLabel}</span>
    </div>
  );
}

export function Warning({
  warning,
  hours,
  className,
}: {
  warning: TripWarning;
  /** Giờ mở cửa của mục — CHỈ in khi cảnh báo nói về giờ, ngay trong dòng cảnh báo (không có dòng giờ riêng trên thẻ). */
  hours?: string | null;
  className?: string;
}) {
  const showHours = hours && HOUR_WARNINGS.has(warning.code);
  const high = warning.level === "high";
  const glyph: GlyphName = warning.level === "info" ? "info" : "warn";
  return (
    <p
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-[0.8125rem] leading-relaxed",
        // Chữ đỏ + icon, KHÔNG mảng nền: một dải hồng cả bề ngang nặng hơn chính tên mục.
        high && "font-medium text-destructive",
        warning.level === "medium" && "text-warm",
        warning.level === "info" && "text-muted-foreground",
        className,
      )}
    >
      <Glyph name={glyph} className="mt-px size-3.5 shrink-0" />
      <span className="flex min-w-0 flex-wrap gap-x-3">
        <span>{warning.text}</span>
        {showHours && <span className="font-normal opacity-75">Giờ mở {hours}</span>}
      </span>
    </p>
  );
}

export const MICRO = "text-[0.6875rem] font-semibold uppercase tracking-[0.14em]";

/**
 * Đầu ngày. Ngày LỊCH ("T6 6/11") chỉ nằm ở thanh ngày (dính trên đầu, luôn thấy) — KHÔNG lặp ở đây.
 * `collapse`: nút ▾ trước tên + bấm tên cũng thu gọn / mở ngày (trang soạn và trang xem).
 */
export function DayHeading({
  index,
  title,
  titleNode,
  span,
  right,
  active = false,
  collapse,
}: {
  index: number;
  title: string | null;
  titleNode?: ReactNode;
  span: string | null;
  right?: ReactNode;
  active?: boolean;
  collapse?: { open: boolean; onToggle: () => void };
}) {
  const named = titleNode !== undefined || Boolean(title);
  const DISPLAY =
    "font-[family-name:var(--font-display)] font-bold leading-tight tracking-tight";
  const toggle = collapse && (
    <button
      type="button"
      onClick={collapse.onToggle}
      aria-expanded={collapse.open}
      aria-label={collapse.open ? `Thu gọn ngày ${index + 1}` : `Mở ngày ${index + 1}`}
      className="-ml-1 grid size-7 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition-colors group-hover/dayhead:bg-muted group-hover/dayhead:text-foreground"
    >
      <Glyph
        name="chevron-down"
        className={cn("size-4 transition-transform duration-200", !collapse.open && "-rotate-90")}
      />
    </button>
  );
  const dayName = <>Ngày {index + 1}</>;

  return (
    // CẢ HÀNG đầu ngày bấm được để thu gọn / mở (biên tập yêu cầu) — trừ thứ tự bấm được bên trong (giờ bắt đầu, ⋯, ô sửa
    // tên ngày của mẫu…), chúng giữ việc của mình. Bàn phím đi qua nút ▾ (cùng việc), nên hàng không cần `role`.
    <div
      onClick={
        collapse
          ? (e) => {
              if ((e.target as HTMLElement).closest("button, a, input, textarea, select, [role=menu], [role=dialog]")) return;
              collapse.onToggle();
            }
          : undefined
      }
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        collapse && "group/dayhead cursor-pointer select-none",
      )}
    >
      {/* Vạch "ngày đang mở" nằm trên khối tên chứ không trên section: cao tiêu đề
          đổi theo khổ chữ và theo có/không tên ngày, đặt số cứng là lệch. */}
      <div
        className={cn(
          "relative flex min-w-0 items-center gap-1.5",
          active &&
            "before:absolute before:inset-y-0 before:-left-3 before:w-[3px] before:rounded-[2px] before:bg-warm",
        )}
      >
        {toggle}
        {named ? (
          <div className="min-w-0">
            <span className={cn(MICRO, "block text-warm-ink")}>{dayName}</span>
            {titleNode ?? (
              <h2 className={cn(DISPLAY, "mt-1 text-2xl sm:text-[1.75rem]")}>{title}</h2>
            )}
          </div>
        ) : (
          <h2 className={cn(DISPLAY, "text-2xl sm:text-[1.75rem]")}>{dayName}</h2>
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

/** Dòng tóm tắt của một ngày đang thu gọn: số điểm dừng + tên các mục (cắt một dòng). Bấm để mở lại. */
export function DayCollapsedSummary({ items, onOpen }: { items: ItemView[]; onOpen: () => void }) {
  const tops = items.filter((i) => !i.nested);
  const stops = tops.filter((i) => i.stopNo != null).length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full min-w-0 items-baseline gap-x-4 rounded-[4px] py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="shrink-0 font-semibold tabular-nums text-foreground">
        {tops.length ? `${stops} điểm dừng` : "Chưa có mục nào"}
      </span>
      <span className="min-w-0 truncate">{tops.map((i) => i.name).join(", ")}</span>
    </button>
  );
}
