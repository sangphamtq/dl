// Nhãn hiển thị cho enum Listing — dùng chung cho trang công khai.
export const SPOT_CATEGORY_LABELS: Record<string, string> = {
  beach: "Biển",
  mountain: "Núi",
  waterfall: "Thác",
  lake: "Hồ",
  cave: "Hang động",
  temple: "Đền / Chùa",
  viewpoint: "Điểm ngắm cảnh",
  village: "Làng",
  island: "Đảo",
  park: "Công viên",
  other: "Khác",
};

export const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  adventure: "Mạo hiểm",
  nature: "Thiên nhiên",
  culture: "Văn hóa",
  relax: "Thư giãn",
  water: "Dưới nước",
  food: "Ẩm thực",
  other: "Khác",
};

export const EATERY_CATEGORY_LABELS: Record<string, string> = {
  local: "Quán địa phương",
  seafood: "Hải sản",
  streetfood: "Đường phố",
  vegetarian: "Chay",
  cafe: "Cà phê",
  bbq: "Nướng / lẩu",
  other: "Khác",
};

// Đến để ăn hay để ngồi — trục tách section "Ăn ở đâu" / "Quán nước & cà phê".
export const VENUE_KIND_LABELS: Record<string, string> = {
  eat: "Quán ăn",
  drink: "Quán nước",
  both: "Ăn & ngồi lâu",
};

// Hướng nhìn — nhãn chip lọc của section quán nước.
export const VIEW_TYPE_LABELS: Record<string, string> = {
  sea: "Biển",
  valley: "Thung lũng",
  cloud: "Biển mây",
  mountain: "Núi",
  lake: "Hồ",
  river: "Sông",
  city: "Thành phố",
  oldtown: "Phố cổ",
  rice: "Ruộng bậc thang",
  garden: "Vườn",
};

export const ACCOMMODATION_CATEGORY_LABELS: Record<string, string> = {
  hotel: "Khách sạn",
  homestay: "Homestay",
  resort: "Resort",
  hostel: "Hostel",
  guesthouse: "Nhà nghỉ",
  villa: "Villa",
};

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Sáng",
  lunch: "Trưa",
  dinner: "Tối",
  latenight: "Ăn đêm",
  cafe: "Cà phê",
  snack: "Ăn vặt",
};

export const POST_CATEGORY_LABELS: Record<string, string> = {
  "cam-nang": "Cẩm nang",
  "am-thuc": "Ẩm thực",
  "luu-tru": "Lưu trú",
  "trai-nghiem": "Trải nghiệm",
  "di-chuyen": "Di chuyển",
  "tin-tuc": "Tin tức",
};

export const PRICE_LABELS: Record<string, string> = {
  budget: "$ · Bình dân",
  moderate: "$$ · Vừa",
  premium: "$$$ · Cao",
  luxury: "$$$$ · Sang",
};

export function label(
  map: Record<string, string>,
  value: string | null,
): string | null {
  if (!value) return null;
  return map[value] ?? value;
}
