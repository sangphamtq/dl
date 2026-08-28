import { revalidatePath } from "next/cache";

/**
 * Xoá cache các trang CÔNG KHAI bị ảnh hưởng khi một `Listing` (Spot, Eatery,
 * Accommodation, Activity…) được thêm/sửa/xoá/xuất bản.
 *
 * `/diem-den` chạy ISR và đếm những thứ này ở ba chỗ: nhãn nút "Xem N địa điểm"
 * trên hero, bảng dữ kiện của từng thẻ điểm đến, và danh sách tên nơi trong thẻ
 * tỉnh. Không gọi hàm này thì các con số đó đứng im cho tới khi hết hạn cache.
 *
 * Gom vào một chỗ để mỗi module CMS chỉ cần nhớ MỘT tên hàm — rải
 * `revalidatePath` trong từng action là kiểu sớm muộn cũng sót một chỗ.
 */
export function revalidateListingPages(placeSlug?: string | null) {
  revalidatePath("/diem-den");
  revalidatePath("/dia-diem");
  if (placeSlug) revalidatePath(`/diem-den/${placeSlug}`);
}
