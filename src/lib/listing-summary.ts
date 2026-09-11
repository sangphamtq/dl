export type LabelCount = { label: string; count: number };

export function compositionLine(
  cats: LabelCount[],
  total: number,
): string | null {
  if (total < 3 || cats.length === 0) return null;
  const low = (t: string) => t.toLowerCase();
  if (cats.length === 1) return `Tất cả là ${low(cats[0]!.label)}`;
  if (cats[0]!.count > cats[1]!.count)
    return `Nhiều nhất là ${low(cats[0]!.label)}`;
  return `Đủ kiểu: ${cats
    .slice(0, 3)
    .map((c) => low(c.label))
    .join(", ")}`;
}

export function countByLabel(labels: (string | null | undefined)[]): LabelCount[] {
  const map = new Map<string, number>();
  for (const l of labels) {
    if (!l) continue;
    map.set(l, (map.get(l) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
}
