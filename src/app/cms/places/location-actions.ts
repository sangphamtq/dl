"use server";

import { getWards, type Ward } from "@/lib/locations";

export async function fetchWards(provinceCode: number): Promise<Ward[]> {
  if (!Number.isFinite(provinceCode)) return [];
  return getWards(provinceCode);
}
