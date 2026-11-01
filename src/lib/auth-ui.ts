/** Nút đăng nhập bằng Google / Facebook — dùng chung trang `/login` và hộp `LoginDrawer` (hằng dùng chung server + client ⇒ `lib/`). */
export const PROVIDER_BTN =
  "flex h-12 w-full items-center justify-center gap-3 rounded-[6px] border border-border bg-background text-[0.9375rem] font-medium text-foreground transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Ba điều tài khoản mở ra — việc SITE LÀM ĐƯỢC, không phải khẩu hiệu. Dùng chung trang `/login` và hộp `LoginDrawer`. */
export const LOGIN_VALUES = [
  ["Lịch trình có giờ ước tính", "biết trước quán nào chưa mở lúc bạn tới"],
  ["Lưu nơi đã đến", "thành tấm bản đồ 34 tỉnh của riêng bạn"],
  ["Chỗ ở đã xác minh", "đúng chủ, đúng kênh liên hệ, tránh lừa cọc"],
] as const;
