"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PILL_BASE, PILL_SURFACE } from "@/components/site/check-in-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Icon trần: nền tròn CHỈ hiện khi hover — tiện ích phụ, không đeo vỏ glass cố định,
// nhường phân cấp cho hành động chính (đánh dấu). Đồng bộ ngôn ngữ editorial của hero.
const SHARE_ICON =
  "inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Nút chia sẻ: sao chép liên kết + gửi qua Messenger.
// iconOnly: nút tròn chỉ có icon (dùng cạnh một hành động chính có nhãn).
export function ShareButton({
  title,
  className,
  iconOnly = false,
}: {
  title: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const url = () =>
    typeof window !== "undefined" ? window.location.href : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function shareMessenger() {
    const link = encodeURIComponent(url());
    // Send Dialog (web) cần Facebook App ID; thiếu thì dùng deep link app Messenger.
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const href = appId
      ? `https://www.facebook.com/dialog/send?app_id=${appId}&link=${link}&redirect_uri=${link}`
      : `fb-messenger://share/?link=${link}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Chia sẻ ${title}`}
          title={iconOnly ? "Chia sẻ" : undefined}
          className={cn(
            iconOnly ? SHARE_ICON : cn(PILL_BASE, PILL_SURFACE),
            className,
          )}
        >
          <Share2 className="size-4" aria-hidden />
          {!iconOnly && "Chia sẻ"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={copy}>
          {copied ? (
            <Check className="size-4 text-primary" aria-hidden />
          ) : (
            <Link2 className="size-4" aria-hidden />
          )}
          {copied ? "Đã sao chép!" : "Sao chép liên kết"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareMessenger}>
          <MessengerIcon />
          Messenger
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Logo Messenger nội tuyến (lucide không có icon thương hiệu).
function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.04.57.62.94 1.14.71l1.99-.88c.17-.07.36-.09.54-.04.91.25 1.88.39 2.87.39 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2Zm6.01 7.46-2.94 4.66c-.47.74-1.47.93-2.18.4l-2.33-1.75a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.69-.63l2.94-4.66c.47-.74 1.47-.93 2.18-.4l2.33 1.75c.21.16.51.16.72 0l3.15-2.39c.42-.32.97.18.69.63Z" />
    </svg>
  );
}
