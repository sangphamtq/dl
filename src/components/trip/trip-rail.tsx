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

const TYPE_GLYPH: Record<TripItemKind, GlyphName> = {
  spot: "mountain",
  eatery: "bowl",
  accommodation: "bed",
  activity: "compass",
  custom: "pin",
};

// Điện thoại: cột giờ HẸP (2.5rem, chữ nhỏ hơn) — giờ vẫn đứng bên trái chấm số như một bảng giờ, nhưng không
// ăn mất một phần tư bề ngang như cột 3.25rem cũ. Khoảng cách tới trục cũng hẹp hơn (gap-2).
const TIME = "w-10 shrink-0 pt-0.5 text-right text-[0.8125rem] font-semibold tabular-nums sm:w-16 sm:text-[0.95rem]";
const ROW_GAP = "gap-2 sm:gap-3";

/**
 * Trục dọc 2px. Nét LIỀN = đang ở một chỗ (nơi + việc làm ở đó); nét ĐỨT = đang đi giữa hai
 * nơi (dòng "di chuyển") — nhìn trục là thấy ngày chia thành ở/đi.
 */
function Rail({ node, dashed, below }: { node?: ReactNode; dashed?: boolean; below?: ReactNode }) {
  return (
    <div className="relative flex w-5 shrink-0 flex-col items-center sm:w-6">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 -translate-x-1/2",
          dashed ? "border-l-2 border-dashed border-border" : "w-0.5 bg-border",
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
  "block whitespace-nowrap bg-background py-px text-[0.6875rem] leading-4 tabular-nums text-muted-foreground";

/** "45′" · "1g30" · "0′" — nhãn gọn đủ chỗ trên trục. */
export function stayShort(min: number): string {
  if (min <= 0) return "0′";
  if (min < 60) return `${min}′`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}g${String(r).padStart(2, "0")}` : `${h}g`;
}

function RailStay({ item }: { item: ItemView }) {
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
  compact,
}: {
  item: ItemView;
  fields: TripFields;
  grip?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
  stay?: ReactNode;
  /** Thay chỗ tên (trang soạn: ô sửa tên cho mục tự thêm). */
  name?: ReactNode;
  /** Ô "Làm gì": ảnh nhỏ, chữ nhỏ. */
  compact?: boolean;
}) {
  const warnings = fields.warn ? item.warnings : [];
  return (
    // `data-row-part`: phần NỘI DUNG thấy được (không gồm đệm) — dấu + chèn giữa hai hàng đo
    // khoảng trắng thật từ đáy phần này tới chấm số hàng dưới.
    <div data-row-part className="flex items-start gap-3">
      {fields.image && <Thumb item={item} size={compact ? "sm" : "md"} />}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p
            className={cn(
              "flex min-w-0 items-start gap-1.5 font-medium leading-snug",
              compact && "text-sm",
            )}
          >
            {!fields.image && (
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
                  className="underline decoration-muted-foreground/40 decoration-dotted decoration-1 underline-offset-4 transition-colors hover:text-primary-ink hover:decoration-primary"
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

        {(fields.stay || (fields.hours && item.openingHours)) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {fields.stay &&
              (stay ?? (
                <span className="inline-flex items-center gap-1">
                  <Glyph name="clock" className="size-3.5" />
                  {stayLabel(item)}
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
  );
}

function isBare(item: ItemView, fields: TripFields): boolean {
  return (
    !fields.image &&
    !fields.stay &&
    !fields.hours &&
    !fields.note &&
    (!fields.warn || item.warnings.length === 0)
  );
}

function RailDot({
  number,
  handleProps,
}: {
  /** null = chấm nhỏ không số (nơi chưa rõ). */
  number: number | null;
  handleProps?: Record<string, unknown>;
}) {
  const draggable = handleProps != null;
  return (
    <span
      {...handleProps}
      data-rail-dot
      className={cn(
        // Mốc VUÔNG bo nhỏ (hệ hình khối của site — không rounded-full), viền chứ không đặc:
        // số đọc rõ hơn và trục trông nhẹ hơn một chuỗi chấm xanh đặc.
        "relative shrink-0 bg-background ring-4 ring-background",
        number == null
          ? "mt-[0.35rem] size-3 rounded-[3px] border-2 border-muted-foreground/40"
          : "mt-0.5 grid size-6 place-items-center rounded-[5px] border-[1.5px] border-primary text-[0.7rem] font-bold tabular-nums text-primary-ink",
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
  fields = ALL_ON,
}: {
  item: ItemView;
  index: number;
  /** Số trên chấm; mặc định `stopNo`. */
  number?: number | null;
  /** "div" khi nằm trong ô "Ở đâu" của một `StopRow`. */
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

  return (
    <Tag
      ref={innerRef}
      style={style}
      className={cn("group flex", ROW_GAP, dragging && "opacity-40")}
    >
      <span className={cn(TIME, (stale || noTime) && "text-muted-foreground/50")}>
        {noTime ? "···" : formatMinutes(item.arriveMin)}
      </span>

      <Rail
        node={
          <RailDot
            number={number !== undefined ? number : (item.stopNo ?? index + 1)}
            handleProps={handleProps}
          />
        }
        below={fields.stay ? (stay ?? <RailStay item={item} />) : null}
      />

      {/* Tắt hết dòng phụ ⇒ mục chỉ còn một dòng tên, đệm 20px là quá thưa cho một danh sách. */}
      <div className={cn("min-w-0 flex-1", isBare(item, fields) ? "pb-3" : "pb-5")}>
        {/* Thời gian đã nằm trên trục ⇒ dòng thông tin dưới tên chỉ còn giờ mở cửa. */}
        <ItemBody {...{ item, grip, actions, note, name }} fields={{ ...fields, stay: false }} />
      </div>
    </Tag>
  );
}

/** Ô "Ở đâu" khi nơi đó không phải một mục của chuyến (nơi của một hoạt động đứng riêng). */
export function PlaceStub({
  name,
  minute,
  number,
}: {
  name: string | null;
  minute: number;
  number: number | null;
}) {
  return (
    <div className={cn("flex", ROW_GAP)}>
      <span className={cn(TIME, minute < 0 && "text-muted-foreground/50")}>
        {minute < 0 ? "···" : formatMinutes(minute)}
      </span>
      <Rail node={<RailDot number={number} />} />
      <div className="min-w-0 flex-1 pb-5">
        <p data-row-part className="font-medium leading-snug text-muted-foreground">
          {name ?? "Chưa rõ ở đâu"}
        </p>
      </div>
    </div>
  );
}

// "Làm gì" xếp DƯỚI nơi, thụt theo nội dung — vẽ tiếp đoạn trục đúng toạ độ trục bên trên
// (cột giờ + khoảng cách + nửa cột trục) để đường không đứt.
const STACKED_RAIL =
  "before:absolute before:inset-y-0 before:left-[calc(2.5rem+0.5rem+0.625rem)] before:w-0.5 before:-translate-x-1/2 before:bg-border sm:before:left-[calc(4rem+0.75rem+0.75rem)]";
/** Lề trái của phần "Làm gì": thẳng với nội dung của nơi bên trên. */
// Dưới sm: cột giờ 2.5rem + gap 0.5rem + trục 1.25rem + gap 0.5rem = mép nội dung của nơi.
export const DOINGS_INDENT = "pl-[calc(2.5rem+0.5rem+1.25rem+0.5rem)] sm:pl-[calc(4rem+0.75rem+1.5rem+0.75rem)]";

/** Một hàng: nơi, rồi NGAY DƯỚI là các việc làm ở đó. */
export function StopRow({
  left,
  right,
  hasDoings = true,
  rowId,
  innerRef,
  style,
  dragging,
}: {
  /** id mục gốc của hàng — để giữ hàng đứng yên dưới chuột khi các hàng thu gọn. */
  rowId?: string;
  left: ReactNode;
  right?: ReactNode;
  /** Không có việc ⇒ phần dưới cao 0 (vẫn giữ chỗ cho nút "Thêm việc" nằm `absolute`). */
  hasDoings?: boolean;
  /** Trang soạn: CẢ HÀNG là một mục kéo–thả — kéo nơi thì việc của nó đi theo. */
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  dragging?: boolean;
}) {
  return (
    <li
      ref={innerRef}
      style={style}
      data-stop-row={rowId ?? ""}
      className={cn("group/stop grid bg-background", dragging && "relative z-10 opacity-60")}
    >
      {/* `grid`: ô con kéo hết chiều cao — trục không đứt. */}
      <div className="grid min-w-0">{left}</div>
      {right != null && (
        <div className={cn("relative min-w-0", DOINGS_INDENT, STACKED_RAIL, hasDoings ? "pb-5" : "h-0")}>
          {right}
        </div>
      )}
    </li>
  );
}

/** Một dòng trong cột "Làm gì": giờ nhỏ + thân mục rút gọn. */
export function DoingRow({
  item,
  fields = ALL_ON,
  grip,
  actions,
  note,
  stay,
  name,
  innerRef,
  style,
  dragging,
  stale,
}: {
  item: ItemView;
  fields?: TripFields;
  grip?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
  stay?: ReactNode;
  name?: ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  dragging?: boolean;
  stale?: boolean;
}) {
  return (
    <li
      ref={innerRef}
      style={style}
      className={cn(
        "group flex gap-0 border-t border-border/50 py-2 first:border-t-0 first:pt-0 sm:gap-3",
        // Đủ cao cho mốc + nhãn thời gian dưới mốc (nằm `absolute`), kẻo nhãn tràn xuống hàng sau.
        fields.stay && "min-h-[3.25rem]",
        dragging && "opacity-40",
      )}
    >
      <span
        className={cn(
          // `self-start`: ô giờ cao ĐÚNG một dòng chữ (h-5) — để kéo giãn theo cả dòng thì mốc
          // (top-1/2) rơi xuống giữa dòng, lệch khỏi chữ giờ. Dưới sm ô rộng 0: giờ của việc nằm trong CỘT GIỜ
          // chung bên trái trục (thẳng hàng giờ của các nơi), nội dung việc thẳng mép nội dung của nơi.
          "relative mt-px h-5 w-0 shrink-0 self-start text-right text-xs font-medium tabular-nums text-muted-foreground sm:w-10",
          (stale || item.arriveMin < 0) && "text-muted-foreground/50",
        )}
      >
        {/* Mốc nhỏ của việc NẰM TRÊN TRỤC, ngang dòng giờ — lùi về đúng toạ độ trục
            (= DOINGS_INDENT trừ tâm trục). */}
        <span
          aria-hidden
          className="absolute left-[-1.125rem] top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-muted-foreground/50 ring-[3px] ring-background sm:left-[-1.5rem]"
        />
        {fields.stay && (
          // Thời gian của việc: trên trục, ngay dưới mốc (cùng toạ độ ngang với mốc).
          <span className="absolute left-[-1.125rem] top-[1.6rem] z-10 -translate-x-1/2 sm:left-[-1.5rem]">
            {stay ?? <RailStay item={item} />}
          </span>
        )}
        {/* Dưới sm: đẩy sang trái đúng bằng (khoảng cách + trục + khoảng cách) ⇒ mép phải chữ trùng mép phải cột giờ. */}
        <span className="absolute right-[2.25rem] top-0 whitespace-nowrap sm:static">
          {item.arriveMin < 0 ? "···" : formatMinutes(item.arriveMin)}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <ItemBody {...{ item, grip, actions, note, name }} fields={{ ...fields, stay: false }} compact />
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
    <li className={cn("flex", ROW_GAP)} aria-hidden={false}>
      <span className={cn(TIME, "invisible")}>—</span>
      <Rail dashed />
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
  // Khổ điện thoại nhỏ đi một nấc: mỗi 8px ở đây là 8px chữ của tên mục (375px đã bị bóp còn ~100px).
  const box = size === "sm" ? "size-8 sm:size-10" : "size-10 sm:size-12";

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

export const MICRO = "text-[0.6875rem] font-semibold uppercase tracking-[0.14em]";

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
