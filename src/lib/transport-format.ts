import type { GlyphName } from "@/components/site/glyphs";

/* Hình vẽ theo HỌ phương tiện, không theo từng `mode` (xem CLAUDE.md §Transport). */
export const MODE_GLYPH: Record<string, GlyphName> = {
  car: "car",
  taxi: "car",
  grab: "car",
  shuttle: "car",
  bus: "bus",
  train: "train",
  plane: "plane",
  boat: "boat",
  motorbike: "two-wheel",
  bike: "two-wheel",
  cyclo: "two-wheel",
  walk: "walk",
  other: "navigation",
};

export function shortVnd(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/[.,]0$/, "").replace(".", ",")}tr`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}đ`;
}

export function money(from: number | null, to: number | null): string | null {
  if (from == null && to == null) return null;
  if (from != null && to != null)
    return from === to ? shortVnd(from) : `${shortVnd(from)}–${shortVnd(to)}`;
  if (from != null) return `từ ${shortVnd(from)}`;
  return `đến ${shortVnd(to as number)}`;
}
