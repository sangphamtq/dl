import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { WifiOff } from "@/components/icons";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { OfflineRetry } from "@/components/site/offline-retry";

// Trang dự phòng khi mất mạng: service worker precache trang này lúc cài, rồi
// trả về mỗi khi một điều hướng thất bại và chưa có bản cache của trang đó.
// Cố ý KHÔNG dùng SiteHeader/SiteFooter — offline thì nav, tìm kiếm, avatar đều
// hỏng; giữ trang tự chứa, tĩnh hoàn toàn để chắc chắn precache được.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Không có kết nối",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-accent/60 to-background px-4 py-20">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-lg shadow-black/5 sm:p-10">
        <div className="relative mx-auto size-32">
          <Image
            src="/icons/icon-192.png"
            alt="Vali Halivivu đội nón lá"
            width={128}
            height={128}
            className="size-32 rounded-full object-contain"
            priority
          />
          <span
            className="absolute -right-1 bottom-1 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground ring-4 ring-card"
            aria-hidden
          >
            <WifiOff className="size-5" />
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          Mất sóng mất rồi
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Thiết bị đang không có kết nối mạng. Những trang bạn đã xem trước đó
          vẫn mở được — phần còn lại xin chờ khi có sóng trở lại.
        </p>

        <div className="mt-7">
          <OfflineRetry />
        </div>

        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-4 rounded-full text-muted-foreground",
          )}
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
