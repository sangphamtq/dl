import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

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
  linkLabel,
  actions,
  size = "lead",
  serif = false,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string; // đơn vị đi kèm số, vd "địa điểm" → "Xem tất cả 8 địa điểm"
  /**
   * Nhãn link, mặc định "Xem tất cả".
   *
   * Có mục mà "xem tất cả" là câu SAI: mục Đi lại hiện hết số bản ghi ngay trên
   * trang tổng quan, thứ còn thiếu ở màn hình kia là phần hướng dẫn bằng lời
   * (nhà xe, hotline, cảnh báo) — nên nhãn phải là "Xem hướng dẫn đầy đủ".
   * Đổi nhãn ở đây chứ không tự dựng một link riêng: link của tiêu đề mang mũi
   * tên VẼ SẴN và ngồi đúng ô phải của hàng tiêu đề, hai thứ mà bản tự dựng sẽ
   * làm lệch (mũi tên Unicode, và một hàng tiêu đề trống bên phải).
   */
  linkLabel?: string;
  // Điều khiển riêng của section (vd nút "Viết đánh giá") — đứng trước link
  // "Xem tất cả" trong cùng hàng tiêu đề, không đẻ thêm một hàng nút.
  actions?: React.ReactNode;
  /**
   * HAI TẦNG, và đây là thứ sửa lỗi cấu trúc lớn nhất của trang điểm đến.
   *
   * Trước đây trang có ĐÚNG MỘT đơn vị cấu trúc — dải + tiêu đề 40px + 160px
   * khoảng trống — dùng y hệt nhau cho mục 15 quán ăn lẫn mục có ĐÚNG MỘT lịch
   * trình, và cho cả khối đánh giá RỖNG. Trọng lượng thật chênh nhau 15 lần mà
   * hình thức thì bằng nhau, nên mắt không xếp hạng được gì: nhịp dọc phẳng lì,
   * còn dải tint xen kẽ theo vị trí thì không nhóm được nội dung nào.
   *
   *  · `lead`  — mục có kho nội dung thật (Địa điểm · Trải nghiệm · Ẩm thực ·
   *              Lưu trú). Giữ nguyên cỡ cũ.
   *  · `minor` — mục kết/phụ và mục đang rỗng. Nhỏ hơn hẳn một bậc để nó thôi
   *              đòi ngang hàng với bốn mục trên.
   */
  size?: "lead" | "minor";
  /**
   * Giọng chữ của tiêu đề.
   *
   * `false` (mặc định) — font display đậm, tracking âm: giọng cũ, vẫn dùng ở
   * trang chủ và các trang chi tiết listing.
   * `true` — **serif in hoa giãn chữ**, cùng giọng với `/diem-den`, `/dia-diem`,
   * `/blog`, `/gioi-thieu`.
   *
   * Là THAM SỐ chứ không đổi thẳng mặc định: component này dùng ở 8 chỗ, trong
   * đó có trang chủ và ba trang chi tiết listing chưa chuyển giọng. Đổi mặc định
   * là lặng lẽ restyle luôn những trang không ai yêu cầu.
   */
  serif?: boolean;
}) {
  const link = href && (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 transition-colors",
        serif
          ? "text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          : "text-sm font-medium text-primary hover:text-primary/80",
      )}
    >
      <span>
        {linkLabel ?? "Xem tất cả"}
        {/* Con số hiện ở MỌI khổ. Trước đây nó ẩn dưới sm với lý do "link sẽ tự
            xuống dòng" — nhưng hàng này đã có `flex-wrap`, xuống dòng là hành vi
            đúng chứ không phải hỏng. Đổi lại, ẩn nó lấy mất thông tin ở đúng chỗ
            cần nhất: trên điện thoại mọi link đọc trơ ra "Xem tất cả →", khách
            không biết danh sách có 4 hay 40 mục trước khi tốn một lượt tải. */}
        {count != null && (
          <span className="tabular-nums">
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
      <h2
        className={cn(
          "min-w-0 text-foreground",
          serif
            ? "font-[family-name:var(--font-serif)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]"
            : "font-[family-name:var(--font-display)] font-bold leading-[1.15] tracking-[-0.03em]",
          size === "lead"
            ? serif
              ? "text-[clamp(1.375rem,2.8vw,2rem)]"
              : "text-[clamp(1.75rem,3.2vw,2.5rem)]"
            : serif
              ? "text-lg sm:text-xl"
              : "text-xl sm:text-2xl",
        )}
      >
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
