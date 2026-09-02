import type { Ward } from "@/lib/locations";
import { fetchWards } from "./location-actions";

// LỚP 2: cache trong phiên trình duyệt. Map sống suốt phiên SPA nên đổi qua lại
// giữa các tỉnh đã mở sẽ không gọi lại server action.
const wardCache = new Map<number, Ward[]>();

export async function loadWards(provinceCode: number): Promise<Ward[]> {
  const hit = wardCache.get(provinceCode);
  if (hit) return hit;
  const data = await fetchWards(provinceCode);
  wardCache.set(provinceCode, data);
  return data;
}
