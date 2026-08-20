import { Backpack, NotebookPen, Route, Wallet } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";

// Các mục của MỘT lịch trình — nguồn chân lý duy nhất cho sidebar, route
// `[muc]`, và trang "sắp ra mắt". Thêm mục mới thì chỉ sửa ở đây.
// Phân tích & lý do bố cục: docs/lich-trinh-cong-cu-nhom.md.
export type TripSection = {
  /** Token trên URL. `null` = mục Lịch trình, nằm thẳng ở /lich-trinh/[id]. */
  token: string | null;
  label: string;
  icon: LucideIcon;
};

// ❌ ĐÃ BỎ mục "Phân công". Lý do ghi ở docs/lich-trinh-cong-cu-nhom.md §9 bước 5:
// `TripPackItem.assigneeId` (ai mang món gì) cộng với `TripItem.note` của từng
// điểm dừng đã phủ hết nhu cầu thật; một danh sách việc riêng chỉ thành **danh
// sách thứ tư không ai điền**.
export const TRIP_SECTIONS: TripSection[] = [
  { token: null, label: "Lịch trình", icon: Route },
  {
    token: "ghi-chu",
    label: "Ghi chú",
    icon: NotebookPen,
  },
  {
    token: "do-mang-theo",
    label: "Đồ mang theo",
    icon: Backpack,
  },
  {
    token: "chi-phi",
    label: "Chi phí",
    icon: Wallet,
  },
];

export const tripSectionHref = (tripId: string, token: string | null) =>
  token ? `/lich-trinh/${tripId}/${token}` : `/lich-trinh/${tripId}`;

export const findTripSection = (token: string) =>
  TRIP_SECTIONS.find((s) => s.token === token) ?? null;
