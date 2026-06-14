export const TRANSPORT_DIRECTIONS: { value: string; label: string }[] = [
  { value: "getTo", label: "Đến nơi (từ bên ngoài)" },
  { value: "getAround", label: "Đi lại tại chỗ" },
];

export const TRANSPORT_MODES: { value: string; label: string }[] = [
  { value: "car", label: "Ô tô" },
  { value: "bus", label: "Xe khách" },
  { value: "train", label: "Tàu hỏa" },
  { value: "plane", label: "Máy bay" },
  { value: "boat", label: "Tàu / thuyền" },
  { value: "motorbike", label: "Xe máy" },
  { value: "taxi", label: "Taxi" },
  { value: "grab", label: "Grab / xe công nghệ" },
  { value: "bike", label: "Xe đạp" },
  { value: "walk", label: "Đi bộ" },
  { value: "cyclo", label: "Xích lô" },
  { value: "shuttle", label: "Xe trung chuyển" },
  { value: "other", label: "Khác" },
];

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
