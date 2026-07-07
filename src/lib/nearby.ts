import { coordKey, type LatLng, type Ride } from "@/lib/routing";

// Đo & xếp hạng "mục lân cận" dùng chung cho các trang chi tiết (địa điểm, lưu
// trú…). Chim bay (haversine) để lọc thô + fallback; khoảng cách lái xe thật
// (ORS, đã cache 30 ngày theo toạ độ — xem lib/routing) để xếp hạng & hiển thị.

// Khoảng cách chim bay (km) giữa 2 toạ độ — haversine.
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// "800 m" / "1,2 km" / "12 km".
export function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

// Gắn khoảng cách (km, null nếu thiếu toạ độ) tới item, sắp gần→xa khi có toạ độ
// (mục thiếu toạ độ dồn cuối), rồi cắt còn `take`. Dùng để lọc thô ứng viên.
export function withDistance<T extends { lat: number | null; lng: number | null }>(
  items: T[],
  origin: { lat: number | null; lng: number | null },
  take: number,
): (T & { distanceKm: number | null })[] {
  const annotated = items.map((it) => ({
    ...it,
    distanceKm:
      origin.lat != null &&
      origin.lng != null &&
      it.lat != null &&
      it.lng != null
        ? distanceKm(origin.lat, origin.lng, it.lat, it.lng)
        : null,
  }));
  if (origin.lat == null || origin.lng == null) return annotated.slice(0, take);
  return annotated
    .map((it, i) => ({ it, i }))
    .sort(
      (a, b) =>
        (a.it.distanceKm ?? Infinity) - (b.it.distanceKm ?? Infinity) ||
        a.i - b.i,
    )
    .slice(0, take)
    .map((x) => x.it);
}

// Mục lân cận sau khi gắn khoảng cách lái xe (drivingKm) + chim bay (distanceKm).
export type Nearby<T> = T & {
  distanceKm: number | null; // chim bay (fallback)
  drivingKm: number | null; // đường đi thật (ORS)
  drivingMin: number | null;
};

// Bán kính tối đa cho mục "gần đây" — xa hơn thì đừng gọi là gần (km đường đi).
export const NEARBY_MAX_KM = 15;

// Gắn km đường đi từ drivingMap, bỏ mục xa quá NEARBY_MAX_KM, sắp gần→xa (ưu tiên
// đường đi, fallback chim bay), rồi cắt còn `take`. Mục thiếu toạ độ giữ, dồn cuối.
export function rankNearby<
  T extends { lat: number | null; lng: number | null; distanceKm: number | null },
>(items: T[], driving: Record<string, Ride>, take: number): Nearby<T>[] {
  return items
    .map((it) => {
      const r =
        it.lat != null && it.lng != null
          ? driving[coordKey(it.lat, it.lng)]
          : undefined;
      return {
        ...it,
        drivingKm: r?.km ?? null,
        drivingMin: r?.min ?? null,
      };
    })
    .filter((it) => (it.drivingKm ?? it.distanceKm ?? 0) <= NEARBY_MAX_KM)
    .sort(
      (a, b) =>
        (a.drivingKm ?? a.distanceKm ?? Infinity) -
        (b.drivingKm ?? b.distanceKm ?? Infinity),
    )
    .slice(0, take);
}

// Nhãn hiển thị: ưu tiên đường đi ("cách 2,3 km · 6 phút"), thiếu thì chim bay
// ("cách ~1,2 km").
export function rideLabel(n: {
  drivingKm: number | null;
  drivingMin: number | null;
  distanceKm: number | null;
}): string | null {
  if (n.drivingKm != null) {
    const base = `cách ${fmtKm(n.drivingKm)}`;
    return n.drivingMin != null && n.drivingMin >= 1
      ? `${base} · ${Math.round(n.drivingMin)} phút`
      : base;
  }
  if (n.distanceKm != null) return `cách ~${fmtKm(n.distanceKm)}`;
  return null;
}

// Toạ độ duy nhất (có lat/lng) để gọi routing 1 lần.
export function uniqueCoords(
  items: { lat: number | null; lng: number | null }[],
): LatLng[] {
  const seen = new Set<string>();
  const out: LatLng[] = [];
  for (const it of items) {
    if (it.lat == null || it.lng == null) continue;
    const k = coordKey(it.lat, it.lng);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ lat: it.lat, lng: it.lng });
  }
  return out;
}
