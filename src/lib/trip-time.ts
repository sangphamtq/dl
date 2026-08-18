// Máy tính giờ ước tính cho Lịch trình — PHẦN LÕI của tính năng.
// Thiết kế & lý do: docs/lich-trinh.md §5.
//
// Ý tưởng: người dùng KHÔNG nhập giờ cho từng mục (ma sát cao, ai cũng bỏ dở).
// Họ chỉ sắp THỨ TỰ trong ngày; ở đây cộng dồn từ giờ bắt đầu ngày:
//
//   t = day.startMin
//   với mỗi mục:  đến lúc t → ở lại stayMin → lái driveMin tới mục kế tiếp
//
// Có mốc giờ rồi thì đối chiếu được `openingHours` → cảnh báo "chưa mở lúc bạn
// tới". Đó là thứ mà lưu vào Google Maps không làm được, tức là lý do tồn tại
// của cả tính năng.
//
// File này THUẦN LOGIC: không Prisma, không React, không "bây giờ là mấy giờ".
// Chạy được cả server lẫn client, và test được bằng tay.

import {
  parseOpeningHours,
  openingStatus,
  formatMinutes,
} from "@/lib/opening-hours";

export type TripItemKind =
  | "spot"
  | "eatery"
  | "accommodation"
  | "activity"
  | "custom";

// Thời gian ở lại mặc định (phút) khi biên tập/người dùng chưa đặt `stayMin`.
// Con số tròn, cố ý thô — mục đích là ra được một mốc giờ HỢP LÝ để cảnh báo,
// không phải dự báo chính xác. Người dùng sửa được từng mục.
export const DEFAULT_STAY_MIN: Record<TripItemKind, number> = {
  spot: 90,
  eatery: 60,
  activity: 120, // ghi đè bằng durationText nếu đọc được
  accommodation: 0, // mốc nhận phòng / kết thúc ngày, không "ở lại" trong lịch
  custom: 60,
};

// Ngưỡng cảnh báo.
const LONG_DRIVE_MIN = 90; // chặng lái dài
const DAY_LATE_END = 22 * 60; // kết thúc sau 22:00
const DAY_MAX_LENGTH = 12 * 60; // tổng ngày quá 12 tiếng

// ── Đọc `Activity.durationText` thành phút ───────────────────────────────
// Văn bản tự do của biên tập: "~2 giờ", "nửa ngày", "2N1Đ", "90 phút", "3-4 giờ".
// Đọc không ra → null (dùng mặc định). KHÔNG đoán bừa.
export function parseDurationMin(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = text.toLowerCase().trim();

  // Nhiều ngày ("2N1Đ", "2 ngày 1 đêm") — không nhét vừa một ngày, coi như trọn ngày.
  if (/(\d+)\s*n\s*\d*\s*đ/.test(s) || /\d+\s*ngày/.test(s)) return 8 * 60;
  if (/nguyên ngày|trọn ngày|cả ngày|full day/.test(s)) return 8 * 60;
  if (/nửa ngày|half day/.test(s)) return 4 * 60;

  // Khoảng "3-4 giờ" → lấy cận TRÊN (thà dự trù dư còn hơn xếp lịch không kịp).
  const range = s.match(/(\d+(?:[.,]\d+)?)\s*[-–—~]\s*(\d+(?:[.,]\d+)?)\s*(giờ|tiếng|h|phút|phut|min)/);
  if (range) {
    const hi = Number(range[2].replace(",", "."));
    return unitToMin(hi, range[3]);
  }

  const one = s.match(/(\d+(?:[.,]\d+)?)\s*(giờ|tiếng|h|phút|phut|min)/);
  if (one) return unitToMin(Number(one[1].replace(",", ".")), one[2]);

  return null;
}

function unitToMin(value: number, unit: string): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const isHour = /giờ|tiếng|h/.test(unit);
  const min = Math.round(isHour ? value * 60 : value);
  return min > 0 && min <= 24 * 60 ? min : null;
}

// ── Đầu vào / đầu ra ─────────────────────────────────────────────────────

export type ScheduleItemInput = {
  id: string;
  kind: TripItemKind;
  name: string;
  stayMin: number | null; // người dùng đặt tay
  durationText?: string | null; // chỉ Activity
  openingHours?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type TripWarning = {
  /** high = hỏng kế hoạch (đóng cửa) · medium = nên xem lại · info = thiếu dữ liệu */
  level: "high" | "medium" | "info";
  code:
    | "closed"
    | "opensLater"
    | "closingSoon"
    | "longDrive"
    | "noCoords"
    | "dayLate"
    | "dayLong";
  text: string;
};

export type ScheduledItem = {
  id: string;
  arriveMin: number;
  leaveMin: number;
  stayMin: number;
  /** Phút lái tới mục kế tiếp; null = mục cuối, hoặc thiếu toạ độ nên không tính được */
  driveToNextMin: number | null;
  warnings: TripWarning[];
};

export type ScheduledDay = {
  items: ScheduledItem[];
  startMin: number;
  endMin: number;
  /** Tổng phút lái trong ngày (chỉ những chặng tính được) */
  driveMin: number;
  warnings: TripWarning[];
};

/** Khoá tra thời gian lái giữa hai mục liên tiếp. */
export function legKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

/** Thời gian ở lại thực tế của một mục. */
export function stayMinOf(item: ScheduleItemInput): number {
  if (item.stayMin != null) return Math.max(0, item.stayMin);
  if (item.kind === "activity") {
    const parsed = parseDurationMin(item.durationText);
    if (parsed != null) return parsed;
  }
  return DEFAULT_STAY_MIN[item.kind];
}

// ── Tính lịch một ngày ───────────────────────────────────────────────────
//
// `drive` là bảng tra ĐÃ CÓ SẴN (phút) theo legKey — cố ý truyền vào chứ không
// tự gọi mạng: hàm này chạy lại mỗi lần người dùng đổi thứ tự, nên phải rẻ và
// đồng bộ. Phần lấy thời gian lái nằm ở lib/trip-route.ts.
export function scheduleDay(
  startMin: number,
  items: ScheduleItemInput[],
  drive: Record<string, number>,
): ScheduledDay {
  const out: ScheduledItem[] = [];
  let t = startMin;
  let driveTotal = 0;

  items.forEach((item, i) => {
    const warnings: TripWarning[] = [];
    const arriveMin = t;
    const stay = stayMinOf(item);

    // Giờ mở cửa tại thời điểm DỰ KIẾN tới (không phải "bây giờ").
    const intervals = parseOpeningHours(item.openingHours ?? null);
    const status = openingStatus(intervals, arriveMin % 1440);
    if (status) {
      if (status.kind === "opensLater") {
        warnings.push({
          level: "high",
          code: "opensLater",
          text: `Chưa mở lúc ${formatMinutes(arriveMin)} · mở ${formatMinutes(status.opensAt)}`,
        });
      } else if (status.kind === "closed") {
        warnings.push({
          level: "high",
          code: "closed",
          text: `Đã đóng cửa lúc ${formatMinutes(arriveMin)}`,
        });
      } else if (status.kind === "closingSoon") {
        warnings.push({
          level: "medium",
          code: "closingSoon",
          text: `Chỉ còn ${status.closesAt - (arriveMin % 1440)} phút trước giờ đóng`,
        });
      }
    }

    t = arriveMin + stay;

    // Chặng tới mục kế tiếp.
    const next = items[i + 1];
    let driveToNextMin: number | null = null;
    if (next) {
      const known = drive[legKey(item.id, next.id)];
      if (known != null) {
        driveToNextMin = Math.round(known);
        driveTotal += driveToNextMin;
        t += driveToNextMin;
        if (driveToNextMin > LONG_DRIVE_MIN) {
          warnings.push({
            level: "medium",
            code: "longDrive",
            text: `Chặng dài ${fmtDuration(driveToNextMin)} tới ${next.name}`,
          });
        }
      } else if (!hasCoords(item) || !hasCoords(next)) {
        warnings.push({
          level: "info",
          code: "noCoords",
          text: "Chưa có toạ độ nên không ước tính được đường đi",
        });
      }
    }

    out.push({ id: item.id, arriveMin, leaveMin: arriveMin + stay, stayMin: stay, driveToNextMin, warnings });
  });

  const endMin = out.length ? out[out.length - 1].leaveMin : startMin;
  const dayWarnings: TripWarning[] = [];
  if (endMin > DAY_LATE_END) {
    dayWarnings.push({
      level: "medium",
      code: "dayLate",
      text: `Ngày này kết thúc lúc ${formatMinutes(endMin)} — khá muộn`,
    });
  }
  if (endMin - startMin > DAY_MAX_LENGTH) {
    dayWarnings.push({
      level: "medium",
      code: "dayLong",
      text: `Ngày này dài ${fmtDuration(endMin - startMin)} — cân nhắc bớt một điểm`,
    });
  }

  return { items: out, startMin, endMin, driveMin: driveTotal, warnings: dayWarnings };
}

function hasCoords(i: ScheduleItemInput): boolean {
  return i.lat != null && i.lng != null;
}

/** "1 giờ 50" · "45 phút" — dùng cho chặng lái & độ dài ngày. */
export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} giờ` : `${h} giờ ${rest}`;
}

export { formatMinutes };
