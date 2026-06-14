"use server";

import {
  getDistricts,
  getWards,
  type District,
  type Ward,
} from "@/lib/locations";

// Bọc thành server action để form (client) gọi khi đổi tỉnh / huyện.
export async function fetchDistricts(
  provinceCode: number,
): Promise<District[]> {
  if (!Number.isFinite(provinceCode)) return [];
  return getDistricts(provinceCode);
}

export async function fetchWards(districtCode: number): Promise<Ward[]> {
  if (!Number.isFinite(districtCode)) return [];
  return getWards(districtCode);
}
