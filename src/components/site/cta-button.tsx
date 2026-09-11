import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";

const BASE =
  R_CTRL +
  " group relative inline-flex h-12 select-none items-center gap-2.5 px-6 " +
  "font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.01em] " +
  "transition-[background-color,box-shadow,translate] duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0";

const TONES = {
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
  photo: [
    "bg-white text-neutral-900",
    "shadow-[inset_0_-1px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.18),0_18px_36px_-18px_rgb(0_0_0/0.85)]",
    "hover:bg-white/92",
    "active:shadow-[inset_0_-1px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.2)]",
    "focus-visible:ring-white focus-visible:ring-offset-black/40",
  ],
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
  tone = "surface",
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
