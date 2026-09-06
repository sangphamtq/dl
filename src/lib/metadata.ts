import type { Metadata } from "next";

/**
 * Metadata cho trang chi tiết KHÔNG tìm thấy bản ghi (ngay trước `notFound()`).
 *
 * Trả `{}` như trước thì Next rơi về `title.default` của root layout, nên tab
 * của một trang 404 ghi đúng tiêu đề trang chủ ("Halivivu — Hỗ trợ thông tin du
 * lịch Việt Nam") — đọc như thể trang tồn tại và đang mở bình thường.
 *
 * `title` ở đây là chuỗi nên vẫn đi qua `template` của root layout, ra
 * "Không tìm thấy trang — Halivivu"; giống hệt `src/app/not-found.tsx`.
 */
export const notFoundMetadata: Metadata = { title: "Không tìm thấy trang" };
