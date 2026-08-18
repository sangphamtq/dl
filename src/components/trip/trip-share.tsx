"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Link2, Loader2, Share2 } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { setSharing } from "@/app/(site)/lich-trinh/actions";

// Chia sẻ lịch trình — cùng khuôn với StayShare ở trang lưu trú (QR + copy),
// nhưng có thêm công tắc bật/tắt: lịch trình mặc định RIÊNG TƯ, chỉ thành link
// xem được khi chủ chuyến chủ động bật.
export function TripShare({
  tripId,
  title,
  shareId,
  shared,
}: {
  tripId: string;
  title: string;
  shareId: string | null;
  shared: boolean;
}) {
  const [on, setOn] = useState(shared);
  const [id, setId] = useState(shareId);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const url =
    on && id && typeof window !== "undefined"
      ? `${window.location.origin}/lich-trinh/s/${id}`
      : "";

  function toggle(next: boolean) {
    start(async () => {
      const res = await setSharing(tripId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOn(next);
      if (res.data.shareId) setId(res.data.shareId);
      toast(next ? "Đã bật chia sẻ" : "Đã tắt chia sẻ — link cũ không xem được nữa");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Chia sẻ ${title}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-4 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 className="size-4" aria-hidden />
          Chia sẻ
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight">Chia sẻ lịch trình</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Bật để ai có link đều xem được (chỉ đọc, không lên Google).
            </p>
          </div>
          {pending ? (
            <Loader2 className="mt-1 size-4 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <Switch checked={on} onCheckedChange={toggle} aria-label="Bật chia sẻ" />
          )}
        </div>

        {on && url && (
          <>
            <div className="mt-3 flex justify-center rounded-xl border bg-white p-3">
              <QRCodeSVG value={url} size={148} marginSize={0} />
            </div>
            <button
              type="button"
              onClick={copy}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted"
            >
              {copied ? (
                <Check className="size-4 text-primary" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              {copied ? "Đã sao chép!" : "Sao chép liên kết"}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
