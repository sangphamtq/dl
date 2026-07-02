"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Pin,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { renderPostBody } from "@/lib/post-format";
import { toggleThreadLike } from "@/app/cong-dong/actions";
import { ThreadTypeBadge } from "./thread-type-badge";
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
  author: {
    name: string | null;
    saleProfile?: { status: string; slug: string } | null;
  };
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
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [, startLike] = useTransition();
  const [copied, setCopied] = useState(false);
  const mayDelete =
    isStaff || (!!currentUserId && currentUserId === post.authorId);

  const onLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    startLike(async () => {
      const res = await toggleThreadLike(post.id, post.slug);
      if (res.ok) {
        setLiked(res.data.liked);
        setLikeCount(res.data.count);
      } else {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    });
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/cong-dong/${post.slug}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initials(post.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {post.author.name ?? "Ẩn danh"}
            {post.author.saleProfile?.status === "approved" && (
              <Link
                href={`/sale/${post.author.saleProfile.slug}`}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                title="Cộng tác viên đã xác minh"
              >
                <BadgeCheck className="size-3" aria-hidden />
                CTV
              </Link>
            )}
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

      {/* Ảnh — tràn viền card kiểu Facebook */}
      {post.images.length > 0 && (
        <div className="-mx-4 mt-3 sm:-mx-5">
          <PhotoGrid images={post.images} bleed />
        </div>
      )}

      {/* Thanh tương tác kiểu Facebook: 👍 số · 💬 số · ↗ + cụm cảm xúc */}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-1">
        <div className="flex items-center">
          {isAuthed ? (
            <CountButton
              onClick={onLike}
              liked={liked}
              icon={Heart}
              value={likeCount}
              label="Thích"
            />
          ) : (
            <CountButton
              href={`/login?callbackUrl=/cong-dong/${post.slug}`}
              icon={Heart}
              value={likeCount}
              label="Thích"
            />
          )}
          <Sep />
          <CountButton
            onClick={() => setOpen((v) => !v)}
            icon={MessageCircle}
            value={post.replyCount}
            label="Bình luận"
          />
          <Sep />
          <CountButton
            onClick={onShare}
            icon={Share2}
            value={0}
            label={copied ? "Đã chép" : "Chia sẻ"}
          />
        </div>
        {likeCount > 0 && (
          <span className="mr-1 grid size-[18px] shrink-0 place-items-center rounded-full bg-red-500">
            <Heart className="size-2.5 fill-white text-white" aria-hidden />
          </span>
        )}
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

// Nút tương tác kiểu Facebook: icon + số (hoặc nhãn khi chưa có), hover nền xám.
function CountButton({
  icon: Icon,
  value,
  label,
  onClick,
  href,
  liked = false,
}: {
  icon: typeof Heart;
  value: number;
  label: string;
  onClick?: () => void;
  href?: string;
  liked?: boolean;
}) {
  const cls = cn(
    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-muted",
    liked ? "text-red-500" : "text-muted-foreground",
  );
  const content = (
    <>
      <Icon className={cn("size-[18px]", liked && "fill-current")} aria-hidden />
      {value > 0 ? value.toLocaleString("vi-VN") : label}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

// Vạch ngăn dọc giữa các nút (kiểu Facebook).
function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}
