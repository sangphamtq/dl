const UNIT = 1_000;

export const ceilTo = (n: number, unit = UNIT) => Math.ceil(n / unit) * unit;

export type ExpenseInput = {
  amount: number;
  paidById: string | null;
  shareIds: string[];
  /** `contribution` = góp quỹ: `paidById` góp vào quỹ, không có phần chia. */
  kind?: "expense" | "contribution";
  /** Khoản chi trả bằng quỹ chung. */
  fromFund?: boolean;
};

export function splitEven(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(amount / n);
  const rest = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

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
 * Số dư mỗi người (dương = được nhận). Quỹ chung là một "người" thứ N+1, nhưng tiền của nó NẰM Ở
 * NGƯỜI GIỮ QUỸ — nên phần của quỹ cộng thẳng vào `fundKeeperId`. Nhờ vậy "ai trả ai" chỉ còn những
 * lượt chuyển khoản giữa NGƯỜI với NGƯỜI, đúng như ngoài đời: quỹ còn dư thì người giữ trả lại
 * cho người đã góp, quỹ hụt thì người dùng quỹ góp thêm cho người giữ.
 */
export function balances(
  expenses: ExpenseInput[],
  peopleIds: string[],
  fundKeeperId: string | null = null,
): Map<string, number> {
  const out = new Map<string, number>(peopleIds.map((id) => [id, 0]));
  const bump = (id: string | null, delta: number) => {
    if (id) out.set(id, (out.get(id) ?? 0) + delta);
  };

  for (const e of expenses) {
    if (e.kind === "contribution") {
      bump(e.paidById, e.amount);
      bump(fundKeeperId, -e.amount);
      continue;
    }
    const payer = e.fromFund ? fundKeeperId : e.paidById;
    bump(payer, e.amount);
    // Quỹ trả thì không ai "ứng" — phần lẻ rơi vào người đầu danh sách chia.
    for (const [id, part] of splitShares(e.amount, e.shareIds, e.fromFund ? null : e.paidById)) bump(id, -part);
  }
  return out;
}

/** Quỹ chung: đã góp, đã chi từ quỹ, còn lại (âm = quỹ đang hụt). */
export function fundSummary(expenses: ExpenseInput[]) {
  const contributed = expenses.filter((e) => e.kind === "contribution").reduce((n, e) => n + e.amount, 0);
  const spent = expenses.filter((e) => e.kind !== "contribution" && e.fromFund).reduce((n, e) => n + e.amount, 0);
  return { contributed, spent, left: contributed - spent };
}

/** Một người trong sổ: phần mình tiêu, mình đã trả hộ, mình đã góp quỹ. */
export function personSummary(expenses: ExpenseInput[], id: string) {
  let spent = 0;
  let paid = 0;
  let contributed = 0;
  for (const e of expenses) {
    if (e.kind === "contribution") {
      if (e.paidById === id) contributed += e.amount;
      continue;
    }
    if (!e.fromFund && e.paidById === id) paid += e.amount;
    spent += splitShares(e.amount, e.shareIds, e.fromFund ? null : e.paidById).get(id) ?? 0;
  }
  return { spent, paid, contributed };
}

export type Settlement = { fromId: string; toId: string; amount: number };

export function settlements(bal: Map<string, number>): Settlement[] {
  const debtors = [...bal].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }));
  const creditors = [...bal].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }));
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
