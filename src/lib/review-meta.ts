import type { ReviewStance } from "@/generated/prisma/enums";

export type { ReviewStance };

export type AspectOption = { value: string; label: string };
export type AspectCount = AspectOption & { count: number };
export type StanceTone = "positive" | "posSoft" | "negSoft" | "negative";

export const REVIEW_STANCES = [
  { value: "love", label: "Tuyệt vời, muốn quay lại", tone: "positive" },
  { value: "worthOnce", label: "Đáng đi một lần", tone: "posSoft" },
  { value: "meh", label: "Không có gì đặc biệt", tone: "negSoft" },
  { value: "bad", label: "Thất vọng, không nên đi", tone: "negative" },
] as const satisfies ReadonlyArray<{
  value: ReviewStance;
  label: string;
  tone: StanceTone;
}>;

const WORTH_GOING: ReviewStance[] = ["love", "worthOnce"];

export const SCORE_POS: Record<ReviewStance, number> = {
  love: 2,
  worthOnce: 1,
  meh: 0,
  bad: 0,
};
export const SCORE_NEG: Record<ReviewStance, number> = {
  love: 0,
  worthOnce: 0,
  meh: 1,
  bad: 2,
};

export const REVIEW_HIGHLIGHTS = [
  { value: "scenery", label: "Cảnh đẹp" },
  { value: "fresh-air", label: "Trong lành, mát mẻ" },
  { value: "photogenic", label: "Hợp chụp ảnh" },
  { value: "food", label: "Đồ ăn ngon" },
  { value: "peaceful", label: "Yên tĩnh, thư giãn" },
  { value: "family", label: "Hợp gia đình" },
  { value: "adventure", label: "Hợp phượt / cắm trại" },
  { value: "friendly", label: "Người dân thân thiện" },
  { value: "culture", label: "Văn hoá đặc sắc" },
  { value: "unspoiled", label: "Ít khách, hoang sơ" },
  { value: "affordable", label: "Chi phí hợp lý" },
  { value: "worth-it", label: "Đáng công đi" },
] as const satisfies ReadonlyArray<AspectOption>;

export const REVIEW_CAVEATS = [
  { value: "crowded", label: "Đông cuối tuần / lễ" },
  { value: "hard-road", label: "Đường đèo dốc khó đi" },
  { value: "far", label: "Xa, di chuyển lâu" },
  { value: "overpriced", label: "Dễ bị chặt chém" },
  { value: "few-services", label: "Ít dịch vụ ăn / ở" },
  { value: "weather", label: "Thời tiết thất thường" },
  { value: "lots-walking", label: "Đi bộ / leo nhiều" },
  { value: "weak-signal", label: "Sóng điện thoại yếu" },
  { value: "seasonal", label: "Phải đi đúng mùa" },
] as const satisfies ReadonlyArray<AspectOption>;

const HIGHLIGHT_VALUES: Set<string> = new Set(
  REVIEW_HIGHLIGHTS.map((o) => o.value),
);
const CAVEAT_VALUES: Set<string> = new Set(REVIEW_CAVEATS.map((o) => o.value));

const MAX_ASPECTS = 8;
export const MAX_CONTENT = 2000;

export function isStance(v: unknown): v is ReviewStance {
  return v === "love" || v === "worthOnce" || v === "meh" || v === "bad";
}

/* Tông cảm nhận → màu CHỮ. Để ở `lib/` vì hai nơi dùng chung (mục Đánh giá và
   popup "Vivu-er đã đến"); chép ra hai bản là kiểu trôi mỗi nơi một màu.

   Dùng bản `-ink` cho cả hai tông dương: đây là CHỮ trên nền sáng, mà
   `--primary`/`--warm` được chỉnh cho mảng nền đặc — làm chữ trên nền sáng thì
   trượt tương phản (xem quy ước màu trong CLAUDE.md). */
export const STANCE_TEXT: Record<StanceTone, string> = {
  positive: "text-primary-ink",
  posSoft: "text-primary-ink",
  negSoft: "text-warm-ink",
  negative: "text-destructive",
};

export function stanceMeta(value: ReviewStance) {
  return REVIEW_STANCES.find((s) => s.value === value) ?? REVIEW_STANCES[0];
}

export function sanitizeAspects(input: unknown, kind: "highlights" | "caveats"): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = kind === "highlights" ? HIGHLIGHT_VALUES : CAVEAT_VALUES;
  const out: string[] = [];
  for (const v of input) {
    if (typeof v === "string" && allowed.has(v) && !out.includes(v)) out.push(v);
    if (out.length >= MAX_ASPECTS) break;
  }
  return out;
}

export function labelsFor(kind: "highlights" | "caveats", values: string[]): AspectOption[] {
  const list = kind === "highlights" ? REVIEW_HIGHLIGHTS : REVIEW_CAVEATS;
  return list.filter((o) => values.includes(o.value));
}

type ReviewRow = {
  stance: ReviewStance;
  highlights: string[];
  caveats: string[];
};

export type ReviewSummary = {
  total: number;
  worthGoingPct: number;
  lovePct: number;
  score: number;
  stars: number;
  stance: { value: ReviewStance; label: string; tone: StanceTone; count: number; pct: number }[];
  highlights: AspectCount[];
  caveats: AspectCount[];
};

export function summarizeReviews(rows: ReviewRow[]): ReviewSummary {
  const total = rows.length;
  const stanceCount = Object.fromEntries(
    REVIEW_STANCES.map((s) => [s.value, 0]),
  ) as Record<ReviewStance, number>;
  const hi = new Map<string, number>();
  const ca = new Map<string, number>();
  for (const r of rows) {
    stanceCount[r.stance] = (stanceCount[r.stance] ?? 0) + 1;
    for (const v of r.highlights) hi.set(v, (hi.get(v) ?? 0) + 1);
    for (const v of r.caveats) ca.set(v, (ca.get(v) ?? 0) + 1);
  }
  const toCounts = (m: Map<string, number>, list: ReadonlyArray<AspectOption>): AspectCount[] =>
    list
      .map((o) => ({ value: o.value, label: o.label, count: m.get(o.value) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

  const worthGoingCount = WORTH_GOING.reduce(
    (n, v) => n + stanceCount[v],
    0,
  );
  let pos = 0;
  let neg = 0;
  for (const s of REVIEW_STANCES) {
    pos += SCORE_POS[s.value] * stanceCount[s.value];
    neg += SCORE_NEG[s.value] * stanceCount[s.value];
  }
  const ratio = pos + neg > 0 ? pos / (pos + neg) : 0;
  return {
    total,
    worthGoingPct: total ? Math.round((worthGoingCount / total) * 100) : 0,
    lovePct: total ? Math.round((stanceCount.love / total) * 100) : 0,
    score: Math.round(ratio * 100),
    stars: Math.round(ratio * 5 * 10) / 10,
    stance: REVIEW_STANCES.map((s) => ({
      value: s.value,
      label: s.label,
      tone: s.tone,
      count: stanceCount[s.value],
      pct: total ? Math.round((stanceCount[s.value] / total) * 100) : 0,
    })),
    highlights: toCounts(hi, REVIEW_HIGHLIGHTS),
    caveats: toCounts(ca, REVIEW_CAVEATS),
  };
}
