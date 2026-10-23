"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";

export type TripSync = { behind: boolean; refreshing: boolean; refreshNow: () => void };

/** Tải lại nội dung mới nhất tại chỗ. Sáng lên khi server đã có bản mới hơn thứ đang hiện. */
export function TripRefreshButton({ sync }: { sync: TripSync }) {
  const { behind, refreshing, refreshNow } = sync;
  const asked = useRef(false);

  useEffect(() => {
    // Chỉ báo khi CHÍNH người dùng bấm — lượt tự làm mới đã có toast riêng.
    if (!refreshing && asked.current) {
      asked.current = false;
      toast.success("Đã tải bản mới nhất.", { id: "trip-refresh" });
    }
  }, [refreshing]);

  return (
    <button
      type="button"
      disabled={refreshing}
      onClick={() => {
        asked.current = true;
        refreshNow();
      }}
      title={behind ? "Có người vừa sửa — bấm để tải bản mới nhất" : "Tải lại nội dung mới nhất"}
      aria-label={behind ? "Có thay đổi mới — tải bản mới nhất" : "Cập nhật nội dung mới nhất"}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 sm:px-3",
        behind
          ? "border-primary/50 bg-primary/5 text-primary-ink hover:bg-primary/10"
          : "border-border/60 bg-background/70 text-foreground hover:bg-muted",
      )}
    >
      <Glyph name="refresh" className={cn("size-4", refreshing && "animate-spin")} />
      {/* Dưới sm chỉ còn icon — thanh đầu ở 320px không chứa nổi thêm một nút có chữ. */}
      <span className="hidden sm:inline">{behind ? "Có thay đổi mới" : "Cập nhật"}</span>
      {behind && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-background sm:hidden"
        />
      )}
    </button>
  );
}
