import type { GlyphName } from "@/components/site/glyphs";

export type TripSection = {
  token: string | null;
  label: string;
  glyph: GlyphName;
};

export const TRIP_SECTIONS: TripSection[] = [
  { token: null, label: "Lịch trình", glyph: "route" },
  { token: "ban-do", label: "Bản đồ", glyph: "pin" },
  { token: "ghi-chu", label: "Ghi chú", glyph: "note" },
  { token: "do-mang-theo", label: "Đồ mang theo", glyph: "bag" },
  { token: "chi-phi", label: "Chi phí", glyph: "wallet" },
];

export const tripSectionHref = (tripId: string, token: string | null) =>
  token ? `/lich-trinh/cua-toi/${tripId}/${token}` : `/lich-trinh/cua-toi/${tripId}`;

export const findTripSection = (token: string) =>
  TRIP_SECTIONS.find((s) => s.token === token) ?? null;
