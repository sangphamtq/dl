import { unstable_cache } from "next/cache";

const ORS_MATRIX_URL =
  "https://api.openrouteservice.org/v2/matrix/driving-car";

export const ORS_CACHE_TAG = "ors-matrix";

export type Ride = { km: number; min: number };
export type LatLng = { lat: number; lng: number };

export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

async function fetchMatrix(
  origin: LatLng,
  points: LatLng[],
): Promise<Record<string, Ride>> {
  const key = process.env.ORS_API_KEY;
  if (!key || points.length === 0) return {};

  const locations = [
    [origin.lng, origin.lat],
    ...points.map((p) => [p.lng, p.lat]),
  ];
  const destinations = points.map((_, i) => i + 1);

  try {
    const res = await fetch(ORS_MATRIX_URL, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        sources: [0],
        destinations,
        metrics: ["distance", "duration"],
        units: "km",
      }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      distances?: (number | null)[][];
      durations?: (number | null)[][];
    };
    const dist = data.distances?.[0] ?? [];
    const dur = data.durations?.[0] ?? [];

    const out: Record<string, Ride> = {};
    points.forEach((p, i) => {
      const km = dist[i];
      if (km == null) return;
      out[coordKey(p.lat, p.lng)] = { km, min: (dur[i] ?? 0) / 60 };
    });
    return out;
  } catch {
    return {};
  }
}

export function getDrivingDistances(
  origin: LatLng,
  points: LatLng[],
): Promise<Record<string, Ride>> {
  const sorted = [...points].sort((a, b) =>
    coordKey(a.lat, a.lng).localeCompare(coordKey(b.lat, b.lng)),
  );
  const cacheKey = [
    "ors-matrix",
    coordKey(origin.lat, origin.lng),
    sorted.map((p) => coordKey(p.lat, p.lng)).join("|"),
  ];
  return unstable_cache(() => fetchMatrix(origin, sorted), cacheKey, {
    revalidate: 60 * 60 * 24 * 30,
    tags: [ORS_CACHE_TAG],
  })();
}
