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
import { specialGlyph } from "@/lib/trip-special";

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
  "block whitespace-nowrap bg-background py-px text-xs leading-4 tabular-nums text-muted-foreground";

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
}: {
  item: ItemView;
  fields: TripFields;
  grip?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
  stay?: ReactNode;
  /** Thay chỗ tên (trang soạn: ô sửa tên cho mục tự thêm). */
  name?: ReactNode;
}) {
  const warnings = fields.warn ? item.warnings : [];
  // Hoạt động đứng riêng (không là thẻ của một nơi trong ngày): nói nó diễn ra ở đâu.
  const at = item.kind === "activity" && !item.nested ? item.atName : null;
  const look = lookOf(item);
  if (look !== "place")
    return <CompactBody {...{ item, fields, grip, actions, name, look }} warnings={warnings} />;
  return (
    // `data-row-part`: phần NỘI DUNG thấy được (không gồm đệm) — dấu + chèn giữa hai hàng đo
    // khoảng trắng thật từ đáy phần này tới chấm số hàng dưới.
    <div data-row-part>
    <div className="flex items-start gap-3">
      {fields.image && <Thumb item={item} />}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p
            className={cn(
              "flex min-w-0 items-start gap-1.5 text-[1.0625rem] font-semibold leading-snug tracking-[-0.005em]",
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

        {(fields.stay || (fields.hours && item.openingHours) || at || item.address || item.special) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {at && <span>tại {at}</span>}
            {/* Mục đặc biệt: nói nó là GÌ (tên có thể là "Hà Nội – Sa Pa" hay "Ăn trưa") + mã đặt chỗ nếu có. */}
            {item.special && item.typeLabel !== item.name && <span>{item.typeLabel}</span>}
            {item.bookingCode && (
              <span>
                Mã <strong className="font-semibold tabular-nums text-foreground">{item.bookingCode}</strong>
              </span>
            )}
            {item.address && (
              <span className="inline-flex min-w-0 items-start gap-1">
                <Glyph name="pin" className="mt-[0.2rem] size-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{item.address}</span>
              </span>
            )}
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
        {fields.note && !note && item.note && <NoteLine text={item.note} className="hidden sm:flex" />}
      </div>
    </div>
    {/* Điện thoại: ghi chú HẾT bề ngang thẻ (dưới ảnh) — kẹp trong cột chữ cạnh ảnh thì mỗi dòng còn vài chữ.
        Từ `sm`: bản trong cột chữ, ngay dưới tên. Hai bản, `display` chọn. */}
    {fields.note && (note ?? (item.note && <NoteLine text={item.note} className="sm:hidden" />))}
    {warnings.map((w, i) => (
      <Warning key={`${w.code}-${i}`} warning={w} />
    ))}
    </div>
  );
}

/** Thân của mục KHÔNG phải nơi: không ảnh — icon loại thay chỗ ảnh; Di chuyển dựng thành một tấm vé. */
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
  look: Exclude<ItemLook, "place">;
  warnings: TripWarning[];
}) {
  const route = look === "transport" && item.travelFrom && item.travelTo;
  // Nhãn loại CHỈ cho Di chuyển (tên phương tiện) — loại khác đã có icon nói thay ("Ăn trưa / Bữa ăn" là lặp).
  const meta = [
    look === "transport" && item.typeLabel !== item.name ? item.typeLabel : null,
    route && item.name !== `${item.travelFrom} – ${item.travelTo}` ? item.name : null,
  ].filter(Boolean) as string[];
  return (
    <div data-row-part>
      <div className={cn("flex gap-2.5", look === "transport" ? "items-center" : "items-start")}>
        {/* Icon loại đứng TRẦN trước tên — không bọc ô nền (ô xám + icon là kiểu "thẻ mẫu" lặp ở mọi hàng). */}
        <span className={cn("shrink-0 text-muted-foreground", look === "transport" ? "" : "mt-[0.2rem]")}>
          <Glyph name={glyphOf(item)} className={look === "transport" ? "size-5" : "size-4"} />
          <span className="sr-only">{item.typeLabel}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            {route ? (
              <>
                {/* Tấm VÉ: hai đầu in đậm nối bằng vạch đứt — đọc ngay là "đi từ đâu tới đâu" (KHÔNG mũi tên, luật §3).
                    Dưới `sm` không đủ chỗ cho vạch (320px cắt còn "H ┄ P…") ⇒ bản chữ thường, xuống dòng được. */}
                <p className="min-w-0 flex-1 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere] sm:hidden">
                  {item.travelFrom} – {item.travelTo}
                </p>
                <p className="hidden min-w-0 flex-1 items-center gap-2 text-[1.0625rem] font-semibold leading-snug sm:flex">
                  <span className="min-w-0 truncate">{item.travelFrom}</span>
                  <span aria-hidden className="h-0 min-w-5 flex-1 border-t-2 border-dashed border-muted-foreground/35" />
                  <span className="sr-only">đến</span>
                  <span className="min-w-0 truncate">{item.travelTo}</span>
                </p>
              </>
            ) : (
              <p
                className={cn(
                  "line-clamp-2 min-w-0 leading-snug [overflow-wrap:anywhere]",
                  look === "transport" ? "text-[1.0625rem] font-semibold" : "text-base font-medium",
                  look === "rest" && "text-muted-foreground",
                )}
              >
                {name ?? item.name}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-0.5">
              {grip}
              {actions}
            </div>
          </div>

          {(meta.length > 0 || item.bookingCode || item.address) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
              {item.bookingCode && (
                <span>
                  Mã <strong className="font-semibold tabular-nums text-foreground">{item.bookingCode}</strong>
                </span>
              )}
              {item.address && (
                <span className="inline-flex min-w-0 items-start gap-1">
                  <Glyph name="pin" className="mt-[0.2rem] size-3.5 shrink-0" />
                  <span className="[overflow-wrap:anywhere]">{item.address}</span>
                </span>
              )}
            </p>
          )}
          {fields.note && item.note && <NoteLine text={item.note} />}
        </div>
      </div>
      {warnings.map((w, i) => (
        <Warning key={`${w.code}-${i}`} warning={w} />
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
    !fields.hours &&
    !fields.note &&
    (!fields.warn || item.warnings.length === 0)
  );
}

function RailDot({
  number,
  handleProps,
}: {
  /** null = mốc phụ (việc, bữa ăn, di chuyển…): chấm nhỏ, không số. Icon loại đã nằm trong thẻ — không lặp ở trục. */
  number: number | null;
  handleProps?: Record<string, unknown>;
}) {
  const draggable = handleProps != null;
  return (
    <span
      {...handleProps}
      data-rail-dot
      className={cn(
        // Số mốc TRUNG TÍNH (viền xám, chữ đậm) — bản viền xanh rắc màu nhấn lên mọi hàng, trục thành một chuỗi hạt xanh.
        "relative shrink-0 bg-background ring-4 ring-background",
        number == null
          ? "mt-[0.4rem] size-2.5 rounded-[2px] bg-muted-foreground/35"
          : "mt-0.5 grid size-[1.375rem] place-items-center rounded-[4px] border border-foreground/20 text-[0.6875rem] font-bold tabular-nums text-foreground/80",
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
            />
          </span>
        }
        below={fields.stay ? (stay ?? <RailStay item={item} />) : null}
      />
      </div>

      {card ? (
        <div className="min-w-0 flex-1 pb-3">
          {card(
            <>
              <ItemBody {...{ item, grip, actions, note, name }} fields={{ ...fields, stay: false }} />
              {tags}
            </>,
          )}
        </div>
      ) : (
        // Tắt hết dòng phụ ⇒ mục chỉ còn một dòng tên, đệm 20px là quá thưa cho một danh sách.
        <div className={cn("min-w-0 flex-1", isBare(item, fields) ? "pb-3" : "pb-5")}>
          {/* Thời gian đã nằm trên trục ⇒ dòng thông tin dưới tên chỉ còn giờ mở cửa. */}
          <ItemBody {...{ item, grip, actions, note, name }} fields={{ ...fields, stay: false }} />
          {tags}
        </div>
      )}
    </Tag>
  );
}

/**
 * HÌNH của một mục — phân biệt bằng HÌNH, không bằng màu (màu đã khoá nghĩa ở §3: xanh = thời điểm, cam = cảnh báo).
 * - `place`: nơi của site — thẻ lớn có ảnh + số mốc, xương sống của ngày.
 * - `transport`: Di chuyển — thẻ kiểu VÉ: nền xám nhạt, "Hà Nội ┄┄ Sa Pa".
 * - `minor`: mục tự thêm (nhận/trả phòng, bữa ăn, việc, nơi tự gõ) — thẻ gọn, icon nhỏ thay ảnh.
 * - `rest`: Nghỉ — viền đứt, nền trong suốt: một KHOẢNG TRỐNG của ngày.
 */
export type ItemLook = "place" | "transport" | "minor" | "rest";

export function lookOf(item: ResolvedItem): ItemLook {
  if (item.kind !== "custom") return "place";
  if (item.special === "transport") return "transport";
  if (item.special === "rest") return "rest";
  // Mục tự thêm (kể cả NƠI tự thêm có địa chỉ — nó vẫn lấy số mốc) không bao giờ có ảnh: dựng dạng gọn, đừng để một ô
  // ảnh rỗng viền đứt to bằng ảnh thật.
  return "minor";
}

/** Khung THẺ ở trang soạn theo hình của mục. Cùng đệm ở mọi hình — giờ và mốc trên trục canh theo đệm đó. */
export function cardClass(look: ItemLook): string {
  return cn(
    "rounded-[6px] border px-3 py-2.5",
    look === "rest" ? "border-dashed border-border bg-transparent" : "border-border",
    look === "transport" && "bg-muted/50",
    (look === "place" || look === "minor") && "bg-background",
  );
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
            "group/tag inline-flex h-8 min-w-0 max-w-full items-center rounded-[3px] border border-border bg-background text-sm transition-colors",
            t.href && "hover:border-primary/50",
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5 pl-2 pr-2">
            <Glyph name="compass" className="size-3.5 shrink-0 text-muted-foreground" />
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
      className={cn("group/stop relative grid bg-background", dragging && "z-20")}
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
        "mt-1.5 flex items-start gap-1.5 text-[0.8125rem] leading-relaxed",
        // Chữ đỏ + icon, KHÔNG mảng nền: một dải hồng cả bề ngang nặng hơn chính tên mục.
        high && "font-medium text-destructive",
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
