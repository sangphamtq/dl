import type { District, Ward } from "@/lib/locations";
import { fetchDistricts, fetchWards } from "./location-actions";

// LỚP 2: cache trong phiên trình duyệt. Map sống suốt phiên SPA nên đổi qua lại
// giữa các tỉnh/huyện đã mở sẽ không gọi lại server action.
const districtCache = new Map<number, District[]>();
const wardCache = new Map<number, Ward[]>();

export async function loadDistricts(provinceCode: number): Promise<District[]> {
  const hit = districtCache.get(provinceCode);
  if (hit) return hit;
  const data = await fetchDistricts(provinceCode);
  districtCache.set(provinceCode, data);
  return data;
}

export async function loadWards(districtCode: number): Promise<Ward[]> {
  const hit = wardCache.get(districtCode);
  if (hit) return hit;
  const data = await fetchWards(districtCode);
  wardCache.set(districtCode, data);
  return data;
}
