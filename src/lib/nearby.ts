import { coordKey, type LatLng, type Ride } from "@/lib/routing";

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

function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

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

export type Nearby<T> = T & {
  distanceKm: number | null;
  drivingKm: number | null;
  drivingMin: number | null;
};

const NEARBY_MAX_KM = 15;

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
