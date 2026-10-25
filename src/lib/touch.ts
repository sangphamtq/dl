/**
 * Ô nhập trên MÀN CẢM ỨNG phải ≥ 16px: Safari iOS tự PHÓNG TO cả trang khi chạm vào ô có chữ < 16px, và không
 * tự thu lại. Theo `pointer: coarse` chứ không theo bề rộng — iPad cũng là màn cảm ứng. Máy có chuột giữ cỡ chữ
 * thiết kế. KHÔNG chặn bằng `maximum-scale=1` ở viewport: cách đó tắt luôn véo-phóng-to (hỏng trợ năng).
 */
export const TOUCH_INPUT = "[@media(pointer:coarse)]:text-base";
