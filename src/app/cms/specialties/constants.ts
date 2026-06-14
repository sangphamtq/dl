export const SPECIALTY_KINDS: { value: string; label: string }[] = [
  { value: "dish", label: "Món ăn (ăn tại quán)" },
  { value: "product", label: "Sản vật / quà (mua mang về)" },
];

export const PRICE_RANGES: { value: string; label: string }[] = [
  { value: "budget", label: "$ · Bình dân" },
  { value: "moderate", label: "$$ · Vừa" },
  { value: "premium", label: "$$$ · Cao" },
  { value: "luxury", label: "$$$$ · Sang" },
];

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
