import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

// Nút hành động chính. MỘT khuôn cho cả hero lẫn khối kết, chỉ đổi tông màu
// theo thứ nằm sau lưng nó.
//
// Bản trước có: đĩa trắng lọt trong viên nút, hai mũi tên chạy qua nhau, một
// vệt sáng quét chéo, nút nhấc lên 2px và bóng màu nở ra khi rê chuột. Năm hiệu
// ứng cho một cái nút — mỗi thứ riêng lẻ đều "hiện đại", cộng lại thì nó là thứ
// duy nhất trên trang đòi được chú ý, và đòi to hơn cả tấm ảnh lẫn tiêu đề.
//
// Ở đây chỉ còn hình viên thuốc, một màu nền và MỘT chuyển động: mũi tên nhích
// 2px. Đúng cử chỉ mà `SectionHeading` và mọi link "Xem tất cả" trong site đang
// dùng — nút chính không cần một ngôn ngữ chuyển động riêng, nó chỉ cần đậm hơn.
export function CtaButton({
  href,
  children,
  className,
  /** `photo`: nút nằm trên ảnh → nền trắng, chữ mực, có bóng để tách khỏi ảnh.
   *  Mặc định nằm trên nền trang → nền `primary`. */
  tone = "surface",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "photo" | "surface";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-12 items-center gap-2.5 rounded-full px-6 font-[family-name:var(--font-display)] text-[0.95rem] font-semibold transition-colors",
        tone === "photo"
          ? "bg-white text-foreground shadow-md shadow-black/20 hover:bg-white/90"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      {children}
      <ArrowRight
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
}
