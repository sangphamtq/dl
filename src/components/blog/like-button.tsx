"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLike } from "@/app/blog/actions";

export function LikeButton({
  postId,
  postSlug,
  initialLiked,
  initialCount,
  isAuthed,
}: {
  postId: string;
  postSlug: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthed: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const base =
    "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors";

  // Chưa đăng nhập → dẫn tới trang đăng nhập (vẫn hiện số lượt tim).
  if (!isAuthed) {
    return (
      <Link
        href={`/login?callbackUrl=/blog/${postSlug}`}
        className={cn(base, "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary")}
        title="Đăng nhập để tim bài viết"
      >
        <Heart className="size-4" aria-hidden />
        <span className="tabular-nums">{count}</span>
      </Link>
    );
  }

  const onClick = () => {
    // Optimistic.
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res = await toggleLike(postId, postSlug);
      if (res.ok) {
        setLiked(res.data.liked);
        setCount(res.data.count);
      } else {
        // Revert nếu lỗi.
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  };

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
      <Heart className={cn("size-4", liked && "fill-current")} aria-hidden />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
