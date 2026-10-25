import type { GlyphName } from "@/components/site/glyphs";

export type TripSection = {
  token: string | null;
  label: string;
  glyph: GlyphName;
  /** Vẫn vào được bằng URL, nhưng không hiện ở menu mục. */
  hidden?: boolean;
};

export const TRIP_SECTIONS: TripSection[] = [
  { token: null, label: "Lịch trình", glyph: "route" },
  { token: "ban-do", label: "Bản đồ", glyph: "pin" },
  // Ghi chú đã nằm ở cột phải tab Lịch trình — bỏ khỏi menu cho khỏi hai lối vào một chỗ.
  { token: "ghi-chu", label: "Ghi chú", glyph: "note", hidden: true },
  { token: "do-mang-theo", label: "Đồ mang theo", glyph: "bag" },
  { token: "chi-phi", label: "Chi phí", glyph: "wallet" },
];

/** Các mục hiện ở menu (cột trái + tấm chọn mục trên điện thoại). */
export const TRIP_NAV = TRIP_SECTIONS.filter((s) => !s.hidden);

export const tripSectionHref = (tripId: string, token: string | null) =>
  token ? `/lich-trinh/cua-toi/${tripId}/${token}` : `/lich-trinh/cua-toi/${tripId}`;

export const findTripSection = (token: string) =>
  TRIP_SECTIONS.find((s) => s.token === token) ?? null;
