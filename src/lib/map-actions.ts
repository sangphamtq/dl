"use server";

import { parseLatLng, isShortMapUrl } from "@/lib/map-url";

export type RouteResult = {
  coords: [number, number][]; // [lat, lng] dọc tuyến đường
  distance: number; // tổng mét
  duration: number; // tổng giây
  legs: { distance: number; duration: number }[]; // từng chặng giữa 2 điểm liên tiếp
};

type LatLng = { lat: number; lng: number };

// Định tuyến đường bộ qua OSRM (máy chủ demo công khai, không cần key) — đi qua
// 2+ điểm theo thứ tự (A→B hoặc lộ trình nhiều điểm). Trả tuyến + tổng km/giây.
// LƯU Ý: server demo có giới hạn & KHÔNG dùng cho production — khi lên thật nên
// đổi sang self-host OSRM hoặc OpenRouteService (qua biến môi trường endpoint).
export async function getRoute(waypoints: LatLng[]): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;
  try {
    const coords = waypoints.map((p) => `${p.lng},${p.lat}`).join(";");
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coords}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url, { headers: { "user-agent": "dl-map/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.routes?.[0];
    if (!r?.geometry?.coordinates) return null;
    return {
      coords: (r.geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => [lat, lng] as [number, number],
      ),
      distance: r.distance,
      duration: r.duration,
      legs: Array.isArray(r.legs)
        ? r.legs.map((l: { distance: number; duration: number }) => ({
            distance: l.distance,
            duration: l.duration,
          }))
        : [],
    };
  } catch {
    return null;
  }
}

// Khoảng cách/thời gian đường bộ TỪ một điểm gốc tới nhiều điểm (OSRM table).
// Trả mảng cùng thứ tự targets; phần tử null nếu không tính được.
export async function getDistances(
  origin: LatLng,
  targets: LatLng[],
): Promise<({ distance: number; duration: number } | null)[]> {
  if (targets.length === 0) return [];
  try {
    const coords = [origin, ...targets]
      .map((p) => `${p.lng},${p.lat}`)
      .join(";");
    const url =
      `https://router.project-osrm.org/table/v1/driving/${coords}` +
      `?sources=0&annotations=distance,duration`;
    const res = await fetch(url, { headers: { "user-agent": "dl-map/1.0" } });
    if (!res.ok) return targets.map(() => null);
    const data = await res.json();
    const dist: (number | null)[] | undefined = data?.distances?.[0];
    const dur: (number | null)[] | undefined = data?.durations?.[0];
    return targets.map((_, i) => {
      const d = dist?.[i + 1];
      const t = dur?.[i + 1];
      return d == null || t == null ? null : { distance: d, duration: t };
    });
  } catch {
    return targets.map(() => null);
  }
}

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
