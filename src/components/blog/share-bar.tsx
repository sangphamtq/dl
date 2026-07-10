"use client";

import { useState } from "react";
import { Check, Link2 } from "@/components/icons";
import { cn } from "@/lib/utils";

// Thanh chia sẻ bài viết — copy link + mạng xã hội. Dùng window.location nên
// chạy phía client; không cần biết URL tuyệt đối lúc render server.
export function ShareBar({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const shareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "noopener,noreferrer,width=600,height=480",
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard không khả dụng — bỏ qua */
    }
  };

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-sm text-muted-foreground">Chia sẻ</span>
      <button type="button" onClick={shareFacebook} className={pill}>
        Facebook
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label="Sao chép liên kết"
        className={cn(pill, copied && "border-primary/40 bg-primary/5 text-primary")}
      >
        {copied ? (
          <>
            <Check className="size-4" aria-hidden />
            Đã chép
          </>
        ) : (
          <>
            <Link2 className="size-4" aria-hidden />
            Chép link
          </>
        )}
      </button>
    </div>
  );
}
