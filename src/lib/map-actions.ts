"use server";

import { parseLatLng, isShortMapUrl } from "@/lib/map-url";

// Giải link Google Maps rút gọn (maps.app.goo.gl…) ở server: theo redirect tới URL
// đầy đủ rồi tách toạ độ. Chỉ nhận domain rút gọn của Google (tránh SSRF).
export async function resolveMapLink(
  url: string,
): Promise<{ lat: number; lng: number } | null> {
  const u = url.trim();
  if (!isShortMapUrl(u)) return null;
  try {
    const res = await fetch(u, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; mapbot/1.0)" },
    });
    const fromUrl = parseLatLng(res.url);
    if (fromUrl) return fromUrl;
    const body = await res.text();
    return parseLatLng(body);
  } catch {
    return null;
  }
}
