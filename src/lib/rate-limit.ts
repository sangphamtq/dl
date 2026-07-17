import type { NextRequest } from "next/server";

// Rate-limit đơn giản (in-memory, fixed window). Đủ chặn lạm dụng cơ bản.
// Lưu ý: chỉ trong 1 instance — khi chạy nhiều instance, giới hạn là per-instance.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export function ipKey(req: NextRequest, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  return `${scope}:${ip}`;
}

// Nhận diện bot/crawler qua User-Agent để KHÔNG tính vào lượt xem. Danh sách
// phủ các mẫu phổ biến (search engine, social preview, monitor, headless…).
// Không cần hoàn hảo — chỉ lọc phần lớn traffic không phải người thật.
const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|embedly|quora|pinterest|redditbot|linkedinbot|twitterbot|googlebot|applebot|yandex|baiduspider|duckduckbot|semrush|ahrefs|mj12bot|dotbot|petalbot|headless|lighthouse|preview|monitor|phantomjs|python-requests|curl|wget|axios|node-fetch|go-http|okhttp/i;

export function isBotRequest(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  // UA rỗng gần như luôn là script/bot → loại.
  if (!ua) return true;
  return BOT_UA.test(ua);
}
