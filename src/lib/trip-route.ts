import "server-only";
import { after } from "next/server";
import { getDrivingDistances, type LatLng } from "@/lib/routing";
import { distanceKm } from "@/lib/nearby";
import { legKey } from "@/lib/trip-time";

export type LegPoint = { id: string; lat: number | null; lng: number | null };

export type Leg = {
  min: number;
  km: number;
  approx: boolean;
};

const ROAD_FACTOR = 1.3;
const AVG_KMH = 38;

const ROUTE_BUDGET_MS = 300;

async function withinBudget<T>(p: Promise<T | null>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let overdue = false;
  const clock = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      overdue = true;
      resolve(null);
    }, ROUTE_BUDGET_MS);
  });
  try {
    return await Promise.race([p, clock]);
  } finally {
    clearTimeout(timer);
    if (overdue) {
      try {
        after(() => p);
      } catch {
        /* ngoài phạm vi request — bỏ qua */
      }
    }
  }
}

export async function getLegs(points: LegPoint[]): Promise<Record<string, Leg>> {
  const out: Record<string, Leg> = {};
  if (points.length < 2) return out;

  const pairs: [LegPoint, LegPoint][] = [];
  for (let i = 0; i < points.length - 1; i++) pairs.push([points[i], points[i + 1]]);

  await Promise.all(
    pairs.map(async ([from, to]) => {
      if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) return;

      const origin: LatLng = { lat: from.lat, lng: from.lng };
      const dest: LatLng = { lat: to.lat, lng: to.lng };

      let leg: Leg | null = null;
      const rides = await withinBudget(
        getDrivingDistances(origin, [dest]).catch(() => null),
      );
      const ride = rides ? Object.values(rides)[0] : undefined;
      if (ride) leg = { min: ride.min, km: ride.km, approx: false };

      if (!leg) {
        const km = distanceKm(origin.lat, origin.lng, dest.lat, dest.lng) * ROAD_FACTOR;
        leg = { min: (km / AVG_KMH) * 60, km, approx: true };
      }

      out[legKey(from.id, to.id)] = leg;
    }),
  );

  return out;
}

export function legMinutes(legs: Record<string, Leg>): Record<string, number> {
  return Object.fromEntries(Object.entries(legs).map(([k, v]) => [k, v.min]));
}
