// Chuẩn hoá & phân loại đầu vào cho công cụ kiểm tra uy tín (kiem-tra).
// Thuần logic — dùng được cả client lẫn server.

export type TrustChannel = "phone" | "facebook" | "website" | "bank_account";

export const TRUST_CHANNELS: { value: TrustChannel; label: string }[] = [
  { value: "phone", label: "SĐT / Zalo" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "bank_account", label: "Số tài khoản" },
];

export const TRUST_CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  TRUST_CHANNELS.map((c) => [c.value, c.label]),
);

export function isTrustChannel(v: string): v is TrustChannel {
  return TRUST_CHANNELS.some((c) => c.value === v);
}

// SĐT VN: bỏ ký tự thừa, quy +84/84 về 0 đứng đầu. Trả "" nếu không hợp lệ.
export function normalizePhone(v: string): string {
  let d = v.replace(/[^\d+]/g, "");
  d = d.replace(/^\+?84/, "0");
  d = d.replace(/\D/g, "");
  if (d && !d.startsWith("0")) d = "0" + d;
  return d.length >= 9 && d.length <= 11 ? d : "";
}

// Facebook: rút gọn về "username" hoặc "profile.php?id=..." (best-effort).
export function normalizeFacebook(v: string): string {
  let s = v.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^(www\.|m\.|web\.)/, "");
  if (s.startsWith("fb.com/")) s = "facebook.com/" + s.slice("fb.com/".length);
  const m = s.match(/facebook\.com\/(.+)$/);
  let path = m ? m[1] : s;
  // profile.php?id=123 → giữ id; còn lại lấy phần username đầu tiên.
  const idMatch = path.match(/profile\.php\?id=(\d+)/);
  if (idMatch) return `id:${idMatch[1]}`;
  path = path.split(/[?#]/)[0].replace(/\/+$/, "");
  path = path.split("/")[0];
  return path;
}

// Website: lấy hostname, bỏ www.
export function normalizeWebsite(v: string): string {
  let s = v.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split(/[/?#]/)[0];
  return s;
}

// Số tài khoản: chỉ giữ chữ số.
export function normalizeBank(v: string): string {
  return v.replace(/\D/g, "");
}

export function normalizeValue(channel: TrustChannel, v: string): string {
  switch (channel) {
    case "phone":
      return normalizePhone(v);
    case "facebook":
      return normalizeFacebook(v);
    case "website":
      return normalizeWebsite(v);
    case "bank_account":
      return normalizeBank(v);
  }
}

// Đoán loại kênh từ chuỗi người dùng dán vào (khi họ không chọn).
export function detectChannel(v: string): TrustChannel {
  const s = v.trim().toLowerCase();
  if (/facebook\.com|fb\.com|fb\.me/.test(s)) return "facebook";
  const digits = s.replace(/[^\d]/g, "");
  // Có chữ cái + dấu chấm (miền) và không phải link fb → website.
  if (/[a-z]/.test(s) && s.includes(".")) return "website";
  // Toàn số: SĐT nếu dài 9–11, còn lại coi là số tài khoản.
  if (digits.length >= 9 && digits.length <= 11) return "phone";
  if (digits.length > 11) return "bank_account";
  return "phone";
}
