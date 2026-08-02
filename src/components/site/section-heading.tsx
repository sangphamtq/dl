import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

// Tiêu đề section trang Place. Khi truyền `eyebrow`, dùng phong cách travel:
// eyebrow chữ viết tay (cam) + tiêu đề xanh; link "Xem tất cả" kiểu editorial
// (nhãn gạch chân chạy ra + mũi tên trong vòng tròn xoay/đổ đầy khi hover).
// Không có eyebrow → giữ kiểu gọn cũ (dùng chung các trang khác).
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
  unit?: string; // đơn vị đi kèm số trong link, vd "địa điểm" → "Xem tất cả 8 địa điểm"
  eyebrow?: string;
  // Điều khiển riêng của section (vd nút ‹ › của carousel) — đứng trước link
  // "Xem tất cả" trong cùng hàng tiêu đề, không đẻ thêm một hàng nút.
  actions?: React.ReactNode;
}) {
  const label = (
    <>
      Xem tất cả
      {/* Số lượng chỉ hiện từ sm: trên điện thoại, "Xem tất cả 12 trải nghiệm"
          cộng với tiêu đề section là quá một dòng — link bị đẩy lòi khỏi mép
          phải. Tiêu đề mới là thứ phải đọc được nguyên vẹn. */}
      {count != null && (
        <span className="hidden tabular-nums sm:inline">
          {" "}
          {count}
          {unit ? ` ${unit}` : ""}
        </span>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "flex justify-between gap-6",
        eyebrow ? "items-end" : "items-baseline",
      )}
    >
      {/* min-w-0: tiêu đề dài thì XUỐNG DÒNG, không đẩy link "Xem tất cả" lòi
          ra ngoài mép phải màn hình. */}
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-[family-name:var(--font-script)] text-2xl leading-none text-warm sm:text-3xl">
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            "tracking-tight",
            eyebrow
              ? "mt-1 text-2xl font-extrabold text-primary sm:text-3xl"
              : "text-2xl font-bold",
          )}
        >
          {title}
        </h2>
      </div>

      {(actions || href) && (
        <div className="flex shrink-0 items-center gap-4">
          {actions}
          {href && (
            <Link
              href={href}
              className={cn(
                "group inline-flex shrink-0 items-center gap-1.5 text-sm transition-colors",
                eyebrow
                  ? "font-semibold text-muted-foreground hover:text-primary"
                  : "font-medium text-primary",
              )}
            >
              {label}
              <Ic
                icon="arrow-right"
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
