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

// Dòng thời gian của một ngày, dựng như một ĐƯỜNG RAY chứ không phải danh sách thẻ.
//
// Bản trước: mỗi ngày là một thẻ bo góc có viền + bóng, trong đó mỗi mục lại là
// một ô bo góc nữa, và chặng đi là một dòng riêng có vạch dọc cụt lủn. Bốn tầng
// hộp lồng nhau, không tầng nào mang thêm nghĩa — đúng thứ CLAUDE.md đã chốt ở
// popup Quán ăn: "cột này vốn đã nhiều khung: chỉ thẻ BẤM ĐƯỢC mới có viền".
//
// Ở đây chỉ còn MỘT đường 1px chạy suốt, các mốc giờ treo trên đó. Chặng đi nằm
// ngay trên ray, giữa hai mốc — vì nó vốn là khoảng cách giữa hai mốc, không
// phải một mục ngang hàng.
//
//    14:00 ─●─ [ảnh]  Sunny House Homestay
//           │  7 phút di chuyển
//    14:37 ─●─ [ảnh]  Bãi biển Mũi Né

// Loại mục hiện bằng ICON ĐẶT TRÊN ẢNH, không phải một dòng chữ riêng.
//
// Đường đi của quyết định này: ban đầu loại là từ đầu tiên của một chuỗi ngăn
// bằng dấu chấm ("Quán ăn · Hải sản · Đường Phạm Văn Đồng") — muốn biết mục nào
// ăn mục nào ngủ thì phải ĐỌC từng dòng. Thay bằng icon (cùng lý do PlaceTabs
// đã chốt: "nhìn hình là biết mục gì"). Rồi bỏ nốt phân loại và địa chỉ, dòng
// phụ chỉ còn mỗi cái icon nằm lơ lửng — nên nó dọn hẳn lên ảnh.
//
// Được hai thứ: mỗi mục bớt một dòng, và loại nằm ngay cạnh ảnh nên quét dọc
// cột là thấy ngay nhịp ăn–chơi–ngủ của cả ngày.
//
// Icon để MÀU TRUNG TÍNH: hình đã đủ phân biệt, tô bốn màu cho bốn loại là đi
// ngược nguyên tắc "chỉ một điểm màu" của cả dải.
const TYPE_ICON: Record<TripItemKind, LucideIcon> = {
  spot: Mountain,
  eatery: UtensilsCrossed,
  accommodation: BedDouble,
  activity: Compass,
  custom: Pin,
};

const TIME = "w-[3.25rem] shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums sm:w-16 sm:text-[0.95rem]";

/** Cột ray: vạch dọc + nút tròn. Vạch vẽ theo TỪNG HÀNG nên luôn liền mạch. */
function Rail({ node }: { node?: ReactNode }) {
  return (
    <div className="relative flex w-5 shrink-0 justify-center sm:w-6">
      {/* Phải ghi rõ `left-1/2 -translate-x-1/2`: phần tử absolute không chịu
          `justify-center` của cha, không đặt toạ độ thì nó nằm ở vị trí tĩnh
          (mép trái) và cả đường ray lệch khỏi các chấm. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border"
      />
      {node}
    </div>
  );
}

/**
 * Một điểm dừng trên ray.
 *
 * `actions` và nhóm prop kéo–thả chỉ trang soạn truyền vào; trang chỉ-đọc gọi
 * không kèm gì và không phải biết gì về dnd-kit.
 *
 * TAY CẦM KÉO chính là NÚT TRÒN ĐÁNH SỐ, không phải một icon grip thêm vào:
 * nút đó vốn đã là danh tính của mục trên ray (và trùng số với pin trên bản
 * đồ), nên "cầm cái chấm trên dòng thời gian để dời" là ẩn dụ tự nhiên. Thêm
 * một tay cầm riêng là thêm chrome vào đúng chỗ vừa dọn sạch.
 */
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
  /** Tay cầm kéo NHÌN THẤY ĐƯỢC — trang soạn truyền vào, đứng cạnh `actions`. */
  grip?: ReactNode;
  /** Thay phần ghi chú bằng ô sửa được (trang soạn). Bỏ trống → chỉ đọc. */
  note?: ReactNode;
  /** Thay thời gian ở lại bằng ô chọn được (trang soạn). Bỏ trống → chỉ đọc. */
  stay?: ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  /** CHỈ `listeners` của dnd-kit, gắn lên NÚT TRÒN đánh số (tay cầm phụ).
   *  Không kèm `attributes` — chúng nằm ở nút grip, để người dùng bàn phím chỉ
   *  gặp MỘT tab stop cho hành động này.
   *  CỐ Ý không gắn lên cả hàng: kéo được ở mọi chỗ nghe tiện, nhưng nó nuốt
   *  luôn thao tác bôi đen chữ và dễ vướng với cuộn trang trên cảm ứng. */
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
  /** Giờ đang chờ server tính lại sau một lần dời — làm mờ thay vì hiện số sai. */
  stale?: boolean;
  /** Người dùng chọn hiện gì trên mỗi mục (xem trip-fields). Mặc định: hiện hết. */
  fields?: TripFields;
}) {
  const draggable = handleProps != null;
  // arriveMin < 0 = mục vừa kéo sang, chưa có giờ nào để hiện.
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
              // Vùng chạm nới ra ~38px bằng padding âm mà không đổi kích thước
              // nhìn thấy — nút 22px là dưới ngưỡng chạm trên điện thoại.
              "relative mt-0.5 grid size-[1.375rem] shrink-0 place-items-center rounded-full bg-primary text-[0.7rem] font-semibold tabular-nums text-primary-foreground ring-4 ring-background",
              // Vùng chạm nới ~38px mà không đổi kích thước nhìn thấy.
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

            {/* Tin thực địa: giờ ở lại · giờ mở cửa · giờ vàng. Không bọc thẻ —
                đây là chú thích của mục, không phải một khối riêng. */}
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

/** Chặng giữa hai mốc — chữ nằm TRÊN ray, không phải một hàng riêng. */
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

/**
 * Ảnh nhỏ của mục — hình khối DUY NHẤT còn lại trên ray, và cũng là nơi mang
 * huy hiệu LOẠI.
 *
 * Không ảnh → ô đặc chỉ có icon loại (trước đây là icon `Route` chung chung cho
 * mọi loại, nói được đúng con số không).
 */
export function Thumb({
  item,
  size = "md",
  hideImage,
}: {
  item: ResolvedItem;
  size?: "sm" | "md";
  /** Tắt ảnh → rơi về đúng ô icon loại vốn đã dùng cho mục không có ảnh. */
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
      {/* Huy hiệu tràn ra ngoài mép ảnh một chút (`-bottom-1 -left-1`): nằm gọn
          bên trong thì nó phải tự chống chọi với mọi tông ảnh phía sau, còn đặt
          gá lên mép thì phần lớn huy hiệu tựa trên nền trang, đọc chắc chắn hơn
          mà không phải tô thêm lớp phủ tối lên ảnh. */}
      <span className="absolute -bottom-1 -left-1 grid size-[1.375rem] place-items-center rounded-full bg-background text-foreground/70 ring-1 ring-border">
        <Icon className="size-3.5" aria-hidden />
        <span className="sr-only">{item.typeLabel}</span>
      </span>
    </div>
  );
}

// Cảnh báo: chỉ mức HIGH mới được tô nền — đó là thứ làm hỏng kế hoạch. Mức
// vừa và thấp chỉ đổi màu chữ. Bản trước tô nền cả ba mức, nên một ngày có vài
// cảnh báo là thành mấy mảng màu xếp chồng, mà mắt lại không phân biệt được cái
// nào đáng lo.
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

// ── Đầu một ngày ────────────────────────────────────────────────────────
// Không phải tiêu đề thẻ mà là một dòng biên tập: nhãn micro cam ở trên, tên
// ngày bằng font display, khoảng giờ canh phải. Cùng khuôn với eyebrow + tên
// ở hero điểm đến, nhờ vậy trang lịch trình đọc ra là một phần của site.
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
  /** Thay tên ngày bằng ô sửa được (trang soạn). Bỏ trống → chỉ đọc. */
  titleNode?: ReactNode;
  dateLabel: string | null;
  span: string | null;
  right?: ReactNode;
}) {
  // Ngày CÓ TÊN (lịch trình mẫu): số ngày lùi thành nhãn micro cam, tên ngày là
  // chữ lớn — tên mới là danh tính.
  // Ngày KHÔNG TÊN (chuyến tự soạn): chính "Ngày 1" phải là chữ lớn. Bản trước
  // để nguyên nhãn micro 0.66rem gánh cả danh tính của ngày, nên sau khi tên
  // ngày thành riêng-của-mẫu (§6d) thì đầu mỗi ngày teo lại thành một dòng chữ
  // hoa tí xíu, không ra tiêu đề cũng không ra nhãn.
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
