// Chuẩn hoá URL người dùng nhập: trim, rỗng → null, thiếu scheme → thêm https://.
// Tránh lỗi <a href="google.com"> bị hiểu là đường dẫn tương đối.
export function normalizeUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
