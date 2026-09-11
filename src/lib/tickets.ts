export type TicketTier = {
  label: string;
  price: number | null;
  note: string | null;
};

const vnd = new Intl.NumberFormat("vi-VN");

export function formatVnd(n: number): string {
  return `${vnd.format(n)}đ`;
}

export function tierPriceLabel(t: TicketTier): string {
  return t.price == null || t.price === 0 ? "Miễn phí" : formatVnd(t.price);
}

export function parseTicketTiers(value: unknown): TicketTier[] {
  if (!Array.isArray(value)) return [];
  const out: TicketTier[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const price =
      typeof o.price === "number" && Number.isFinite(o.price) && o.price >= 0
        ? Math.round(o.price)
        : null;
    const note =
      typeof o.note === "string" && o.note.trim() ? o.note.trim() : null;
    out.push({ label, price, note });
  }
  return out;
}

export function ticketPriceLabel(
  ticketFree: boolean,
  ticketTiers: unknown,
): string | null {
  if (ticketFree) return "Miễn phí";
  const prices = parseTicketTiers(ticketTiers)
    .map((t) => t.price)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  return `Từ ${formatVnd(Math.min(...prices))}`;
}

export type ExtraFee = {
  label: string;
  price: number | null;
  priceTo: number | null;
  unit: string | null;
  required: boolean;
  note: string | null;
};

export function parseExtraFees(value: unknown): ExtraFee[] {
  if (!Array.isArray(value)) return [];
  const out: ExtraFee[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const money = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0
        ? Math.round(v)
        : null;
    const price = money(o.price);
    let priceTo = money(o.priceTo);
    if (price == null || priceTo == null || priceTo <= price) priceTo = null;
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    out.push({
      label,
      price,
      priceTo,
      unit: str(o.unit),
      required: o.required === true,
      note: str(o.note),
    });
  }
  return out;
}

export function feePriceLabel(f: ExtraFee): { price: string; unit: string | null } {
  const price =
    f.price == null
      ? "Thoả thuận"
      : f.priceTo != null
        ? `${vnd.format(f.price)} – ${formatVnd(f.priceTo)}`
        : f.price === 0
          ? "Miễn phí"
          : formatVnd(f.price);
  return { price, unit: f.unit };
}

export type ExtraFeeInput = {
  label: string;
  price: string;
  priceTo: string;
  unit: string;
  required: boolean;
  note: string;
};

export function normalizeExtraFees(
  rows: ExtraFeeInput[],
): { fees: ExtraFee[] } | { error: string } {
  const fees: ExtraFee[] = [];
  for (const r of rows) {
    const label = r.label.trim();
    if (!label) continue;
    const parse = (v: string) => {
      if (v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };
    const price = parse(r.price);
    const priceTo = parse(r.priceTo);
    if (Number.isNaN(price) || Number.isNaN(priceTo))
      return { error: `Giá của "${label}" phải là số.` };
    if ((price != null && price < 0) || (priceTo != null && priceTo < 0))
      return { error: `Giá của "${label}" không được âm.` };
    if (priceTo != null && price == null)
      return { error: `"${label}" có giá đến mà thiếu giá từ.` };
    if (price != null && priceTo != null && priceTo <= price)
      return { error: `Khoảng giá của "${label}" phải tăng dần.` };
    fees.push({
      label,
      price,
      priceTo,
      unit: r.unit.trim() || null,
      required: r.required,
      note: r.note.trim() || null,
    });
  }
  return { fees };
}
