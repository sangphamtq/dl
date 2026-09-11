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

function normalizePhone(v: string): string {
  let d = v.replace(/[^\d+]/g, "");
  d = d.replace(/^\+?84/, "0");
  d = d.replace(/\D/g, "");
  if (d && !d.startsWith("0")) d = "0" + d;
  return d.length >= 9 && d.length <= 11 ? d : "";
}

function normalizeFacebook(v: string): string {
  let s = v.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^(www\.|m\.|web\.)/, "");
  if (s.startsWith("fb.com/")) s = "facebook.com/" + s.slice("fb.com/".length);
  const m = s.match(/facebook\.com\/(.+)$/);
  let path = m ? m[1] : s;
  const idMatch = path.match(/profile\.php\?id=(\d+)/);
  if (idMatch) return `id:${idMatch[1]}`;
  path = path.split(/[?#]/)[0].replace(/\/+$/, "");
  path = path.split("/")[0];
  return path;
}

function normalizeWebsite(v: string): string {
  let s = v.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split(/[/?#]/)[0];
  return s;
}

function normalizeBank(v: string): string {
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

export function detectChannel(v: string): TrustChannel {
  const s = v.trim().toLowerCase();
  if (/facebook\.com|fb\.com|fb\.me/.test(s)) return "facebook";
  const digits = s.replace(/[^\d]/g, "");
  if (/[a-z]/.test(s) && s.includes(".")) return "website";
  if (digits.length >= 9 && digits.length <= 11) return "phone";
  if (digits.length > 11) return "bank_account";
  return "phone";
}
