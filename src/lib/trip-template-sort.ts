export const TRIP_SORTS = [
  { key: "noi-bat", label: "Nổi bật" },
  { key: "ngan-nhat", label: "Ngắn nhất" },
  { key: "dai-nhat", label: "Dài nhất" },
  { key: "nhieu-diem", label: "Nhiều điểm dừng" },
] as const;

export type TripSortKey = (typeof TRIP_SORTS)[number]["key"];
