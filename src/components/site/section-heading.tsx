import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

// Tiêu đề section trang Place.
//
// Bản "lớn" (khi có prop `eyebrow`) dựng theo lối "chữ viết tay + đường bay":
//   · TIÊU ĐỀ viết bằng font script — chính font trước đây dành cho eyebrow.
//     Nhãn eyebrow đã BỎ: hai dòng chồng vai nhau ăn mất một khoảng dọc đáng kể
//     ở mọi section, mà nội dung nó mang ("Nghỉ ngơi", "Tham quan"…) gần như
//     lặp lại chính tiêu đề ngay dưới. Dồn cá tính viết tay vào một dòng duy
//     nhất thì cụm gọn hơn mà không mất chất;
//   · một đường nét đứt kéo từ tiêu đề sang mép phải, đầu mút là chiếc máy bay
//     nhỏ — mô-típ "đường bay" của hệ thiết kế. Nó biến khoảng trống giữa tiêu
//     đề và link thành một quãng có chủ ý thay vì chỗ bỏ không;
//   · số lượng viết bằng font display cỡ lớn, đặt ngay trước link — con số làm
//     điểm dừng cho đường bay. Con số CỐ Ý không dùng script: chữ số viết tay
//     khó đọc nhanh, mà đây đúng là thứ người ta liếc để lấy con số.
// Đường bay + con số chỉ hiện từ sm; màn hẹp thì chúng thành rác, ở đó chỉ còn
// tiêu đề + link.
//
// `eyebrow` GIỜ CHỈ CÒN LÀ CỜ chọn biến thể lớn — nội dung chuỗi không render ở
// đâu nữa. Giữ nguyên để đổi ý là bật lại được ngay; nếu chốt bỏ hẳn thì xoá
// prop này ở cả 17 chỗ gọi và thay bằng một cờ rõ nghĩa hơn.
//
// Không truyền `eyebrow` → giữ kiểu gọn cũ (các trang khác đang dùng).
export function SectionHeading({
  title,
  href,
  count,
  unit,
  eyebrow,
  actions,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string; // đơn vị đi kèm số, vd "địa điểm" → "8 địa điểm"
  eyebrow?: string;
  // Điều khiển riêng của section (vd nút ‹ › của carousel) — đứng trước link
  // "Xem tất cả" trong cùng hàng tiêu đề, không đẻ thêm một hàng nút.
  actions?: React.ReactNode;
}) {
  const link = href && (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors",
        eyebrow ? "text-primary" : "text-primary",
      )}
    >
      <span
        className={cn(
          "pb-px transition-colors",
          eyebrow && "border-b border-primary/40 group-hover:border-primary",
        )}
      >
        Xem tất cả
        {/* Không có eyebrow thì số nằm trong nhãn link như cũ. */}
        {!eyebrow && count != null && (
          <span className="hidden tabular-nums sm:inline">
            {" "}
            {count}
            {unit ? ` ${unit}` : ""}
          </span>
        )}
      </span>
      <Ic
        icon={eyebrow ? "arrow-up-right" : "arrow-right"}
        className={cn(
          "size-4 transition-transform",
          eyebrow
            ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            : "group-hover:translate-x-0.5",
        )}
        aria-hidden
      />
    </Link>
  );

  if (!eyebrow) {
    return (
      <div className="flex items-baseline justify-between gap-6">
        {/* min-w-0: tiêu đề dài thì XUỐNG DÒNG, không đẩy link lòi khỏi mép. */}
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        </div>
        {(actions || href) && (
          <div className="flex shrink-0 items-center gap-4">
            {actions}
            {link}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="min-w-0">
        {/* Tiêu đề dùng CHÍNH font script trước đây dành cho eyebrow, và eyebrow
            bỏ hẳn — một dòng thay vì hai dòng chồng vai.
            Ba thông số phải đổi theo, không bê nguyên của font display sang:
            · `font-bold` (700) chứ không `font-extrabold` — Dancing Script chỉ
              nạp 600/700, để 800 là trình duyệt tự bóp chữ đậm thêm, nét viết
              tay bị bệt;
            · BỎ `tracking-[-0.03em]` — đây là chữ nối nét, siết âm là các chữ
              cái chồng lên nhau;
            · `leading-[1.2]` thay vì 1.15 — script có bụng chữ và nét hất dài,
              cộng dấu tiếng Việt thì 1.15 là dấu dòng dưới chạm nét dòng trên.
            CỠ CHỮ phải nhảy hẳn một bậc, không chỉ nhích. Dancing Script có
            x-height rất thấp so với em, nên cùng một px nó đọc ra nhỏ hơn sans
            chừng 30–40%: bản display cũ 28→40px, muốn nhìn TO BẰNG mức đó thì
            script phải ~40→56px, và vì giờ nó là dòng tiêu đề DUY NHẤT (eyebrow
            đã bỏ) nên đẩy tiếp lên 44→68px. Mốc đối chiếu trong site: tên địa
            điểm ở dải Spotlight 32→52px (sans), hero 52→136px — ở 68px script
            tiêu đề section đọc ngang tên Spotlight, vẫn dưới hero. */}
        {/* MÀU: `primary` (xanh lá #2e871c), không phải `foreground`.
            · gần-đen ở cỡ 68px viết tay ra một khối chữ nặng, mà cả trang có
              tới 7 tiêu đề như vậy;
            · `warm` (#ff8800) — màu của nhãn eyebrow cũ — nghe hợp nhất nhưng
              KHÔNG dùng được: cam trên nền trắng chỉ đạt 2,39:1, dưới cả ngưỡng
              3:1 của chữ cỡ lớn. Cam ở đây chỉ hợp cho nét nhỏ hoặc nền đặc
              (nút CTA chữ trắng), không hợp cho một mảng chữ lớn;
            · xanh lá đạt 4,57:1 trên nền trắng và 3,80:1 trên dải `muted`
              (#edeae4) — qua AA cho chữ lớn ở cả hai loại dải, lại là màu
              thương hiệu nên chữ viết tay đọc ra là "giọng của site". */}
        <h2 className="font-[family-name:var(--font-script)] text-[clamp(2.75rem,5.5vw,4.25rem)] font-bold leading-[1.2] text-primary">
          {title}
        </h2>
      </div>

      <span
        aria-hidden
        className="hidden min-w-16 flex-1 items-center gap-2 pb-3 sm:flex"
      >
        <span className="h-px flex-1 border-t border-dashed border-border" />
        <Ic icon="plane" className="size-4 shrink-0 -rotate-[20deg] text-warm" />
      </span>

      {count != null && (
        <span className="hidden items-baseline gap-1.5 pb-2 sm:flex">
          {/* Con số lớn theo tiêu đề: 24px đứng cạnh tiêu đề 68px thì tụt hẳn
              xuống hàng chú thích, không còn làm được điểm dừng cho đường bay. */}
          <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums leading-none text-foreground">
            {count}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </span>
      )}

      {(actions || href) && (
        <div className="flex shrink-0 items-center gap-4 pb-2">
          {actions}
          {link}
        </div>
      )}
    </div>
  );
}
