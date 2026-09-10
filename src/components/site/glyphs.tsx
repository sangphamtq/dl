/* Hình tự vẽ dùng trong THÂN TRANG — không phải thanh điều hướng.
   Song song với `nav-icons.tsx` (bộ của thanh tab dưới + cụm icon header) và
   KHÔNG dùng chung với `Ic` (Material Symbols) như phần còn lại của site.

   Vì sao lại thêm một bộ nữa thay vì gọi `NavIcon`: bộ kia có cặp viền/đặc để
   báo TRẠNG THÁI của một mục điều hướng (đang mở / không mở). Mấy hình dưới đây
   không có trạng thái nào cả — chúng là nhãn của một mẩu tin (giờ đẹp, cảnh
   báo, vé) nên chỉ cần một bản, và cần nét dày hơn một chút vì sống ở 14–16px
   chứ không phải 20–25px như icon thanh tab.

   Cùng nguyên tắc vẽ với `nav-icons`: khung 24, nét MẢNH, đầu nét và góc BO
   TRÒN, hình mở. Mọi hình dựng từ ĐƯỜNG THẲNG + CUNG TRÒN, không bezier tự do —
   dễ soi lại toạ độ khi chỉnh và không méo ở cỡ nhỏ.

   (Không phải SF Symbols thật — Apple chỉ cấp phép cho app trên nền tảng của
   họ. Đây là hình tự vẽ theo cùng nguyên tắc thị giác.) */

export type GlyphName =
  | "pin"
  | "gate"
  | "ticket"
  | "sunrise"
  | "warn"
  | "check"
  | "search"
  | "grid"
  | "rows";

const SHAPES: Record<GlyphName, React.ReactNode> = {
  // Ghim bản đồ — CÙNG thân ghim với `spot` của `nav-icons` (hai vai thẳng chạy
  // từ mũi lên cung tròn, đúng dáng ghim Apple Maps chứ không phải giọt nước bo
  // đều), để thẻ địa điểm và thanh tab nói cùng một hình.
  pin: (
    <>
      <path d="M12 20.6 6.6 14.2a6.6 6.6 0 1 1 10.8 0L12 20.6Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </>
  ),
  // Cổng chào: hai cột + xà ngang nhô ra hai bên + một xà thấp hơn. Dưới chân
  // ĐỂ TRỐNG — đi thẳng qua được, đó chính là "vào tự do". Nó nằm ngay cạnh cái
  // vé ở dải dữ kiện, và cổng ↔ vé là cặp ai cũng đọc ra ngay: vào cổng này có
  // mất tiền không.
  //
  // Bản đầu là một VÒM đặc đứng trên vạch đất — soi ở 14px thì ra tấm bia mộ.
  gate: (
    <>
      <path d="M3.6 6.2h16.8" />
      <path d="M7.2 9.8h9.6" />
      <path d="M6.2 20.4V6.2" />
      <path d="M17.8 20.4V6.2" />
    </>
  ),
  // Vé: khung bo góc + hai vết khoét nửa cung ở hai cạnh — chỗ xé vé.
  ticket: (
    <path d="M3.8 9.6V7.8a1.8 1.8 0 0 1 1.8-1.8h12.8a1.8 1.8 0 0 1 1.8 1.8v1.8a2.4 2.4 0 0 0 0 4.8v1.8a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8v-1.8a2.4 2.4 0 0 0 0-4.8Z" />
  ),
  // Mặt trời nhô lên khỏi đường chân trời + ba tia. Nửa vòm chứ không phải vòng
  // tròn đủ: vòng tròn là "trời nắng", nửa vòm mới là "bình minh / hoàng hôn" —
  // đúng thứ `bestTime` của một địa điểm tham quan đang nói.
  //
  // Cả bộ giữ CHIỀU CAO QUANG HỌC ngang nhau (~60–70% khung 24). Bản trước hình
  // này chỉ cao 47% vì dồn hết xuống nửa dưới, nên đứng cạnh chữ 12px trong
  // dòng "Đẹp nhất:" nó đọc ra một vệt nhỏ hơn hẳn mấy hình bên cạnh.
  sunrise: (
    <>
      <path d="M2.8 20h18.4" />
      <path d="M5.4 20a6.6 6.6 0 0 1 13.2 0" />
      <path d="M12 3.6v3" />
      <path d="m5.4 8 1.9 1.9" />
      <path d="m18.6 8-1.9 1.9" />
    </>
  ),
  // Tam giác cảnh báo. Chấm dưới vẽ bằng một đoạn dài 0 + đầu nét bo tròn.
  warn: (
    <>
      <path d="M12 4.4 21.2 19.6H2.8L12 4.4Z" />
      <path d="M12 10.4v3.4" />
      <path d="M12 16.5h.01" />
    </>
  ),
  // Dấu tick trong vòng tròn = "khách xác nhận". Cố ý KHÔNG dùng ngón cái giơ
  // lên (vẽ bằng đường thẳng + cung thì ra một nắm tay không đọc được ở 14px)
  // và cũng không dùng trái tim — chỉ số này là "đáng đi", gồm cả những người
  // chấm "đáng đi một lần", trái tim sẽ nói quá.
  check: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.2 12.2 2.6 2.6 5-5.4" />
    </>
  ),
  // Kính lúp: vòng tròn + cán chéo.
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m15.6 15.6 4.8 4.8" />
    </>
  ),
  // Hai kiểu xem. Cặp này phải đọc ra Ở CẠNH NHAU, nên vẽ cùng một khổ ô: lưới
  // là bốn ô vuông, danh sách là ba HÀNG có ô ảnh bên trái — chính là hình dáng
  // thật của hai kiểu, chứ không phải lưới-vs-ba-gạch (ba gạch đã là menu).
  grid: (
    <>
      <rect x="3.8" y="3.8" width="7.2" height="7.2" rx="1.8" />
      <rect x="13" y="3.8" width="7.2" height="7.2" rx="1.8" />
      <rect x="3.8" y="13" width="7.2" height="7.2" rx="1.8" />
      <rect x="13" y="13" width="7.2" height="7.2" rx="1.8" />
    </>
  ),
  rows: (
    <>
      <rect x="3.4" y="4.6" width="5" height="5" rx="1.4" />
      <rect x="3.4" y="14.4" width="5" height="5" rx="1.4" />
      <path d="M11.6 6.2h9" />
      <path d="M11.6 9.4h6" />
      <path d="M11.6 16h9" />
      <path d="M11.6 19.2h6" />
    </>
  ),
};

export function Glyph({
  name,
  className,
}: {
  name: GlyphName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[name]}
    </svg>
  );
}
