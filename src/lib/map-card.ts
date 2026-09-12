export const MAP_CARD_TEXT = {
  eyebrow: "HÀNH TRÌNH VIỆT NAM",
  headline: "Đã đặt chân tới {n} tỉnh thành",
  // KHÔNG nhét tên miền vào đây: dự án chưa chốt domain ở bất kỳ đâu trong mã
  // nguồn, viết đại một cái là in một thông tin sai lên ảnh người ta đem đi
  // chia sẻ. Tên thương hiệu đủ để người xem tìm ra.
  watermark: "Tự tạo bản đồ hành trình của bạn trên Halivivu",
} as const;

export type MapCardOptions = {
  accent: string;
  name: string;
  showMap: boolean;
  showList: boolean;
};

const MAP_CARD_DEFAULTS: MapCardOptions = {
  accent: "#e3852f", // = token `warm`, nên mặc định trông y như trước khi có tính năng này
  name: "",
  showMap: true,
  showList: true,
};

export const ACCENT_SWATCHES = [
  "#e3852f",
  "#e11d48",
  "#0ea5e9",
  "#16a34a",
  "#7c3aed",
  "#0f172a",
];

export function mapCardDefaultsFor(accountName: string): MapCardOptions {
  return { ...MAP_CARD_DEFAULTS, name: line(accountName, "") };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_TEXT = 80;

function line(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  return v.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

export function parseMapCardOptions(
  value: unknown,
  defaultName = "",
): MapCardOptions {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return mapCardDefaultsFor(defaultName);
  const v = value as Record<string, unknown>;
  const accent =
    typeof v.accent === "string" && HEX.test(v.accent)
      ? v.accent.toLowerCase()
      : MAP_CARD_DEFAULTS.accent;
  const showMap = v.showMap !== false;
  const showList = v.showList !== false;
  return {
    accent,
    name: "name" in v ? line(v.name, "") : line(defaultName, ""),
    showMap: showMap || !showList,
    showList: showList || !showMap,
  };
}
