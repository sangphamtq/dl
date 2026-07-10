"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DatabaseZap, RotateCw, TriangleAlert } from "@/components/icons";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Nhận diện lỗi mất kết nối DB từ phía client (chỉ dựa vào message — ở production
// Next.js che message nên coi như lỗi chung).
function looksLikeDbError(message: string): boolean {
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|Can't reach database|Connection terminated|prisma|P10\d\d/i.test(
    message,
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";
  const isDbError = isDev && looksLikeDbError(error.message);

  return (
    <div className="flex flex-1 items-center px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-3xl">
        {isDbError ? (
          <DatabaseZap
            className="size-9 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <TriangleAlert className="size-9 text-muted-foreground" aria-hidden />
        )}

        <p className="mt-6 font-mono text-sm text-muted-foreground">
          {isDbError ? "Không kết nối được cơ sở dữ liệu" : "Đã có lỗi xảy ra"}
        </p>
        <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          {isDbError
            ? "Trang này cần cơ sở dữ liệu."
            : "Trang gặp trục trặc."}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {isDbError
            ? "Có vẻ Postgres chưa chạy. Hãy bật database (Docker) rồi tải lại trang — nội dung sẽ hiện bình thường."
            : "Chúng tôi đã ghi nhận sự cố. Bạn thử tải lại trang, hoặc quay về trang chủ."}
        </p>

        {isDev && (
          <pre className="mt-6 max-w-full overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={reset}
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full gap-1.5",
            )}
          >
            <RotateCw className="size-4" aria-hidden />
            Thử lại
          </button>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
