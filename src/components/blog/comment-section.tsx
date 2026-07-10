"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Reply, Trash2 } from "@/components/icons";
import { cn } from "@/lib/utils";
import { addComment, deleteComment } from "@/app/blog/actions";

type Author = { name: string | null };
export type CommentNode = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: Author;
  replies?: CommentNode[];
};

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
function timeAgo(date: Date): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  if (diff < 604800) return rtf.format(-Math.floor(diff / 86400), "day");
  return dateFmt.format(new Date(date));
}

function Avatar({ name, size = 9 }: { name: string | null; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary",
        size === 9 ? "size-9 text-xs" : "size-8 text-[0.65rem]",
      )}
    >
      {initials(name)}
    </span>
  );
}

function CommentForm({
  postId,
  postSlug,
  parentId,
  autoFocus,
  placeholder,
  onDone,
}: {
  postId: string;
  postSlug: string;
  parentId?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const content = value.trim();
    if (!content) return;
    setError(null);
    startTransition(async () => {
      const res = await addComment({ postId, postSlug, content, parentId });
      if (res.ok) {
        setValue("");
        onDone?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? "Viết bình luận…"}
        rows={parentId ? 2 : 3}
        className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value.trim()}
          className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Đang gửi…" : parentId ? "Trả lời" : "Gửi bình luận"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Hủy
          </button>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  postSlug,
  currentUserId,
  isStaff,
  isAuthed,
  isReply,
}: {
  comment: CommentNode;
  postId: string;
  postSlug: string;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const mayDelete = isStaff || (!!currentUserId && currentUserId === comment.authorId);

  const onDelete = () => {
    if (!confirm("Xóa bình luận này?")) return;
    startTransition(async () => {
      const res = await deleteComment(comment.id, postSlug);
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  };

  return (
    <div className="group/c flex gap-3">
      <Avatar name={comment.author.name} size={isReply ? 8 : 9} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.author.name ?? "Ẩn danh"}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {comment.content}
        </p>

        <div className="mt-1.5 flex items-center gap-4">
          {!isReply && isAuthed && (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Reply className="size-3.5" aria-hidden />
              Trả lời
            </button>
          )}
          {mayDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 transition-all hover:text-destructive focus-visible:opacity-100 disabled:opacity-50 group-hover/c:opacity-100 max-sm:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Xóa
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              postSlug={postSlug}
              parentId={comment.id}
              autoFocus
              placeholder={`Trả lời ${comment.author.name ?? ""}…`}
              onDone={() => setReplying(false)}
            />
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l border-border/50 pl-4">
            {comment.replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                postId={postId}
                postSlug={postSlug}
                currentUserId={currentUserId}
                isStaff={isStaff}
                isAuthed={isAuthed}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({
  postId,
  postSlug,
  comments,
  total,
  currentUserId,
  isStaff,
  isAuthed,
  realtimeEnabled,
}: {
  postId: string;
  postSlug: string;
  comments: CommentNode[];
  total: number;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  realtimeEnabled: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  // Làm mới ngay khi quay lại tab (bù cho lúc mất kết nối/ẩn tab).
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  // Realtime push qua Ably: nhận tín hiệu "comments:changed" → tự làm mới.
  // Nếu chưa cấu hình Ably → rơi về polling mỗi 20s.
  useEffect(() => {
    if (!realtimeEnabled) {
      const id = window.setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, 20000);
      return () => window.clearInterval(id);
    }

    let client: import("ably").Realtime | null = null;
    (async () => {
      try {
        const Ably = await import("ably");
        client = new Ably.Realtime({ authUrl: "/api/ably/token" });
        client.connection.on("connected", () => setLive(true));
        client.connection.on("disconnected", () => setLive(false));
        client.connection.on("suspended", () => setLive(false));
        client.connection.on("failed", (e) => {
          setLive(false);
          console.error("[Ably] kết nối thất bại:", e?.reason ?? e);
        });
        const channel = client.channels.get(`post:${postSlug}`);
        await channel.subscribe("comments:changed", () => router.refresh());
      } catch (e) {
        console.error("[Ably] lỗi khởi tạo realtime:", e);
      }
    })();
    return () => {
      setLive(false);
      client?.close();
    };
  }, [realtimeEnabled, postSlug, router]);

  return (
    <section id="thao-luan" className="mt-12 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <MessageCircle className="size-5 text-primary" aria-hidden />
        Thảo luận
        <span className="text-base font-normal text-muted-foreground">
          ({total})
        </span>
        {live && (
          <span className="ml-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Trực tiếp
          </span>
        )}
      </h2>

      <div className="mt-5">
        {isAuthed ? (
          <CommentForm postId={postId} postSlug={postSlug} />
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Link
              href={`/login?callbackUrl=/blog/${postSlug}`}
              className="font-medium text-primary hover:underline"
            >
              Đăng nhập
            </Link>{" "}
            để tham gia thảo luận.
          </div>
        )}
      </div>

      {comments.length > 0 ? (
        <div className="mt-8 space-y-7">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              postSlug={postSlug}
              currentUserId={currentUserId}
              isStaff={isStaff}
              isAuthed={isAuthed}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      )}
    </section>
  );
}
