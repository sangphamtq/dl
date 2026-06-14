// Bỏ dấu tiếng Việt + chữ thường (giữ khoảng trắng) — dùng cho tìm kiếm
// không phân biệt dấu. vd "Bình Thuận" → "binh thuan".
export function removeDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

// Chuyển tên tiếng Việt có dấu → slug không dấu, nối bằng "-".
// vd "Hạ Long" → "ha-long", "Đà Nẵng" → "da-nang".
export function slugify(input: string): string {
  return input
    .normalize("NFD") // tách dấu khỏi ký tự gốc
    .replace(/[̀-ͯ]/g, "") // bỏ dấu thanh/mũ
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // ký tự lạ → "-"
    .replace(/^-+|-+$/g, ""); // bỏ "-" thừa đầu/cuối
}

// Các tiền tố URL dành riêng — slug Place không được trùng (xem CLAUDE.md "URL").
export const RESERVED_SLUGS = new Set([
  "diem-den",
  "hoat-dong",
  "dia-diem",
  "dac-san",
  "quan-an",
  "luu-tru",
  "di-chuyen",
  "blog",
  "tim-kiem",
  "login",
  "api",
  "cms",
]);
