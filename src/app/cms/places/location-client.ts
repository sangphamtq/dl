import type { Ward } from "@/lib/locations";
import { fetchWards } from "./location-actions";

const wardCache = new Map<number, Ward[]>();

export async function loadWards(provinceCode: number): Promise<Ward[]> {
  const hit = wardCache.get(provinceCode);
  if (hit) return hit;
  const data = await fetchWards(provinceCode);
  wardCache.set(provinceCode, data);
  return data;
}
