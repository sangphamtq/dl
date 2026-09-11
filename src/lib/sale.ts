export const SALE_SERVICES = [
  { value: "tour", label: "Tour / dẫn đoàn" },
  { value: "phong", label: "Đặt phòng / lưu trú" },
  { value: "ve", label: "Vé tham quan / vui chơi" },
  { value: "combo", label: "Combo du lịch" },
  { value: "thue-xe", label: "Thuê xe / đưa đón" },
  { value: "an-uong", label: "Đặt bàn / ẩm thực" },
  { value: "khac", label: "Khác" },
] as const;

export type SaleServiceValue = (typeof SALE_SERVICES)[number]["value"];

const SALE_SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SALE_SERVICES.map((s) => [s.value, s.label]),
);

export function isSaleService(v: string): v is SaleServiceValue {
  return SALE_SERVICES.some((s) => s.value === v);
}

export function saleServiceLabel(value: string): string {
  return SALE_SERVICE_LABELS[value] ?? value;
}

export const SALE_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

export const SALE_LEVEL_LABELS: Record<string, string> = {
  basic: "Cơ bản",
  standard: "Chuẩn",
  high: "Cao",
};
