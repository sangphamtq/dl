import Link from "next/link";
import { X } from "lucide-react";

// Nút xóa toàn bộ filter — về lại đường dẫn gốc (không query). Chỉ hiện khi đang lọc.
export function ClearFilters({ href, show }: { href: string; show: boolean }) {
  if (!show) return null;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <X className="size-3.5" aria-hidden />
      Xóa lọc
    </Link>
  );
}
