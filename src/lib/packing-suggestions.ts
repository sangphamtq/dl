// Gợi ý đồ mang theo — danh mục biên tập, KHÔNG phải bảng trong DB.
//
// Vì sao để trong mã nguồn: đây là nội dung gần như không đổi, dùng chung cho
// mọi chuyến, và không có ai cần một màn hình CMS để sửa nó. Cùng cách dự án
// đang giữ `TRIP_SECTIONS`, `SPOT_CATEGORY_LABELS`… Khi nào biên tập thật sự
// cần tự thêm bớt thì mới tách thành bảng.
//
// Nguyên tắc chọn món:
//   • Mỗi món nằm ĐÚNG MỘT nhóm (kính râm chỉ ở "Chống nắng", không lặp ở
//     "Vệ sinh cá nhân") — trùng lặp làm người dùng thêm hai lần cùng một thứ.
//   • Viết như người ta sẽ tự gõ ("Sạc dự phòng", không phải "Thiết bị sạc
//     dự phòng di động").
//   • Ưu tiên thứ DỄ QUÊN và thứ ĐI CHUNG một cái cho cả nhóm — hai loại mà
//     danh sách này thật sự cứu được. Quần áo thì ai cũng nhớ, để ít thôi.
//
// ⚠️ CỐ Ý chưa gợi ý theo điểm đến (biển / núi / lạnh). Suy ra khí hậu từ
// `Place` hay `Spot.category` là đoán, mà đoán sai ở đây thì sai LẶNG LẼ —
// đúng cái bẫy `lich-trinh.md` §9.3 đã chỉ ra với giá tiền. Cần thì thêm một
// trường thật trên `Place` trước.

export type PackGroup = { label: string; items: string[] };

// ⚠️ ĐÃ BỎ trường `scope` trên mỗi nhóm.
//
// Ý tưởng cũ: danh mục tự biết món nào là đồ chung, món nào là đồ riêng, nên
// bảng gợi ý khỏi cần công tắc "thêm vào đâu". Nghe gọn nhưng hỏng ở chỗ **điểm
// đến trở nên vô hình**: bấm một loạt rồi mới phát hiện mọi thứ nằm ở mục đồ
// riêng, và không có cách nào bảo nó vào mục chung. Người dùng báo đúng lỗi đó.
// Giờ có một công tắc hiện rõ ở đầu bảng — thà một dòng chữ còn hơn một quy tắc
// ngầm mà chỉ tác giả biết.

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

/** So khớp để biết món đã có trong danh sách chưa — bỏ dấu cách thừa & hoa/thường. */
export const packKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

// Tên món → nhãn nhóm trong danh mục. Dựng một lần, tra bằng `packKey` nên
// không phân biệt hoa/thường hay dấu cách thừa.
const GROUP_OF = new Map<string, string>(
  PACK_SUGGESTIONS.flatMap((g) => g.items.map((i) => [packKey(i), g.label] as const)),
);

/**
 * Món này thuộc nhóm nào — dùng để CHIA NHÓM danh sách đồ riêng cho dễ rà soát.
 *
 * Suy từ danh mục chứ KHÔNG lưu một trường `category` trên `TripPackItem`: món
 * thêm từ bảng gợi ý (phần lớn) tự vào đúng nhóm mà không ai phải điền gì, còn
 * món tự gõ thì rơi vào "Khác" — thà một nhóm gom lại còn hơn bắt người dùng
 * phân loại từng thứ họ gõ. Đổi tên món thì nó rời nhóm; chấp nhận được, và gõ
 * lại đúng tên trong danh mục là nó tự về chỗ cũ.
 */
export const groupOfItem = (name: string): string | null =>
  GROUP_OF.get(packKey(name)) ?? null;

/** Nhãn cho món không khớp danh mục nào. */
export const OTHER_GROUP = "Khác";

/** Thứ tự nhóm khi hiển thị — theo danh mục, "Khác" xuống cuối. */
export const GROUP_ORDER = [...PACK_SUGGESTIONS.map((g) => g.label), OTHER_GROUP];
