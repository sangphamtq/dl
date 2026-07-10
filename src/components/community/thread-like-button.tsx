"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "@/components/icons";
import { cn } from "@/lib/utils";
import { toggleThreadLike, toggleReplyLike } from "@/app/cong-dong/actions";

export function ThreadLikeButton({
  kind,
  id,
  threadSlug,
  initialLiked,
  initialCount,
  isAuthed,
  size = "default",
  variant = "pill",
}: {
  kind: "thread" | "reply";
  id: string;
  threadSlug: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthed: boolean;
  size?: "default" | "sm";
  variant?: "pill" | "text";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res =
        kind === "thread"
          ? await toggleThreadLike(id, threadSlug)
          : await toggleReplyLike(id, threadSlug);
      if (res.ok) {
        setLiked(res.data.liked);
        setCount(res.data.count);
      } else {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  };

  // Biến thể text (bình luận kiểu Facebook): chữ "Thích" đậm, xanh khi đã thích.
  if (variant === "text") {
    const cls = cn(
      "font-semibold transition-colors",
      liked ? "text-red-500" : "text-muted-foreground hover:text-foreground",
    );
    if (!isAuthed) {
      return (
        <Link href={`/login?callbackUrl=/cong-dong/${threadSlug}`} className={cls}>
          Thích
        </Link>
      );
    }
    return (
      <button type="button" onClick={onClick} disabled={pending} className={cls}>
        {liked ? "Đã thích" : "Thích"}
        {count > 0 ? ` · ${count}` : ""}
      </button>
    );
  }

  const base = cn(
    "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm",
  );
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  if (!isAuthed) {
    return (
      <Link
        href={`/login?callbackUrl=/cong-dong/${threadSlug}`}
        className={cn(
          base,
          "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
        )}
        title="Đăng nhập để thích"
      >
        <Heart className={iconSize} aria-hidden />
        <span className="tabular-nums">{count}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      className={cn(
        base,
        liked
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
        pending && "opacity-70",
      )}
    >
      <Heart className={cn(iconSize, liked && "fill-current")} aria-hidden />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
