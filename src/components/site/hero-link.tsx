import Link from "next/link";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";

/**
 * Nút kính trên ẢNH hero — vật liệu dùng chung của các trang mở bằng một tấm
 * ảnh tràn viền: `/diem-den`, `/dia-diem`, `/lich-trinh`.
 *
 * Trước đây mỗi trang giữ một bản chép y hệt (`BrowseLink` ở trang này,
 * `HeroLink` ở trang kia — giống nhau từng ký tự, chỉ khác cái tên). Tách ra vì
 * đây là VẬT LIỆU chứ không phải chi tiết riêng của một trang: đổi độ mờ hay độ
 * dày viền thì phải đổi ở cả ba nơi cùng lúc, mà ba bản chép thì chắc chắn có
 * ngày lệch nhau.
 *
 * Chữ in hoa giãn rộng + nền chuyển sắc rất nhạt + viền trong 1px: nút phải đọc
 * được trên ảnh SÁNG lẫn ảnh TỐI, nên không dùng nền đặc mà dùng bóng chữ.
 */
export function HeroLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        R_CTRL,
        "group relative inline-flex h-12 items-center px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_-10px_rgba(8,22,15,0.75)] backdrop-blur-[2px] backdrop-saturate-[1.3] [text-shadow:0_1px_3px_rgba(8,22,15,0.6),0_2px_16px_rgba(8,22,15,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[0.8125rem]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(R_CTRL, "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.22] via-white/[0.07] to-white/[0.02] transition-colors duration-200 group-hover:from-white/40 group-hover:via-white/20 group-hover:to-white/10 motion-reduce:transition-none")}
      />
      <span
        aria-hidden
        className={cn(R_CTRL, "pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(255,255,255,0.18)] ring-1 ring-inset ring-white/40 transition-shadow duration-200 group-hover:ring-white/75 motion-reduce:transition-none")}
      />
      <span className="relative">{label}</span>
    </Link>
  );
}
