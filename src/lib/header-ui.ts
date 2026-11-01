/**
 * Nút icon của cụm phải header (tìm kiếm khổ nhỏ, Đã đến, Thông báo) — cùng một khuôn: vuông 36px bo 6px (KHÔNG
 * `rounded-full` — quy ước bo góc của site), chữ `foreground` nên tự đúng cả trên hero tối (header mang `.dark`) lẫn nền
 * sáng. KHÔNG có trạng thái "đang chọn" (icon đặc / nền giữ lại) — biên tập bỏ; chỉ phản hồi khi rê. Hằng dùng chung phải nằm trong `lib/` (component dùng nó là client).
 */
export const HEADER_ICON_BTN =
  "relative grid size-9 shrink-0 place-items-center rounded-[10px] text-foreground/80 transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
