// Bộ icon RIÊNG cho thanh tab dưới (BottomNav) — không dùng chung với `Ic`
// (Material Symbols) như phần còn lại của site.
//
// Lý do tách: Material Symbols rounded có nét dày, hình khối đặc và kín, đặt
// cạnh nhau ở cỡ 25px thì thanh tab trông "nặng" và lệch hẳn so với tab bar của
// app iOS. Bộ này vẽ theo ngôn ngữ SF Symbols: nét MẢNH (1.7 trên khung 24), đầu
// nét và góc BO TRÒN, hình mở, nhiều khoảng thở. Chỉ 5 icon nên tự vẽ rẻ hơn
// nhiều so với kéo thêm một bộ icon thứ hai vào bundle.
//
// (Không phải SF Symbols thật — bộ đó Apple chỉ cấp phép cho app trên nền tảng
// của họ. Đây là hình tự vẽ theo cùng nguyên tắc thị giác.)
//
// Mỗi icon có HAI bản, đúng cách tab bar iOS báo trạng thái:
// - viền (mục không mở): chỉ stroke, không tô;
// - đặc (mục đang mở): tô kín cùng bóng dáng. Vài bản đặc dùng `fill-rule
//   evenodd` để khoét lỗ (kim la bàn, chấm hội thoại) — giữ chi tiết bên trong
//   mà không cần vẽ đè màu nền, vốn không làm được trên nền trong mờ.
//
// Mọi hình dựng từ đường thẳng + cung tròn, KHÔNG bezier tự do: dễ soi lại toạ
// độ khi cần chỉnh, và không bị méo ở cỡ nhỏ.

export type TabIconName =
  | "home"
  | "compass"
  | "map"
  | "community"
  | "account";

const OUTLINE: Record<TabIconName, React.ReactNode> = {
  // Mái nhà + thân, hai nét rời — đúng kiểu `house` của SF.
  home: (
    <>
      <path d="M3.6 10.9 12 4.2l8.4 6.7" />
      <path d="M5.7 9.6v9.2a1.9 1.9 0 0 0 1.9 1.9h8.8a1.9 1.9 0 0 0 1.9-1.9V9.6" />
    </>
  ),
  // La bàn: vòng tròn + kim hình thoi lệch trục.
  compass: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M15.7 8.3 13.4 13.4 8.3 15.7l2.3-5.1 5.1-2.3Z" />
    </>
  ),
  // Bản đồ gấp 3 nếp: bao ngoài + 2 đường gấp.
  map: (
    <>
      <path d="M9 4.6 3.7 6.8v12.6L9 17.2l6 2.2 5.3-2.2V5.4L15 7.6 9 4.6Z" />
      <path d="M9 4.6v12.6" />
      <path d="M15 7.6v11.8" />
    </>
  ),
  // Bong bóng hội thoại có đuôi + 3 chấm.
  community: (
    <>
      <path d="M3 12.6V8.2a3.6 3.6 0 0 1 3.6-3.6h10.8A3.6 3.6 0 0 1 21 8.2v4.4a3.6 3.6 0 0 1-3.6 3.6h-6L6.9 20.05a.6.6 0 0 1-.99-.52l.69-3.33A3.6 3.6 0 0 1 3 12.6Z" />
      <circle cx="8.2" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  // Đầu + vai: vai là nửa cung HỞ, không khép đáy (kiểu `person` của SF).
  account: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M5.4 20a6.6 6.6 0 0 1 13.2 0" />
    </>
  ),
};

const FILLED: Record<TabIconName, React.ReactNode> = {
  home: (
    <path d="M11.06 3.28a1.5 1.5 0 0 1 1.88 0l8.4 6.7a1 1 0 0 1-1.12 1.4l-.42-.33v7.35a2.7 2.7 0 0 1-2.7 2.7H6.9a2.7 2.7 0 0 1-2.7-2.7v-7.35l-.42.33a1 1 0 0 1-1.12-1.4l8.4-6.7Z" />
  ),
  compass: (
    <path
      fillRule="evenodd"
      d="M12 3.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6Zm3.7 4.6-2.3 5.1-5.1 2.3 2.3-5.1 5.1-2.3Z"
    />
  ),
  // Ba nếp gấp vẽ RỜI, chừa khe ~0.9 — khe chính là đường gấp, khỏi phải vẽ đè
  // màu nền lên hình đặc (không khả thi trên nền trong mờ).
  map: (
    <>
      <path d="M8.55 4.8 3.5 6.9v12.35l5.05-2.05V4.8Z" />
      <path d="M9.45 5.1 14.55 7.5v11.85l-5.1-2.15V5.1Z" />
      <path d="M15.45 7.75 20.5 5.65V18l-5.05 2.05V7.75Z" />
    </>
  ),
  community: (
    <path
      fillRule="evenodd"
      d="M3 12.6V8.2a3.6 3.6 0 0 1 3.6-3.6h10.8A3.6 3.6 0 0 1 21 8.2v4.4a3.6 3.6 0 0 1-3.6 3.6h-6L6.9 20.05a.6.6 0 0 1-.99-.52l.69-3.33A3.6 3.6 0 0 1 3 12.6Zm5.2-3.25a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm3.8 0a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm3.8 0a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z"
    />
  ),
  account: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M5.2 20.4a6.8 6.8 0 0 1 13.6 0 .9.9 0 0 1-.9.9H6.1a.9.9 0 0 1-.9-.9Z" />
    </>
  ),
};

export function TabIcon({
  name,
  active,
  className,
}: {
  name: TabIconName;
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      {...(active
        ? { fill: "currentColor" }
        : {
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          })}
    >
      {active ? FILLED[name] : OUTLINE[name]}
    </svg>
  );
}
