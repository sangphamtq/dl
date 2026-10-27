import type { GlyphName } from "@/components/site/glyphs";

/** Mục ĐẶC BIỆT của lịch trình — một mục tự thêm có hình thù riêng. Xem `TripItem.special` trong schema. */
export type TripSpecial = "transport" | "checkin" | "checkout" | "meal" | "rest";
export type TravelMode = "plane" | "train" | "bus" | "car" | "motorbike" | "boat";

export const SPECIALS: { special: TripSpecial; label: string; glyph: GlyphName; hint: string }[] = [
  { special: "transport", label: "Di chuyển", glyph: "bus", hint: "Máy bay, tàu, xe khách…" },
  { special: "checkin", label: "Nhận phòng", glyph: "bed", hint: "Kèm mã đặt phòng" },
  { special: "checkout", label: "Trả phòng", glyph: "bed", hint: "Kèm mã đặt phòng" },
  { special: "meal", label: "Bữa ăn", glyph: "bowl", hint: "Chưa chọn quán" },
  { special: "rest", label: "Nghỉ", glyph: "clock", hint: "Nghỉ trưa, tự do" },
];

export const SPECIAL_LABEL: Record<TripSpecial, string> = Object.fromEntries(
  SPECIALS.map((s) => [s.special, s.label]),
) as Record<TripSpecial, string>;

/** Thời lượng mặc định khi chưa chỉnh (`stayMin = null`). Nhận/trả phòng là MỐC ngắn. */
export const SPECIAL_STAY: Record<TripSpecial, number> = {
  transport: 120,
  checkin: 15,
  checkout: 15,
  meal: 60,
  rest: 60,
};

export const TRAVEL_MODES: { mode: TravelMode; label: string; glyph: GlyphName }[] = [
  { mode: "plane", label: "Máy bay", glyph: "plane" },
  { mode: "train", label: "Tàu hoả", glyph: "train" },
  { mode: "bus", label: "Xe khách", glyph: "bus" },
  { mode: "car", label: "Ô tô", glyph: "car" },
  { mode: "motorbike", label: "Xe máy", glyph: "two-wheel" },
  { mode: "boat", label: "Tàu, thuyền", glyph: "boat" },
];

export const MEAL_PRESETS = ["Ăn sáng", "Ăn trưa", "Ăn tối", "Ăn vặt"];
export const REST_PRESETS = ["Nghỉ trưa", "Tự do khám phá", "Nghỉ ở chỗ ở"];

export function travelModeOf(mode: string | null | undefined) {
  return TRAVEL_MODES.find((m) => m.mode === mode) ?? null;
}

export function specialGlyph(special: TripSpecial, mode?: string | null): GlyphName {
  if (special === "transport") return travelModeOf(mode)?.glyph ?? "route";
  return SPECIALS.find((s) => s.special === special)!.glyph;
}

/**
 * Tên hiển thị. Di chuyển để trống tiêu đề thì ghép "Hà Nội – Sa Pa" (gạch ngang, KHÔNG mũi tên — luật §3), thiếu cả hai
 * đầu thì lấy tên phương tiện. Loại khác để trống thì lấy nhãn loại.
 */
export function specialTitle(i: {
  special: TripSpecial;
  title: string | null;
  travelMode?: string | null;
  travelFrom?: string | null;
  travelTo?: string | null;
}): string {
  const t = i.title?.trim();
  if (t) return t;
  if (i.special === "transport") {
    const route = [i.travelFrom?.trim(), i.travelTo?.trim()].filter(Boolean).join(" – ");
    return route || travelModeOf(i.travelMode)?.label || SPECIAL_LABEL.transport;
  }
  return SPECIAL_LABEL[i.special];
}
