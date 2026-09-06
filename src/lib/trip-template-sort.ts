// Các kiểu sắp xếp cho danh sách lịch trình mẫu (/lich-trinh).
//
// Để ở `lib/` chứ KHÔNG khai trong `trip-controls.tsx`: file đó có "use client",
// mà export của một module client khi nhìn từ Server Component chỉ là *client
// reference* — `TRIP_SORTS.find(...)` sẽ ném "is not a function" lúc chạy, trong
// khi typecheck và lint đều xanh. Đã dính đúng lỗi này một lần.
export const TRIP_SORTS = [
  { key: "noi-bat", label: "Nổi bật" },
  { key: "ngan-nhat", label: "Ngắn nhất" },
  { key: "dai-nhat", label: "Dài nhất" },
  { key: "nhieu-diem", label: "Nhiều điểm dừng" },
] as const;

export type TripSortKey = (typeof TRIP_SORTS)[number]["key"];
