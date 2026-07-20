// Vé vào cửa của Spot — danh sách loại vé (lưu dạng Json trên Spot.ticketTiers).
// price tính theo VND; null/0 = miễn phí cho loại vé đó.

export type TicketTier = {
  label: string;
  price: number | null;
  note: string | null;
};

const vnd = new Intl.NumberFormat("vi-VN");

export function formatVnd(n: number): string {
  return `${vnd.format(n)}đ`;
}

// Nhãn giá của một loại vé để hiển thị.
export function tierPriceLabel(t: TicketTier): string {
  return t.price == null || t.price === 0 ? "Miễn phí" : formatVnd(t.price);
}

// Đọc & lọc tiers từ giá trị Json trong DB (an toàn với dữ liệu lạ).
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

// Nhãn giá vé từ ticketFree / ticketTiers (dùng cho cả spot lẫn activity).
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
