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
  | "rows"
  | "back"
  | "sparkle"
  | "route"
  | "clock"
  | "calendar"
  | "eye"
  | "bowl"
  | "bed"
  | "forward"
  | "close"
  | "plus"
  | "phone"
  | "globe"
  | "navigation"
  | "external"
  | "expand"
  | "chevron-down"
  | "shield"
  | "wallet"
  | "message"
  | "link"
  | "chef"
  | "car"
  | "bus"
  | "train"
  | "plane"
  | "boat"
  | "two-wheel"
  | "walk";

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
  back: <path d="M14.8 5.2 8 12l6.8 6.8" />,
  // Chùm lấp lánh — cùng hình với `experience` của `nav-icons` (bốn cánh dựng
  // bằng bốn cung lõm + một ngôi nhỏ lệch góc), để mục "Trải nghiệm" ở thanh
  // tab và dòng dữ kiện của chính tab đó nói cùng một hình.
  sparkle: (
    <>
      <path d="M10.6 5.2A9.2 9.2 0 0 0 18.6 13.2 9.2 9.2 0 0 0 10.6 21.2 9.2 9.2 0 0 0 2.6 13.2 9.2 9.2 0 0 0 10.6 5.2Z" />
      <path d="M18.6 2.8A3.3 3.3 0 0 0 21.4 5.6 3.3 3.3 0 0 0 18.6 8.4 3.3 3.3 0 0 0 15.8 5.6 3.3 3.3 0 0 0 18.6 2.8Z" />
    </>
  ),
  // Lộ trình: hai điểm đầu–cuối + nét chữ S nối chúng. Cùng hình với `route`
  // của `nav-icons` (mục "Di chuyển" ở thanh tab).
  route: (
    <>
      <circle cx="6.4" cy="6.5" r="2.3" />
      <circle cx="17.6" cy="17.5" r="2.3" />
      <path d="M8.7 6.5h3.1a2.75 2.75 0 0 1 0 5.5h-1.7a2.75 2.75 0 0 0 0 5.5h5.2" />
    </>
  ),
  // Đồng hồ: vòng tròn + hai kim chỉ 2 giờ. Dùng cho THỜI LƯỢNG của một hoạt
  // động ("2 ngày 1 đêm", "nửa buổi").
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  // Lịch: khung + hai chân treo + vạch ngăn phần đầu. Dùng cho MÙA / thời điểm
  // trong năm — khác `sunrise` (giờ đẹp trong ngày) ở chỗ đó.
  calendar: (
    <>
      <path d="M5.8 6h12.4a1.8 1.8 0 0 1 1.8 1.8v11a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.8v-11A1.8 1.8 0 0 1 5.8 6Z" />
      <path d="M4 10.2h16" />
      <path d="M8.4 3.6v3.2" />
      <path d="M15.6 3.6v3.2" />
    </>
  ),
  // Con mắt: hai cung đối xứng + tròng. Dùng cho "chỗ ngồi có view".
  eye: (
    <>
      <path d="M2.6 12S6.2 5.8 12 5.8 21.4 12 21.4 12 17.8 18.2 12 18.2 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  // Tô + đũa — cùng hình với `food` của `nav-icons`, để mục "Ẩm thực" ở thanh
  // tab và dòng dữ kiện của chính tab đó nói cùng một hình.
  bowl: (
    <>
      <path d="M3.4 12.2h17.2a8.6 8.6 0 0 1-17.2 0Z" />
      <path d="m9.1 9.8 7.9-5.4" />
      <path d="m12 10.9 7.9-5.4" />
    </>
  ),
  // Giường nhìn ngang — cùng hình với `stay` của `nav-icons`.
  bed: (
    <>
      <path d="M3.4 4.6v15.4" />
      <path d="M3.4 9.4h14.9a2.3 2.3 0 0 1 2.3 2.3V20" />
      <path d="M3.4 16.3h17.2" />
      <path d="M7.6 9.4v6.9" />
    </>
  ),
  forward: <path d="M9.2 5.2 16 12l-6.8 6.8" />,
  close: (
    <>
      <path d="M6.2 6.2 17.8 17.8" />
      <path d="M17.8 6.2 6.2 17.8" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5.4v13.2" />
      <path d="M5.4 12h13.2" />
    </>
  ),
  // Ống nghe điện thoại — dáng quen thuộc nhất ở cỡ nhỏ, dựng từ đoạn thẳng +
  // hai cung ở hai đầu.
  phone: (
    <path d="M7.4 3.8h3l1.6 4-2 1.2a12 12 0 0 0 5 5l1.2-2 4 1.6v3a1.8 1.8 0 0 1-1.8 1.8A15.6 15.6 0 0 1 5.6 5.6 1.8 1.8 0 0 1 7.4 3.8Z" />
  ),
  // Quả địa cầu: vòng ngoài + kinh tuyến (hai cung ngược chiều) + xích đạo.
  globe: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.6a9.6 9.6 0 0 1 0 16.8 9.6 9.6 0 0 1 0-16.8Z" />
    </>
  ),
  // Mũi tên chỉ đường kiểu cánh diều — chỉ dùng đoạn thẳng nên sắc ở mọi cỡ.
  navigation: <path d="M20.4 3.6 3.6 10.8l7.2 2.4 2.4 7.2Z" />,
  // Mở ra ngoài: khung hở một góc + mũi tên bay ra.
  external: (
    <>
      <path d="M13.8 4.4h5.8v5.8" />
      <path d="M19.6 4.4 11.6 12.4" />
      <path d="M17.8 13.6v4.2a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8V8a1.8 1.8 0 0 1 1.8-1.8h4.2" />
    </>
  ),
  // Phóng to: bốn góc mở ra.
  expand: (
    <>
      <path d="M9.4 4.4H4.4v5" />
      <path d="M14.6 4.4h5v5" />
      <path d="M14.6 19.6h5v-5" />
      <path d="M9.4 19.6h-5v-5" />
    </>
  ),
  "chevron-down": <path d="M5.2 9.2 12 16l6.8-6.8" />,
  // Khiên — dùng cho dải an toàn của tab Lưu trú. Chỉ bao ngoài, phần "đã xác
  // minh / chưa xác minh" để `check` và `warn` nói, khỏi vẽ ba biến thể khiên.
  shield: (
    <path d="M12 3.4 4.8 6.2v5.6c0 4.3 2.9 7.5 7.2 8.8 4.3-1.3 7.2-4.5 7.2-8.8V6.2L12 3.4Z" />
  ),
  // Ví: thân + nắp gập + chốt tròn. Dùng cho chính sách cọc.
  wallet: (
    <>
      <path d="M4.2 8.4h13.6a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2V8.4Z" />
      <path d="M4.2 8.4V6.8a1.8 1.8 0 0 1 1.8-1.8h9.4" />
      <circle cx="16" cy="14.1" r="1.1" />
    </>
  ),
  // Bong bóng hội thoại — cùng dáng với `community` của `nav-icons` (bỏ ba
  // chấm bên trong: ở 16px chúng dính thành một vệt).
  message: (
    <path d="M3 12.6V8.2a3.6 3.6 0 0 1 3.6-3.6h10.8A3.6 3.6 0 0 1 21 8.2v4.4a3.6 3.6 0 0 1-3.6 3.6h-6L6.9 20.05a.6.6 0 0 1-.99-.52l.69-3.33A3.6 3.6 0 0 1 3 12.6Z" />
  ),
  // Mắt xích: hai nửa vòng nối nhau — ký hiệu quy ước cho "liên kết".
  link: (
    <>
      <path d="M10.4 13.6a3.6 3.6 0 0 0 5.4.4l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1l-1.4 1.4" />
      <path d="M13.6 10.4a3.6 3.6 0 0 0-5.4-.4l-2.4 2.4a3.6 3.6 0 0 0 5.1 5.1l1.4-1.4" />
    </>
  ),
  // Mũ đầu bếp: chỏm ba múi + vành. Dùng cho khối "Trải nghiệm ẩm thực" —
  // tour/lớp học, tức là ĐI XEM CÁCH LÀM chứ không phải đi ăn, nên không dùng
  // lại hình cái tô.
  chef: (
    <>
      <path d="M7.6 12.4a3.8 3.8 0 1 1 1.2-7.4 3.6 3.6 0 0 1 6.4 0 3.8 3.8 0 1 1 1.2 7.4" />
      <path d="M7.6 12.4h8.8v5.8a1.8 1.8 0 0 1-1.8 1.8H9.4a1.8 1.8 0 0 1-1.8-1.8v-5.8Z" />
    </>
  ),
  /* ── Phương tiện (tab Di chuyển) ──────────────────────────────────
     Vẽ theo HỌ chứ không theo từng `mode`: bảy hình cho mười ba mode.
     Taxi · xe ghép · xe đưa đón đều ra hình Ô TÔ; xe máy · xe đạp · xích lô
     đều ra hình HAI BÁNH. Lý do: ở 20px, một chiếc taxi và một chiếc ô tô
     khác nhau đúng cái mào đèn — vẽ thì thành hai vệt gần giống nhau, mà cái
     nhãn chữ ngay cạnh đã nói chính xác là gì rồi. Icon ở đây làm việc "nhận
     ra họ phương tiện trong một cái liếc", không phải phân loại. */
  car: (
    <>
      <path d="M5.2 14.2 6.9 9.4a2.2 2.2 0 0 1 2.1-1.5h6a2.2 2.2 0 0 1 2.1 1.5l1.7 4.8" />
      <path d="M4.8 14.2h14.4a1.6 1.6 0 0 1 1.6 1.6v2.4H3.2v-2.4a1.6 1.6 0 0 1 1.6-1.6Z" />
      <circle cx="7.4" cy="18.2" r="1.6" />
      <circle cx="16.6" cy="18.2" r="1.6" />
    </>
  ),
  bus: (
    <>
      <path d="M6 3.8h12a2 2 0 0 1 2 2v9.8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" />
      <path d="M4 10.4h16" />
      <circle cx="7.6" cy="19.4" r="1.5" />
      <circle cx="16.4" cy="19.4" r="1.5" />
    </>
  ),
  train: (
    <>
      <path d="M7.4 3.8h9.2a2.2 2.2 0 0 1 2.2 2.2v8.6a2.2 2.2 0 0 1-2.2 2.2H7.4a2.2 2.2 0 0 1-2.2-2.2V6a2.2 2.2 0 0 1 2.2-2.2Z" />
      <path d="M5.2 10.2h13.6" />
      <path d="m7.8 16.8-2 3.4" />
      <path d="m16.2 16.8 2 3.4" />
    </>
  ),
  plane: (
    <path d="M10.4 3.6a1.6 1.6 0 0 1 3.2 0v5.2l7.2 4v2.4l-7.2-2.2v4.2l2.4 1.8v1.6l-4-1.2-4 1.2v-1.6l2.4-1.8v-4.2L3.2 15.2v-2.4l7.2-4V3.6Z" />
  ),
  boat: (
    <>
      <path d="M3.4 15.6h17.2a8.8 8.8 0 0 1-17.2 0Z" />
      <path d="M12 14V3.4" />
      <path d="M12 5.6 18 13.2h-6V5.6Z" />
    </>
  ),
  "two-wheel": (
    <>
      <circle cx="5.8" cy="16.6" r="3.4" />
      <circle cx="18.2" cy="16.6" r="3.4" />
      <path d="M5.8 16.6h5l4-7.2" />
      <path d="M18.2 16.6 15 9.4h-2.6" />
      <path d="M9 9.4h3.4" />
    </>
  ),
  walk: (
    <>
      <circle cx="13.2" cy="4.9" r="2.1" />
      <path d="M12.6 8.2 10.9 13.4l3 2.9.6 4.9" />
      <path d="m10.9 13.4-2.6 3.3-.9 3.5" />
      <path d="m12.2 9.6 3.4 1.9" />
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
