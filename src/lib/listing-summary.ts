/* Câu THÀNH PHẦN của một danh sách listing — dùng chung cho dải dữ kiện mở đầu
   của các tab (Địa điểm · Ẩm thực · Nơi lưu trú · Trải nghiệm).

   Vì sao cần: mục đầu của dải dữ kiện ở mọi tab từng là "n địa điểm" / "n quán"
   / "n hoạt động" — mà con số đó đã nằm sẵn ở chỗ khác trên cùng màn hình (chip
   "Tất cả n", hoặc dòng kết quả ngay dưới bộ lọc). Câu này thay vào đó nói THÀNH
   PHẦN của tập, thứ chỉ thấy được khi nhìn cả danh sách, và khác nhau ở từng
   điểm đến — Phan Thiết ra "nhiều nhất là biển", Tà Xùa ra "điểm ngắm cảnh".

   Dùng chữ **"nhiều nhất"** chứ không phải "phần lớn": trên dữ liệu thật loại
   đông nhất cũng chỉ chiếm khoảng một phần ba (Phan Thiết 3/8 địa điểm là
   biển), gọi thế là "phần lớn" thì nói quá. Bản đầu đặt ngưỡng 40% cho chữ
   "phần lớn" và kết quả là KHÔNG điểm đến nào chạm ngưỡng — câu đó không bao
   giờ hiện. */

export type LabelCount = { label: string; count: number };

/**
 * @param cats  các loại CÓ THẬT trong tập, đã xếp giảm dần theo số lượng
 * @param total tổng số mục
 * @returns câu thành phần, hoặc null khi tập quá nhỏ để nói được gì
 */
export function compositionLine(
  cats: LabelCount[],
  total: number,
): string | null {
  // Dưới 3 mục thì "nhiều nhất" chỉ là cách nói vòng cho "có 2 cái" — thà đếm.
  if (total < 3 || cats.length === 0) return null;
  const low = (t: string) => t.toLowerCase();
  if (cats.length === 1) return `Tất cả là ${low(cats[0]!.label)}`;
  if (cats[0]!.count > cats[1]!.count)
    return `Nhiều nhất là ${low(cats[0]!.label)}`;
  // Không loại nào trội hẳn → kể ba loại đầu, đó mới là tin.
  return `Đủ kiểu: ${cats
    .slice(0, 3)
    .map((c) => low(c.label))
    .join(", ")}`;
}

/** Đếm theo nhãn rồi xếp giảm dần (nhiều nhất trước, rồi ABC tiếng Việt). */
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
