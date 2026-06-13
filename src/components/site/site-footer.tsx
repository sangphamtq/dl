import Link from "next/link";
import { Compass } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 font-medium text-foreground"
        >
          <Compass className="size-4 text-primary" aria-hidden />
          Hành Trình Việt
        </Link>
        <p className="mt-2">Hỗ trợ thông tin du lịch Việt Nam.</p>
      </div>
    </footer>
  );
}
