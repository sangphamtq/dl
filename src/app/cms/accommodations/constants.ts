export const ACCOMMODATION_CATEGORIES: { value: string; label: string }[] = [
  { value: "hotel", label: "Khách sạn" },
  { value: "homestay", label: "Homestay" },
  { value: "resort", label: "Resort" },
  { value: "hostel", label: "Hostel" },
  { value: "guesthouse", label: "Nhà nghỉ" },
  { value: "villa", label: "Villa" },
];

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
