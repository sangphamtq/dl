import {
  parseOpeningHours,
  openingStatus,
  formatMinutes,
} from "@/lib/opening-hours";

import { SPECIAL_STAY, type TripSpecial } from "@/lib/trip-special";

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

/** Mục tự thêm KHÔNG có toạ độ là một VIỆC (đặt xe, chờ người…) — trừ khi đánh dấu là NƠI. */
export const TASK_STAY_MIN = 30;

export function isTask(i: {
  kind: TripItemKind;
  lat?: number | null;
  lng?: number | null;
  customPlace?: boolean;
}): boolean {
  return i.kind === "custom" && !i.customPlace && (i.lat == null || i.lng == null);
}

const LONG_DRIVE_MIN = 90;

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
  /** Mục tự thêm là một NƠI dù không có toạ độ. */
  customPlace?: boolean;
  /** Mục đặc biệt (chỉ mục tự thêm) — thời lượng mặc định riêng; `transport` cắt chuỗi chặng. */
  special?: TripSpecial | null;
};

export type TripWarning = {
  level: "high" | "medium" | "info";
  code:
    | "closed"
    | "opensLater"
    | "closingSoon"
    | "longDrive"
    | "noCoords";
  text: string;
};

export type ScheduledItem = {
  id: string;
  arriveMin: number;
  leaveMin: number;
  stayMin: number;
  driveToNextMin: number | null;
  /** Chặng tính cho đoạn tới mục kế — có thể xuất phát từ một nơi TRƯỚC đó (bỏ qua việc). */
  legKey: string | null;
  /** Không vẽ vạch "di chuyển" tới mục kế: mục kế là việc, hoặc chưa có nơi nào để đi từ đó. */
  legHidden: boolean;
  warnings: TripWarning[];
};

export type ScheduledDay = {
  items: ScheduledItem[];
  startMin: number;
  endMin: number;
  driveMin: number;
  warnings: TripWarning[];
};

/** "0 phút" đọc như lỗi: ở lại 0 phút là GHÉ QUA (chỗ ở thì là mốc nhận phòng). */
export function stayLabel(item: {
  kind: TripItemKind;
  effectiveStayMin: number;
  customPlace?: boolean;
}): string {
  if (item.effectiveStayMin > 0) return fmtDuration(item.effectiveStayMin);
  if (item.kind === "accommodation") return "Nhận phòng";
  // VIỆC (hoạt động, việc tự gõ) 0 phút thì không phải "ghé qua" — chỉ là không tính giờ.
  if (item.kind === "activity" || (item.kind === "custom" && !item.customPlace)) return "0 phút";
  return "Ghé qua";
}

export function legKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

/** Thời lượng thật của một mục: `stayMin` đã chỉnh, không thì đọc `durationText`, không thì mặc định. */
export function effectiveStayMin(
  item: Pick<ScheduleItemInput, "kind" | "stayMin" | "durationText" | "lat" | "lng" | "customPlace" | "special">,
): number {
  if (item.stayMin != null) return Math.max(0, item.stayMin);
  // Vai cũng đổi thời lượng mặc định của mục site: chỗ ở "nhận phòng" là 15 phút, không phải mốc 0.
  if (item.special) return SPECIAL_STAY[item.special];
  if (item.kind === "activity") {
    const parsed = parseDurationMin(item.durationText);
    if (parsed != null) return parsed;
  }
  if (isTask(item)) return TASK_STAY_MIN;
  return DEFAULT_STAY_MIN[item.kind];
}

export function scheduleDay(
  startMin: number,
  items: ScheduleItemInput[],
  drive: Record<string, number>,
  { travel = true }: { travel?: boolean } = {},
): ScheduledDay {
  const out: ScheduledItem[] = [];
  let t = startMin;
  let driveTotal = 0;
  // Việc diễn ra tại NƠI gần nhất phía trước, nên chặng đi tiếp xuất phát từ nơi đó.
  let lastPlace: ScheduleItemInput | null = null;
  // Đã tới ít nhất một NƠI chưa (có toạ độ hay không). Khác `lastPlace`: nơi tự gõ đặt
  // `lastPlace` về null nhưng vẫn là "đang ở đâu đó", nên chặng đi tiếp vẫn phải hiện.
  let seenPlace = false;
  // Nơi đang đứng (kể cả không toạ độ) — chặng đi tiếp xuất phát từ ĐÂY, không phải từ việc.
  let here: ScheduleItemInput | null = null;

  items.forEach((item, i) => {
    const warnings: TripWarning[] = [];
    const arriveMin = t;
    const stay = effectiveStayMin(item);

    const intervals = parseOpeningHours(item.openingHours ?? null);
    const status = openingStatus(intervals, arriveMin % 1440);
    if (status) {
      if (status.kind === "opensLater") {
        warnings.push({
          level: "high",
          code: "opensLater",
          text: `Chưa mở lúc ${formatMinutes(arriveMin)}, mở ${formatMinutes(status.opensAt)}`,
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
    if (!isTask(item)) {
      // Tới một NƠI không có toạ độ (nơi tự gõ) là không còn biết mình đứng đâu: giữ nơi có
      // toạ độ cũ thì chặng kế tiếp bị tính từ chỗ đã rời đi từ lâu.
      lastPlace = hasCoords(item) ? item : null;
      seenPlace = true;
      here = item;
    }

    // Chính mục Di chuyển đã là quãng đi (bay, tàu, xe khách): KHÔNG vẽ chặng ra khỏi nó, và tới nơi rồi thì không còn
    // biết mình đứng đâu — chặng kế tiếp chỉ tính từ NƠI đầu tiên sau nó.
    const travelled = item.special === "transport";
    if (travelled) {
      lastPlace = null;
      here = null;
      seenPlace = false;
    }

    const next = items[i + 1];
    let driveToNextMin: number | null = null;
    let key: string | null = null;
    let legHidden = false;
    if (next && (!travel || isTask(next) || travelled)) {
      legHidden = true;
    } else if (next && !seenPlace && isTask(item)) {
      legHidden = true;
    } else if (next) {
      key = lastPlace && hasCoords(next) ? legKey(lastPlace.id, next.id) : null;
      const known = key ? drive[key] : undefined;
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
      } else if (
        // Chỉ cảnh báo khi một NƠI CỦA SITE thiếu toạ độ (lỗi dữ liệu). Nơi tự gõ thì không có
        // toạ độ là đương nhiên — dòng "chưa ước tính" đã đủ.
        (here && !hasCoords(here) && here.kind !== "custom") ||
        (!hasCoords(next) && next.kind !== "custom")
      ) {
        warnings.push({
          level: "info",
          code: "noCoords",
          text: "Chưa có toạ độ nên không ước tính được đường đi",
        });
      }
    }

    out.push({
      id: item.id,
      arriveMin,
      leaveMin: arriveMin + stay,
      stayMin: stay,
      driveToNextMin,
      legKey: key,
      legHidden,
      warnings,
    });
  });

  const endMin = out.length ? out[out.length - 1].leaveMin : startMin;
  // Biên tập bỏ cảnh báo "ngày dài": ngày đi chơi 14–15 tiếng là chuyện thường, nhắc mãi thành nhiễu.
  return { items: out, startMin, endMin, driveMin: driveTotal, warnings: [] };
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
