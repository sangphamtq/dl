import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

// Tiêu đề section trang Place.
//
// Bản có `eyebrow` dựng theo lối "tấm nhãn viết tay + đường bay":
//   · eyebrow chữ viết tay, nghiêng nhẹ, THÒ LÊN VÀ LẤN vào tiêu đề — hai dòng
//     chồng vai nhau nên cụm đọc như một nhãn dán lên trang, không phải hai
//     dòng xếp thẳng hàng như mọi khối tiêu đề mặc định;
//   · một đường nét đứt kéo từ tiêu đề sang mép phải, đầu mút là chiếc máy bay
//     nhỏ — mô-típ "đường bay" của hệ thiết kế. Nó biến khoảng trống giữa tiêu
//     đề và link thành một quãng có chủ ý thay vì chỗ bỏ không;
//   · số lượng viết bằng font display cỡ lớn, đặt ngay trước link — con số làm
//     điểm dừng cho đường bay.
// Đường bay + con số chỉ hiện từ sm; màn hẹp thì chúng thành rác, ở đó chỉ còn
// eyebrow + tiêu đề + link.
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
      <div className="relative min-w-0">
        <p className="absolute -top-4 left-1 -rotate-3 font-[family-name:var(--font-script)] text-2xl leading-none text-warm sm:-top-5 sm:text-3xl">
          {eyebrow}
        </p>
        <h2 className="pt-5 font-[family-name:var(--font-display)] text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-foreground sm:pt-6">
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
          <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums leading-none text-foreground">
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
