export type PackGroup = { label: string; items: string[] };

export const PACK_SUGGESTIONS: PackGroup[] = [
  {
    label: "Giấy tờ & tiền",
    items: [
      "CCCD / hộ chiếu",
      "Bằng lái xe",
      "Giấy tờ xe",
      "Tiền mặt lẻ",
      "Thẻ ngân hàng",
      "Ảnh chụp giấy tờ trong máy",
    ],
  },
  {
    label: "Thiết bị & sạc",
    items: [
      "Sạc dự phòng",
      "Cáp sạc",
      "Củ sạc",
      "Ổ cắm chia",
      "Tai nghe",
      "Giá đỡ điện thoại",
    ],
  },
  {
    label: "Thuốc & y tế",
    items: [
      "Thuốc say xe",
      "Thuốc đau bụng",
      "Thuốc hạ sốt",
      "Băng cá nhân",
      "Dầu gió",
      "Thuốc đang uống",
    ],
  },
  {
    label: "Chống nắng, mưa & côn trùng",
    items: [
      "Kem chống nắng",
      "Mũ / nón",
      "Kính râm",
      "Áo mưa / ô",
      "Xịt chống muỗi",
      "Khẩu trang",
    ],
  },
  {
    label: "Vệ sinh cá nhân",
    items: [
      "Bàn chải & kem đánh răng",
      "Khăn mặt",
      "Dầu gội & sữa tắm",
      "Khăn giấy ướt",
      "Nước rửa tay khô",
    ],
  },
  {
    label: "Quần áo & giày dép",
    items: [
      "Đồ bơi",
      "Áo khoác nhẹ",
      "Dép lê",
      "Giày đi bộ",
      "Đồ ngủ",
      "Túi đựng đồ bẩn",
    ],
  },
  {
    label: "Dọc đường",
    items: ["Bình nước", "Đồ ăn vặt", "Túi nôn", "Gối cổ", "Bịt mắt ngủ"],
  },
  {
    label: "Đồ chung cả nhóm",
    items: [
      "Loa bluetooth",
      "Bộ bài / trò chơi",
      "Túi rác",
      "Dây phơi đồ",
      "Đèn pin",
      "Máy ảnh",
    ],
  },
];

export const packKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

const GROUP_OF = new Map<string, string>(
  PACK_SUGGESTIONS.flatMap((g) => g.items.map((i) => [packKey(i), g.label] as const)),
);

export const groupOfItem = (name: string): string | null =>
  GROUP_OF.get(packKey(name)) ?? null;

export const OTHER_GROUP = "Khác";

export const GROUP_ORDER = [...PACK_SUGGESTIONS.map((g) => g.label), OTHER_GROUP];
