// Đơn vị hành chính VN từ provinces.open-api.vn (v1 — địa chính cũ, 3 cấp:
// tỉnh → quận/huyện → phường/xã).
// LỚP 1: fetch ở server với Next Data Cache (revalidate) → mọi request dùng
// chung, mỗi endpoint chỉ chạm API ngoài ~1 lần/ngày.
const BASE = "https://provinces.open-api.vn/api/v1";
const DAY = 60 * 60 * 24;

export type Province = { code: number; name: string };
export type District = { code: number; name: string };
export type Ward = { code: number; name: string };

type Named = { code: number; name: string };

// Danh sách tỉnh/thành.
export async function getProvinces(): Promise<Province[]> {
  try {
    const res = await fetch(`${BASE}/p/`, { next: { revalidate: DAY } });
    if (!res.ok) return [];
    const data: Named[] = await res.json();
    return data.map((p) => ({ code: p.code, name: p.name }));
  } catch {
    return [];
  }
}

// Quận/huyện thuộc một tỉnh (depth=2 trả kèm districts).
export async function getDistricts(provinceCode: number): Promise<District[]> {
  try {
    const res = await fetch(`${BASE}/p/${provinceCode}?depth=2`, {
      next: { revalidate: DAY },
    });
    if (!res.ok) return [];
    const data: { districts?: Named[] } = await res.json();
    return (data.districts ?? []).map((d) => ({ code: d.code, name: d.name }));
  } catch {
    return [];
  }
}

// Phường/xã thuộc một quận/huyện (depth=2 trả kèm wards).
export async function getWards(districtCode: number): Promise<Ward[]> {
  try {
    const res = await fetch(`${BASE}/d/${districtCode}?depth=2`, {
      next: { revalidate: DAY },
    });
    if (!res.ok) return [];
    const data: { wards?: Named[] } = await res.json();
    return (data.wards ?? []).map((w) => ({ code: w.code, name: w.name }));
  } catch {
    return [];
  }
}
