"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Pin,
  Share2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { renderPostBody } from "@/lib/post-format";
import { toggleThreadLike } from "@/app/cong-dong/actions";
import { ThreadTypeBadge } from "./thread-type-badge";
import { PostMenu } from "./post-menu";
import { PhotoGrid, type PostImage } from "./photo-grid";
import { ReplySection, type ReplyNode } from "./reply-section";

export type PostData = {
  id: string;
  slug: string;
  body: string;
  type: string;
  departDate?: Date | null;
  slots?: number | null;
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
  repliesPreloaded = false,
  deleteRedirectTo,
}: {
  post: PostData;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  realtimeEnabled: boolean;
  showPlace?: boolean;
  defaultOpen?: boolean;
  repliesPreloaded?: boolean;
  deleteRedirectTo?: string; // điều hướng sau khi xóa (trang permalink)
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [, startLike] = useTransition();
  const [copied, setCopied] = useState(false);
  const isOwn = !!currentUserId && currentUserId === post.authorId;
  const mayDelete = isStaff || isOwn;
  const isCtv = post.author.saleProfile?.status === "approved";

  const trip =
    post.type === "trip" && (post.departDate || post.slots != null)
      ? {
          date: post.departDate
            ? new Date(post.departDate).toLocaleDateString("vi-VN", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : null,
          slots: post.slots ?? null,
        }
      : null;

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
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/[0.02] transition-shadow hover:shadow-lg hover:shadow-black/5 sm:p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initials(post.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {post.author.name ?? "Ẩn danh"}
            {isCtv && (
              <Link
                href={`/sale/${post.author.saleProfile!.slug}`}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                title="Cộng tác viên đã xác minh"
              >
                <BadgeCheck className="size-3" aria-hidden />
                CTV
              </Link>
            )}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <Link
              href={`/cong-dong/${post.slug}`}
              className="hover:text-foreground hover:underline"
            >
              {timeAgo(post.createdAt)}
            </Link>
            {showPlace && post.place && (
              <>
                <Dot />
                <Link
                  href={`/diem-den/${post.place.slug}`}
                  className="inline-flex items-center gap-0.5 hover:text-foreground"
                >
                  <MapPin className="size-3" aria-hidden />
                  {post.place.name}
                </Link>
              </>
            )}
            {post.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-primary">
                <Dot />
                <Pin className="size-3" aria-hidden />
                Ghim
              </span>
            )}
            {post.isLocked && (
              <span className="inline-flex items-center gap-0.5">
                <Dot />
                <Lock className="size-3" aria-hidden />
                Đã khóa
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThreadTypeBadge type={post.type} />
          {(mayDelete || (isAuthed && !isOwn)) && (
            <PostMenu
              threadId={post.id}
              canReport={isAuthed && !isOwn}
              canDelete={mayDelete}
              redirectTo={deleteRedirectTo}
            />
          )}
        </div>
      </div>

      {/* Chuyến ghép đoàn — dải nổi cho bài "tìm bạn đồng hành" */}
      {trip && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-primary/5 px-3.5 py-2.5 text-sm ring-1 ring-inset ring-primary/15">
          <span className="inline-flex items-center gap-1.5 font-medium text-primary">
            <Users className="size-4" aria-hidden />
            Đang ghép đoàn
          </span>
          {trip.date && (
            <span className="inline-flex items-center gap-1.5 text-foreground/80">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              {trip.date}
            </span>
          )}
          {trip.slots != null && (
            <span className="text-foreground/80">
              Còn <b className="text-primary">{trip.slots}</b> chỗ
            </span>
          )}
        </div>
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

      {/* Thanh tương tác — tràn sát mép trái/phải/đáy; hover phủ tới đáy card.
          Khi mở bình luận thì không tràn đáy để chừa chỗ cho phần trả lời. */}
      <div
        className={cn(
          "mt-2 flex items-center",
          open
            ? "-mx-4 border-t border-border/50 pt-0.5 sm:-mx-5"
            : "-mx-4 -mb-4 sm:-mx-5 sm:-mb-5",
        )}
      >
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
        <CountButton
          onClick={() => setOpen((v) => !v)}
          icon={MessageCircle}
          value={post.replyCount}
          label="Bình luận"
          active={open}
        />
        <CountButton
          onClick={onShare}
          icon={Share2}
          value={0}
          label={copied ? "Đã chép" : "Chia sẻ"}
        />
      </div>

      {/* Bình luận */}
      {open && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <ReplySection
            threadId={post.id}
            threadSlug={post.slug}
            locked={post.isLocked}
            replies={post.replies}
            preloaded={repliesPreloaded}
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

// Middot ngăn cách meta.
function Dot() {
  return <span aria-hidden>·</span>;
}

// Nút tương tác: icon + số (hoặc nhãn khi chưa có), hover nền xám.
function CountButton({
  icon: Icon,
  value,
  label,
  onClick,
  href,
  liked = false,
  active = false,
}: {
  icon: typeof Heart;
  value: number;
  label: string;
  onClick?: () => void;
  href?: string;
  liked?: boolean;
  active?: boolean;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-muted",
    liked ? "text-warm" : active ? "text-primary" : "text-muted-foreground",
  );
  const content = (
    <>
      <Icon className={cn("size-4", liked && "fill-current")} aria-hidden />
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
