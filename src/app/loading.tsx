import Image from "next/image";

// Fallback Suspense khi điều hướng giữa các trang public (CMS có loading riêng).
export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-1 items-center justify-center bg-background">
      <Image
        src="/loading_page.gif"
        alt="Đang tải…"
        width={320}
        height={236}
        priority
        unoptimized
        className="h-auto w-44 sm:w-52"
      />
    </div>
  );
}
