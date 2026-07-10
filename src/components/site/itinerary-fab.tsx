"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Route } from "@/components/icons";

// Nút nổi bám mép phải màn hình, dẫn tới lịch trình đang soạn dở.
// Ẩn khi đã ở trang lịch trình. (Placeholder: sau này chỉ hiện khi có bản nháp.)
export function ItineraryFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/lich-trinh")) return null;

  return (
    <Link
      href="/lich-trinh"
      aria-label="Lịch trình đang lên"
      title="Lịch trình đang lên"
      className="group fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center rounded-l-xl bg-primary py-2.5 pl-2.5 pr-2.5 text-primary-foreground shadow-lg shadow-black/15 transition-[padding] hover:pr-3.5"
    >
      <Route className="size-5 shrink-0" aria-hidden />
      {/* Chữ ẩn, chỉ trượt ra khi hover (mobile không hover → giữ gọn dạng icon) */}
      <span className="flex max-w-0 flex-col overflow-hidden whitespace-nowrap leading-tight opacity-0 transition-all duration-200 group-hover:ml-2.5 group-hover:max-w-[8rem] group-hover:opacity-100">
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-primary-foreground/70">
          Lịch trình
        </span>
        <span className="text-sm font-semibold">đang lên</span>
      </span>
    </Link>
  );
}
