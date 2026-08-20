// Toán chia tiền của mục Chi phí — THUẦN: không Prisma, không React, không
// "bây giờ". Nhờ vậy kiểm được bằng `pnpm check:trip-money`, và tiền bạc thì
// đáng có một bộ kiểm riêng.

/** Không ai chuyển khoản 33.333đ. Mọi phần chia đều làm tròn LÊN bội số này. */
export const UNIT = 1_000;

export const ceilTo = (n: number, unit = UNIT) => Math.ceil(n / unit) * unit;

export type ExpenseInput = {
  amount: number; // đồng, số nguyên
  paidById: string | null;
  shareIds: string[]; // chia ĐỀU cho những người này
};

/**
 * Chia `amount` cho `n` người bằng SỐ NGUYÊN ĐỒNG.
 *
 * Phần lẻ dồn cho những người ĐẦU danh sách, mỗi người thêm đúng 1 đồng — nhờ
 * vậy tổng các phần luôn bằng đúng `amount`. Chia rồi làm tròn từng phần thì
 * 100.000đ cho 3 người ra 33.333×3 = 99.999, thiếu 1 đồng không biết đi đâu.
 */
export function splitEven(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(amount / n);
  const rest = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Chia một khoản cho `ids`, **làm tròn LÊN nghìn**, nhưng tổng vẫn đúng bằng
 * `amount`.
 *
 * Cách làm: mọi người trừ MỘT NGƯỜI HỨNG PHẦN LẺ đều trả đúng một số tròn
 * nghìn; người hứng lấy phần còn lại. Người hứng mặc định là **người ứng tiền**
 * — họ vốn không phải chuyển khoản cho ai, nên số lẻ nằm ở họ là chỗ vô hại
 * nhất; còn những người phải chuyển tiền thì luôn có một con số tròn để gõ vào
 * app ngân hàng.
 *
 *   100.000 chia 3 (A ứng tiền) → B 34.000 · C 34.000 · A 32.000  (tổng 100.000)
 *
 * Nếu làm tròn lên khiến phần của những người kia đã vượt quá `amount` (khoản
 * quá nhỏ so với số người), quay về chia đều chính xác — thà số lẻ còn hơn bịa
 * ra tiền không có.
 */
export function splitShares(
  amount: number,
  ids: string[],
  absorberId: string | null,
): Map<string, number> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  if (ids.length === 1) return out.set(ids[0], amount);

  const absorber = absorberId && ids.includes(absorberId) ? absorberId : ids[0];
  const others = ids.filter((id) => id !== absorber);
  const per = ceilTo(amount / ids.length);
  const othersTotal = per * others.length;

  if (othersTotal >= amount) {
    const exact = splitEven(amount, ids.length);
    ids.forEach((id, i) => out.set(id, exact[i]));
    return out;
  }

  for (const id of others) out.set(id, per);
  out.set(absorber, amount - othersTotal);
  return out;
}

/**
 * Số dư từng người: **đã trả − phải chịu**.
 *   > 0 → người khác đang nợ mình;  < 0 → mình đang nợ.
 *
 * Người không nằm trong `peopleIds` (đã rời chuyến) vẫn được tính nếu còn dính
 * tới khoản chi — bỏ họ ra là tổng số dư lệch khỏi 0 và mọi con số sau đó sai.
 */
export function balances(expenses: ExpenseInput[], peopleIds: string[]): Map<string, number> {
  const out = new Map<string, number>(peopleIds.map((id) => [id, 0]));
  const bump = (id: string, delta: number) => out.set(id, (out.get(id) ?? 0) + delta);

  for (const e of expenses) {
    if (e.paidById) bump(e.paidById, e.amount);
    for (const [id, part] of splitShares(e.amount, e.shareIds, e.paidById)) bump(id, -part);
  }
  return out;
}

export type Settlement = { fromId: string; toId: string; amount: number };

/**
 * "Ai trả ai bao nhiêu" — ghép người nợ nhiều nhất với người được nợ nhiều
 * nhất, lặp lại. Cách tham lam này không phải lúc nào cũng cho SỐ LƯỢT ít nhất
 * về mặt toán học, nhưng với nhóm 3–6 người nó ra kết quả tối ưu trong thực tế
 * và đọc được — thứ quan trọng hơn ở đây là ít lượt chuyển khoản, không phải
 * tối ưu tuyệt đối.
 *
 * Bỏ qua số dư dưới 1 đồng để khỏi đẻ ra những lượt "chuyển 0đ".
 */
export function settlements(bal: Map<string, number>): Settlement[] {
  const debtors = [...bal].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }));
  const creditors = [...bal].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }));
  // Sắp xếp ổn định theo (số tiền giảm dần, id) — cùng dữ liệu thì luôn ra cùng
  // một danh sách, không nhảy lung tung giữa hai lần mở trang.
  const cmp = (a: { id: string; v: number }, b: { id: string; v: number }) =>
    b.v - a.v || a.id.localeCompare(b.id);
  debtors.sort(cmp);
  creditors.sort(cmp);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    if (pay >= 1) out.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: pay });
    debtors[i].v -= pay;
    creditors[j].v -= pay;
    if (debtors[i].v < 1) i++;
    if (creditors[j].v < 1) j++;
  }
  return out;
}
