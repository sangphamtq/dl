"use server";

import { getWards, type Ward } from "@/lib/locations";

// Bọc thành server action để form (client) gọi khi đổi tỉnh.
// Không còn cấp huyện — xã/phường treo thẳng vào tỉnh (xem lib/locations.ts).
export async function fetchWards(provinceCode: number): Promise<Ward[]> {
  if (!Number.isFinite(provinceCode)) return [];
  return getWards(provinceCode);
}
