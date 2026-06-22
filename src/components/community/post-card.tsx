"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, MapPin, MessageCircle, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { renderPostBody } from "@/lib/post-format";
import { ThreadTypeBadge } from "./thread-type-badge";
import { ThreadLikeButton } from "./thread-like-button";
import { ThreadDeleteButton } from "./thread-delete-button";
import { PhotoGrid, type PostImage } from "./photo-grid";
import { ReplySection, type ReplyNode } from "./reply-section";

export type PostData = {
  id: string;
  slug: string;
  body: string;
  type: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  author: { name: string | null };
  authorId: string;
  place: { slug: string; name: string } | null;
  images: PostImage[];
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
  replies: ReplyNode[];
};

export function PostCard({
  post,
  currentUserId,
  isStaff,
  isAuthed,
  realtimeEnabled,
  showPlace = true,
  defaultOpen = false,
}: {
  post: PostData;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  realtimeEnabled: boolean;
  showPlace?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const mayDelete =
    isStaff || (!!currentUserId && currentUserId === post.authorId);

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 transition-shadow hover:shadow-md sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initials(post.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {post.author.name ?? "Ẩn danh"}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href={`/cong-dong/${post.slug}`} className="hover:underline">
              {timeAgo(post.createdAt)}
            </Link>
            {post.isPinned && <Pin className="size-3 text-primary" aria-hidden />}
            {post.isLocked && <Lock className="size-3" aria-hidden />}
          </div>
        </div>
        <ThreadTypeBadge type={post.type} />
        {mayDelete && <ThreadDeleteButton threadId={post.id} />}
      </div>

      {/* Điểm đến */}
      {showPlace && post.place && (
        <Link
          href={`/diem-den/${post.place.slug}`}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <MapPin className="size-3.5" aria-hidden />
          {post.place.name}
        </Link>
      )}

      {/* Nội dung */}
      {post.body && (
        <div
          className="mt-2.5 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: renderPostBody(post.body) }}
        />
      )}

      {/* Ảnh */}
      <PhotoGrid images={post.images} />

      {/* Thanh hành động */}
      <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
        <ThreadLikeButton
          kind="thread"
          id={post.id}
          threadSlug={post.slug}
          initialLiked={post.likedByMe}
          initialCount={post.likeCount}
          isAuthed={isAuthed}
          size="sm"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary",
            open ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {post.replyCount > 0 ? `${post.replyCount} bình luận` : "Bình luận"}
        </button>
      </div>

      {/* Bình luận */}
      {open && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <ReplySection
            threadId={post.id}
            threadSlug={post.slug}
            locked={post.isLocked}
            replies={post.replies}
            total={post.replyCount}
            currentUserId={currentUserId}
            isStaff={isStaff}
            isAuthed={isAuthed}
            realtimeEnabled={realtimeEnabled}
          />
        </div>
      )}
    </article>
  );
}
