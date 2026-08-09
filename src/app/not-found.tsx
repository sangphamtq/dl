import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata = {
  title: "Không tìm thấy trang · Halivivu",
};

// `not-found.tsx` ở gốc bắt cả những đường dẫn KHÔNG thuộc route group `(site)`
// nên nó không dùng được layout chung — phải tự render vỏ, và tự lấy cấu hình
// hero để chuyền cho header.
export default async function NotFound() {
  const { heroLayout } = await getSettings();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader heroLayout={heroLayout} />

      <main className="flex flex-1 items-center px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto w-full max-w-3xl">
          <p className="font-mono text-sm text-muted-foreground">
            404 — không tìm thấy trang
          </p>
          <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Đường này không dẫn tới đâu cả.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Trang bạn tìm có thể đã được gỡ hoặc đổi địa chỉ. Nhưng Việt Nam thì
            vẫn còn rất nhiều nơi đáng để tới.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/"
              className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
            >
              Về trang chủ
            </Link>
            <Link
              href="/diem-den"
              className="group inline-flex items-center gap-1.5 text-sm font-medium"
            >
              Khám phá điểm đến
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
