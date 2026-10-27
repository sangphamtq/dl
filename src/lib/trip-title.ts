/** "3 ngày 2 đêm" — 1 ngày thì không có đêm. */
export function tripSpan(days: number): string {
  return days > 1 ? `${days} ngày ${days - 1} đêm` : `${days} ngày`;
}

/** Tên mặc định khi người tạo chuyến để trống: "Cao Bằng 3 ngày 2 đêm". */
export function defaultTripTitle(placeName: string | null | undefined, days: number): string {
  return placeName ? `${placeName} ${tripSpan(days)}` : `Chuyến đi ${tripSpan(days)}`;
}
