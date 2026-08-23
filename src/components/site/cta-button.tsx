import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

// Nút hành động chính. MỘT khuôn cho cả hero lẫn khối kết, đổi `tone` theo thứ
// nằm sau lưng nó.
//
// ─── Vì sao nút lại có mặt phẳng, không phải một ô màu bẹt ─────────────────
// Bản trước chỉ có: một màu nền + đổi màu khi rê chuột. Đúng là gọn, nhưng gọn
// tới mức không còn gì để nhìn — đúng cái mặc định mà mọi framework nhả ra.
// Bản này thêm ĐÚNG BA THỨ, đều là vật lý chứ không phải trang trí:
//   1. VIỀN SÁNG MÉP TRÊN + chuyển sắc rất nhẹ từ đỉnh (`inset 0 1px 0` +
//      gradient trắng 12%) — ánh sáng tới từ trên, nên mép trên của một vật
//      lồi phải sáng hơn thân nó. Đây là thứ khiến nút "có khối" chỉ bằng 1px.
//   2. BÓNG HAI TẦNG: một bóng tiếp xúc 1px sát chân (nút chạm mặt trang) và
//      một bóng khuếch tán ĐÃ NHUỘM MÀU CHÍNH NÓ (`-14px` spread âm nên chỉ
//      đọng dưới đáy) — bóng của một vật màu thì mang màu của vật đó.
//   3. BẤM THÌ LÚN: `translate-y-px` + bóng co lại. Nút không nhấc lên khi rê
//      chuột (bản cũ có, đã bỏ) — nó chỉ phản ứng khi thật sự BỊ BẤM.
// Bóng ở trạng thái nghỉ và trạng thái rê chuột GIỐNG NHAU. Bản cũ hơn nữa có
// "bóng màu nở ra khi hover" và đã bị gỡ vì nó biến cái nút thành thứ ồn ào
// nhất trang; ở đây rê chuột chỉ đổi nền một nấc, cộng mũi tên nhích 2px —
// đúng cử chỉ mà `SectionHeading` và mọi link "Xem tất cả" đang dùng.
//
// Cũng thêm `focus-visible` — bản cũ KHÔNG có gì cả, tab bàn phím tới nút chính
// của trang chủ là mất dấu hoàn toàn.

const BASE =
  "group relative inline-flex h-12 select-none items-center gap-2.5 rounded-full px-6 " +
  "font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.01em] " +
  "transition-[background-color,box-shadow,translate] duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0";

const TONES = {
  // Trên nền trang sáng. `brand` chứ không `primary`: đây là một viên nút ĐỤC
  // tự mang nền của nó đi, mà `--primary` thì tự sáng lên trong scope `.dark`
  // (xem chú thích ở `site-header.tsx`) — cùng một nút sẽ ra hai sắc xanh.
  surface: [
    // Chuyển sắc viết bằng thuộc tính tuỳ ý, KHÔNG dùng `bg-gradient-to-b`:
    // `cn()` chạy tailwind-merge, mà `bg-brand` (màu tự khai trong @theme) và
    // `bg-gradient-*` bị xếp chung một nhóm "bg-" nên cái sau nuốt cái trước —
    // nút ra nền TRẮNG với một cái bóng xanh dưới chân.
    "bg-brand text-brand-foreground",
    "[background-image:linear-gradient(to_bottom,rgb(255_255_255/0.16),transparent_60%)]",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_1px_2px_rgb(0_0_0/0.12),0_12px_24px_-14px_var(--brand)]",
    "hover:bg-brand/90",
    "active:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.14)]",
    "focus-visible:ring-brand focus-visible:ring-offset-background",
  ],
  // Nút chính đặt TRÊN ẢNH. `text-neutral-900` chứ không `text-foreground`:
  // viên nút trắng này không đổi theo theme, mà `foreground` thì lật thành gần
  // trắng trong mọi scope `.dark` — chữ trắng trên nền trắng.
  photo: [
    "bg-white text-neutral-900",
    "shadow-[inset_0_-1px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.18),0_18px_36px_-18px_rgb(0_0_0/0.85)]",
    "hover:bg-white/92",
    "active:shadow-[inset_0_-1px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.2)]",
    "focus-visible:ring-white focus-visible:ring-offset-black/40",
  ],
  // Nút PHỤ trên ảnh. Kính mờ chứ không phải một đường viền 1px: viền trần rơi
  // vào vùng ảnh sáng là biến mất, còn kính thì luôn tự tách khỏi nền — và đó
  // cũng đúng vật liệu của header đang lơ lửng ngay phía trên.
  // Viền vẽ bằng `inset` box-shadow (không phải `border`) để hai lớp — hairline
  // quanh mép và vệt sáng mép trên — nằm gọn trong một thuộc tính, không ăn
  // thêm 1px vào chiều cao nút.
  glass: [
    "bg-white/12 text-white backdrop-blur-md",
    "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35),inset_0_1px_0_rgb(255_255_255/0.28)]",
    "hover:bg-white/20",
    "focus-visible:ring-white focus-visible:ring-offset-black/40",
  ],
} as const;

export function CtaButton({
  href,
  children,
  className,
  /** `photo`/`glass`: nút nằm trên ảnh. Mặc định trên nền trang sáng. */
  tone = "surface",
  /** Mũi tên cuối nhãn. Tắt ở nút phụ — một màn hình chỉ cần một mũi tên dẫn. */
  arrow = true,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "surface" | "photo" | "glass";
  arrow?: boolean;
}) {
  return (
    <Link href={href} className={cn(BASE, TONES[tone], className)}>
      {children}
      {arrow && (
        <ArrowRight
          className="size-4 shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      )}
    </Link>
  );
}
