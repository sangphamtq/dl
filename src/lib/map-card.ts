/* Tuỳ chọn của trang "Nơi đã đến" (`/tai-khoan/da-den`) và của tấm ảnh trang đó
   xuất ra. Lưu theo NGƯỜI ở `User.mapCardOptions` (Json).

   ⚠️ File này nằm ở `lib/` chứ KHÔNG nằm trong module `"use client"`, và đó là
   bắt buộc: trang (Server Component) phải đọc `MAP_CARD_DEFAULTS` /
   `parseMapCardOptions()` để dựng HTML lần đầu. Nhìn từ Server Component, export
   của một module client chỉ là *client reference* — gọi vào sẽ ném "is not a
   function" lúc CHẠY trong khi `tsc` và `lint` đều xanh (xem quy ước trong
   `.claude/skills/design/SKILL.md`).

   HAI NHÓM tuỳ chọn, và ranh giới này là thứ quyết định cách bày bảng điều
   khiển — đừng trộn lại:

     · **`accent`** — áp cho CẢ TRANG (bản đồ, vạch tiến độ, ô đánh dấu) lẫn tấm
       ảnh. Đây là phần "chỉnh trang này";
     · **`name` + hai công tắc** — chỉ sống trong TẤM ẢNH xuất ra.

   ⚠️ **Ba dòng chữ của tấm ảnh (nhãn, tiêu đề, dòng chân) là CỐ ĐỊNH** — xem
   `MAP_CARD_TEXT` bên dưới. Đừng mở lại cho người dùng sửa. */

/* Chữ cố định trên tấm ảnh chia sẻ. Trước đây cả ba là ô nhập tự do, và đó là
   ba ô sai:

     · **dòng nhãn** và **tiêu đề** là GIỌNG của sản phẩm. Mỗi người sửa một
       kiểu thì tấm ảnh — thứ đi ra ngoài Halivivu và là quảng cáo duy nhất của
       site — mỗi lần đọc một khác, mà lỗi thường gặp nhất lại là bỏ trống hoặc
       gõ nhầm rồi không biết sửa lại thế nào;
     · **dòng chân** phải nói ĐÚNG một việc: tấm ảnh này tạo ở đâu. Để người
       dùng sửa thì đúng câu đáng giữ nhất lại là câu dễ bị xoá nhất.

   Còn lại đúng thứ thật sự riêng của mỗi người: TÊN và MÀU.

   `{n}` trong tiêu đề là chỗ chèn "9/34", và nó được tô màu nhấn. */
export const MAP_CARD_TEXT = {
  eyebrow: "HÀNH TRÌNH VIỆT NAM",
  headline: "Đã đặt chân tới {n} tỉnh thành",
  // KHÔNG nhét tên miền vào đây: dự án chưa chốt domain ở bất kỳ đâu trong mã
  // nguồn, viết đại một cái là in một thông tin sai lên ảnh người ta đem đi
  // chia sẻ. Tên thương hiệu đủ để người xem tìm ra.
  watermark: "Tự tạo bản đồ hành trình của bạn trên Halivivu",
} as const;

export type MapCardOptions = {
  /** Màu nhấn — dùng ở cả trang lẫn ảnh. Hex 6 chữ số. */
  accent: string;
  /** Tên in dưới tiêu đề ảnh. Rỗng = không hiện dòng đó. */
  name: string;
  showMap: boolean;
  showList: boolean;
};

export const MAP_CARD_DEFAULTS: MapCardOptions = {
  accent: "#e3852f", // = token `warm`, nên mặc định trông y như trước khi có tính năng này
  name: "",
  showMap: true,
  showList: true,
};

/** Bảng màu gợi ý. Sáu màu đủ khác nhau để nhận ra ngay ở ô 28px. */
export const ACCENT_SWATCHES = [
  "#e3852f",
  "#e11d48",
  "#0ea5e9",
  "#16a34a",
  "#7c3aed",
  "#0f172a",
];

/** Bộ mặc định "của người này" — tức mặc định + tên lấy từ tài khoản. Dùng cho
 *  cả lần đầu vào trang lẫn nút "Đặt lại": đặt lại mà xoá luôn tên thì nó lấy
 *  đi đúng thứ duy nhất người dùng không phải tự gõ. */
export function mapCardDefaultsFor(accountName: string): MapCardOptions {
  return { ...MAP_CARD_DEFAULTS, name: line(accountName, "") };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_TEXT = 80;

/** Cắt gọn một dòng chữ người dùng nhập: bỏ xuống dòng, giới hạn độ dài.
 *  Chữ dài hơn khung ảnh không vỡ layout (SVG chỉ tràn ra ngoài) nhưng đọc ra
 *  là một dòng bị cụt — chặn từ lúc lưu thì tấm ảnh luôn còn dùng được. */
function line(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  return v.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

/**
 * Đọc giá trị thô từ DB (hoặc từ client) về một `MapCardOptions` hợp lệ.
 *
 * Luôn trả về đủ khoá: bản ghi cũ thiếu khoá, khoá lạ, kiểu sai, hex hỏng — tất
 * cả rơi về mặc định thay vì làm vỡ trang. Cột Json không có schema nên đây là
 * chỗ DUY NHẤT được phép tin dữ liệu, cả lúc đọc lẫn lúc ghi.
 */
export function parseMapCardOptions(
  value: unknown,
  /**
   * Tên điền sẵn khi người dùng CHƯA từng lưu gì — lấy từ tài khoản
   * (`session.user.name`). Chỉ dùng làm giá trị khởi đầu: khi bản ghi ĐÃ có
   * khoá `name`, kể cả chuỗi rỗng, thì tôn trọng lựa chọn đó. Nếu không, người
   * cố tình bỏ tên khỏi ảnh sẽ không bao giờ bỏ được.
   */
  defaultName = "",
): MapCardOptions {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return mapCardDefaultsFor(defaultName);
  const v = value as Record<string, unknown>;
  const accent =
    typeof v.accent === "string" && HEX.test(v.accent)
      ? v.accent.toLowerCase()
      : MAP_CARD_DEFAULTS.accent;
  // Ít nhất MỘT trong hai phải bật: tắt cả hai thì tấm ảnh chỉ còn tiêu đề trên
  // nền trắng. Bảng điều khiển đã chặn, đây là lưới an toàn cho dữ liệu cũ.
  const showMap = v.showMap !== false;
  const showList = v.showList !== false;
  return {
    accent,
    name: "name" in v ? line(v.name, "") : line(defaultName, ""),
    showMap: showMap || !showList,
    showList: showList || !showMap,
  };
}
