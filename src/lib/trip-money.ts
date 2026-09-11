const UNIT = 1_000;

export const ceilTo = (n: number, unit = UNIT) => Math.ceil(n / unit) * unit;

export type ExpenseInput = {
  amount: number;
  paidById: string | null;
  shareIds: string[];
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
