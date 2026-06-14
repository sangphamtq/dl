import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 font-medium text-foreground"
        >
          <Image
            src="/icon-192.png"
            alt=""
            width={20}
            height={20}
            className="size-5 rounded"
          />
          Hành Trình Việt
        </Link>
        <p className="mt-2">Hỗ trợ thông tin du lịch Việt Nam.</p>
      </div>
    </footer>
  );
}
