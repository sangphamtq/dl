import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Khối "Sắp có" dùng chung cho các trang placeholder (Bản đồ, Lịch trình…).
// Trang gọi tự bọc <SiteHeader/> và <SiteFooter/> quanh component này.
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-sky-100/70 via-sky-50/40 to-background dark:from-muted/30 dark:via-muted/10">
      {/* Họa tiết vòng tròn đồng tâm (sau nội dung) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 -z-10 size-[36rem] rounded-full border border-primary/10 [mask-image:radial-gradient(circle,black,transparent_70%)]"
      >
        <div className="absolute inset-12 rounded-full border border-primary/10" />
        <div className="absolute inset-28 rounded-full border border-warm/10" />
      </div>

      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:py-28">
        <span className="inline-flex items-center rounded-full bg-warm/15 px-3 py-1 text-xs font-semibold text-warm">
          Sắp có
        </span>

        <div className="mx-auto mt-6 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-8" aria-hidden />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/diem-den"
            className={cn(buttonVariants(), "rounded-full")}
          >
            Xem danh sách điểm đến
          </Link>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
