import Link from "next/link";
import { Ic } from "@/components/icon";

// Tiêu đề section — MỘT khuôn duy nhất: tên bên trái, link "Xem tất cả" bên phải.
//
// Đã gỡ hết phần trang trí từng có ở đây, mỗi thứ vì một lý do riêng:
//   · nhãn eyebrow viết tay ("Nghỉ ngơi", "Tham quan"…) — gần như lặp lại chính
//     tiêu đề ngay dưới nó, mà lại ăn thêm một dòng ở cả 16 section;
//   · đường bay nét đứt + máy bay kéo sang mép phải — nó lấp khoảng trống giữa
//     tiêu đề và link, nhưng khoảng trống ấy không cần lấp: hai đầu một hàng là
//     bố cục tự nó đã rõ;
//   · con số rời cỡ lớn đứng trước link — đọc lên là "16 quán" rồi ngay cạnh
//     lại "Xem tất cả", hai mẩu của cùng một câu bị tách làm hai khối. Gộp vào
//     nhãn link thành "Xem tất cả 16 quán" là hết trùng.
// Còn lại đúng hai thứ mang thông tin. Trang này lấy ảnh và nội dung làm chủ;
// tiêu đề section chỉ cần đứng đúng chỗ và nói đúng tên.
//
// Trước đây component có hai biến thể, chọn bằng việc có truyền `eyebrow` hay
// không. Kiểm lại thì cả 16 chỗ gọi đều truyền → nhánh "gọn" là code chết, đã
// xoá cùng luôn.
export function SectionHeading({
  title,
  href,
  count,
  unit,
  actions,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string; // đơn vị đi kèm số, vd "địa điểm" → "Xem tất cả 8 địa điểm"
  // Điều khiển riêng của section (vd nút "Viết đánh giá") — đứng trước link
  // "Xem tất cả" trong cùng hàng tiêu đề, không đẻ thêm một hàng nút.
  actions?: React.ReactNode;
}) {
  const link = href && (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
    >
      <span>
        Xem tất cả
        {/* Con số ẩn dưới sm: màn hẹp thì tiêu đề đã chiếm gần hết hàng, thêm
            "16 quán" là link tự xuống dòng. */}
        {count != null && (
          <span className="hidden tabular-nums sm:inline">
            {" "}
            {count}
            {unit ? ` ${unit}` : ""}
          </span>
        )}
      </span>
      <Ic
        icon="arrow-right"
        className="size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );

  return (
    // `items-baseline`: chữ 40px và link 14px ăn chung một đường chân chữ, chứ
    // không canh giữa theo chiều cao — canh giữa thì link trôi lên lưng chừng.
    // `flex-wrap`: tiêu đề dài trên màn hẹp thì link xuống hàng, không bị ép bẹp.
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      {/* MÀU: `foreground`, KHÔNG phải `primary`.
          Xanh lá từng được chọn hồi tiêu đề còn là chữ viết tay cỡ 68px — ở cỡ
          đó gần-đen ra một khối chữ nặng. Nay đã về font display 28→40px thì lý
          do ấy hết hiệu lực, và giữ xanh lại sai theo hai hướng:
          · trên trang này XANH ĐANG CÓ NGHĨA LÀ "bấm được" — link "Xem tất cả"
            xanh, tên thẻ đen rồi chuyển xanh khi rê chuột. Một tiêu đề tĩnh màu
            xanh là nói dối bảng từ vựng đó, nhất là khi nó nằm ngay cạnh một
            link cũng xanh;
          · skill `design` chốt "heading đậm, ĐEN, gọn", còn hai màu nhấn dành
            cho link/giá/badge/dải CTA.
          min-w-0: tiêu đề dài thì XUỐNG DÒNG, không đẩy link lòi khỏi mép. */}
      <h2 className="min-w-0 font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.03em] text-foreground">
        {title}
      </h2>
      {(actions || href) && (
        <div className="flex shrink-0 items-center gap-4">
          {actions}
          {link}
        </div>
      )}
    </div>
  );
}
