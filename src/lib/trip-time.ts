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

export const DEFAULT_STAY_MIN: Record<TripItemKind, number> = {
  spot: 90,
  eatery: 60,
  activity: 120, // ghi đè bằng durationText nếu đọc được
  accommodation: 0, // mốc nhận phòng / kết thúc ngày, không "ở lại" trong lịch
  custom: 60,
};

const LONG_DRIVE_MIN = 90;
const DAY_LATE_END = 22 * 60;
const DAY_MAX_LENGTH = 12 * 60; // tổng ngày quá 12 tiếng

// ── Đọc `Activity.durationText` thành phút ───────────────────────────────
// Văn bản tự do của biên tập: "~2 giờ", "nửa ngày", "2N1Đ", "90 phút", "3-4 giờ".
// Đọc không ra → null (dùng mặc định). KHÔNG đoán bừa.
function parseDurationMin(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = text.toLowerCase().trim();

  if (/(\d+)\s*n\s*\d*\s*đ/.test(s) || /\d+\s*ngày/.test(s)) return 8 * 60;
  if (/nguyên ngày|trọn ngày|cả ngày|full day/.test(s)) return 8 * 60;
  if (/nửa ngày|half day/.test(s)) return 4 * 60;

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

export type ScheduleItemInput = {
  id: string;
  kind: TripItemKind;
  name: string;
  stayMin: number | null;
  durationText?: string | null;
  openingHours?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type TripWarning = {
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
  driveToNextMin: number | null;
  warnings: TripWarning[];
};

export type ScheduledDay = {
  items: ScheduledItem[];
  startMin: number;
  endMin: number;
  driveMin: number;
  warnings: TripWarning[];
};

export function legKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

function stayMinOf(item: ScheduleItemInput): number {
  if (item.stayMin != null) return Math.max(0, item.stayMin);
  if (item.kind === "activity") {
    const parsed = parseDurationMin(item.durationText);
    if (parsed != null) return parsed;
  }
  return DEFAULT_STAY_MIN[item.kind];
}

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

export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} giờ` : `${h} giờ ${rest}`;
}

export { formatMinutes };
