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

/* ──────────────────────────────────────────────────────────────────
   Chi phí TẠI CHỖ ngoài vé (Spot.extraFees / Activity.extraFees)
   — gửi xe, xe ôm bản địa chở lên đỉnh, thuê phao, thuê gậy…

   CỐ Ý là danh sách RIÊNG, không phải thêm loại vào `ticketTiers`:
   `ticketPriceLabel()` lấy giá NHỎ NHẤT trong tiers để in "Từ …đ" ở chip
   hero và thẻ danh sách, nên một dòng "Gửi xe 10.000đ" nằm chung sẽ biến
   giá vào cổng của cả địa điểm thành "Từ 10.000đ".

   Ba trường không có ở `TicketTier`, và đó là lý do phải tách kiểu:
     · `unit`     — vé luôn tính theo đầu người, dịch vụ thì không
                    ("150.000đ" cho xe ôm là /người hay /nhóm?);
     · `priceTo`  — giá thoả thuận vùng cao gần như luôn là một KHOẢNG;
     · `required` — trả lời "cầm tối thiểu bao nhiêu tiền mặt". Gửi xe là
                    phải trả nếu đi xe máy; thuê phao thì tuỳ.
   ────────────────────────────────────────────────────────────────── */

export type ExtraFee = {
  label: string;
  price: number | null; // VND; null = thoả thuận tại chỗ
  priceTo: number | null; // đầu kia của khoảng giá (null = giá đơn)
  unit: string | null; // "/xe", "/người", "/lượt", "/nhóm"…
  required: boolean; // gần như bắt buộc (gửi xe) vs tuỳ chọn (thuê phao)
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
    // Khoảng giá ngược hoặc bằng nhau thì coi như giá đơn — hiển thị
    // "100.000đ" chứ không phải "100.000 – 100.000đ".
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

// Nhãn giá của một dịch vụ: "10.000đ /xe" · "100.000 – 150.000đ /người"
// · "Thoả thuận". Đơn vị đi kèm giá nên trả về cả hai mảnh để chỗ hiển thị
// tự chọn cách xuống dòng.
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

/* Một dòng chi phí ở form CMS (giá nhập text) — chuẩn hoá bằng
   `normalizeExtraFees` ở server action. Để CHUNG ở đây thay vì chép sang cả
   `cms/spots/actions.ts` lẫn `cms/activities/actions.ts`: hai bên phải nhận
   cùng một tập giá trị, lệch một luật validate là dữ liệu hai bảng lệch nhau. */
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
    if (!label) continue; // dòng trống = bỏ, không báo lỗi
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
