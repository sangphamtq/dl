// Đơn vị hành chính VN từ provinces.open-api.vn (v2 — có hiệu lực từ 1/7/2025:
// 34 tỉnh/thành, chỉ 2 CẤP tỉnh → xã/phường/đặc khu).
//
// ⚠️ ĐỪNG quay lại v1. Không phải chuyện "endpoint cũ vẫn chạy": v1 là bộ 63
// tỉnh kèm CẤP HUYỆN — một cấp chính quyền đã bị bãi bỏ. Địa chỉ ghi theo nó sẽ
// không khớp giấy tờ, không khớp Google Maps, cũng không khớp cách chủ quán/chủ
// homestay tự đọc địa chỉ của mình. Với mục Lưu trú (định vị "danh bạ đã xác
// minh chính chủ") thì đó là tự phá đúng thứ mình đang bán.
//
// LỚP 1: fetch ở server với Next Data Cache (revalidate) → mọi request dùng
// chung, mỗi endpoint chỉ chạm API ngoài ~1 lần/ngày.
const BASE = "https://provinces.open-api.vn/api/v2";
const DAY = 60 * 60 * 24;

export type Province = { code: number; name: string };
export type Ward = { code: number; name: string };

type Named = { code: number; name: string };

// Bỏ tiền tố đơn vị hành chính cho gọn: "Tỉnh Lâm Đồng" → "Lâm Đồng",
// "Phường Phan Thiết" → "Phan Thiết", "Đặc khu Phú Quốc" → "Phú Quốc".
const PREFIX_RE = /^(Tỉnh|Thành phố|Phường|Xã|Thị trấn|Đặc khu)\s+/;

function stripPrefix(name: string): string {
  const stripped = name.replace(PREFIX_RE, "").trim();
  // Giữ nguyên nếu bỏ tiền tố ra rỗng hoặc còn lại là số (vd "Phường 1" → "1").
  if (!stripped || /^\d/.test(stripped)) return name;
  return stripped;
}

// Danh sách 34 tỉnh/thành.
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

// Xã/phường/đặc khu thuộc một tỉnh — nay treo THẲNG vào tỉnh, không qua huyện.
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
