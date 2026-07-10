"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Link2, Check, MessageCircle } from "@/components/icons";
import { cn } from "@/lib/utils";
import { PILL_BASE, PILL_SURFACE } from "@/components/site/check-in-button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

// Nút chia sẻ trang lưu trú: QR (để khách quét), sao chép link, Messenger.
// Dành cho chủ homestay gửi/in link trang đã-xác-minh cho khách.
export function StayShare({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function shareMessenger() {
    const link = encodeURIComponent(url);
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const href = appId
      ? `https://www.facebook.com/dialog/send?app_id=${appId}&link=${link}&redirect_uri=${link}`
      : `fb-messenger://share/?link=${link}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setUrl(window.location.href);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Chia sẻ ${title}`}
          className={cn(PILL_BASE, PILL_SURFACE, className)}
        >
          <Share2 className="size-4" aria-hidden />
          Chia sẻ
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-semibold tracking-tight">Chia sẻ chỗ ở này</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quét mã hoặc gửi link để khách xem trang đã xác minh.
        </p>

        <div className="mt-3 flex justify-center rounded-xl border bg-white p-3">
          {url ? (
            <QRCodeSVG value={url} size={148} marginSize={0} />
          ) : (
            <div className="size-[148px] animate-pulse rounded bg-muted" />
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <button
            type="button"
            onClick={copy}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted"
          >
            {copied ? (
              <Check className="size-4 text-primary" aria-hidden />
            ) : (
              <Link2 className="size-4" aria-hidden />
            )}
            {copied ? "Đã sao chép!" : "Sao chép liên kết"}
          </button>
          <button
            type="button"
            onClick={shareMessenger}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted"
          >
            <MessageCircle className="size-4" aria-hidden />
            Gửi qua Messenger
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
