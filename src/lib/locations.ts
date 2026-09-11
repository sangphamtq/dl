const BASE = "https://provinces.open-api.vn/api/v2";
const DAY = 60 * 60 * 24;

export type Province = { code: number; name: string };
export type Ward = { code: number; name: string };

type Named = { code: number; name: string };

const PREFIX_RE = /^(Tỉnh|Thành phố|Phường|Xã|Thị trấn|Đặc khu)\s+/;

function stripPrefix(name: string): string {
  const stripped = name.replace(PREFIX_RE, "").trim();
  if (!stripped || /^\d/.test(stripped)) return name;
  return stripped;
}

export async function getProvinces(): Promise<Province[]> {
  try {
    const res = await fetch(`${BASE}/p/`, { next: { revalidate: DAY } });
    if (!res.ok) return [];
    const data: Named[] = await res.json();
    return data.map((p) => ({ code: p.code, name: stripPrefix(p.name) }));
  } catch {
    return [];
  }
}

export async function getWards(provinceCode: number): Promise<Ward[]> {
  try {
    const res = await fetch(`${BASE}/p/${provinceCode}?depth=2`, {
      next: { revalidate: DAY },
    });
    if (!res.ok) return [];
    const data: { wards?: Named[] } = await res.json();
    return (data.wards ?? []).map((w) => ({
      code: w.code,
      name: stripPrefix(w.name),
    }));
  } catch {
    return [];
  }
}
