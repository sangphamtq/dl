"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Send } from "@/components/icons";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { addReply, deleteReply, fetchReplies } from "@/app/cong-dong/actions";
import { ThreadLikeButton } from "./thread-like-button";
import { ReportButton } from "./report-button";

export type ReplyNode = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: { name: string | null };
  likeCount: number;
  likedByMe: boolean;
  replies?: ReplyNode[];
};

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

function ReplyForm({
  threadId,
  threadSlug,
  parentId,
  autoFocus,
  placeholder,
  onDone,
  onSubmitted,
}: {
  threadId: string;
  threadSlug: string;
  parentId?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onDone?: () => void;
  onSubmitted?: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Khoá đồng bộ chống gửi trùng (state `pending` không cập nhật kịp trong 1 handler).
  const submitting = useRef(false);

  const submit = () => {
    if (submitting.current) return;
    const content = value.trim();
    if (!content) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const res = await addReply({ threadId, threadSlug, content, parentId });
        if (res.ok) {
          setValue("");
          onDone?.();
          onSubmitted?.();
        } else {
          setError(res.error);
        }
      } finally {
        submitting.current = false;
      }
    });
  };

  return (
    <div>
      {/* Ô nhập bình luận dạng pill kiểu Facebook */}
      <div className="flex items-end gap-1.5 rounded-2xl bg-muted px-3 py-1">
        <textarea
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Bỏ qua Enter khi đang gõ IME (tiếng Việt) để không gửi non.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder ?? "Viết bình luận…"}
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value.trim()}
          aria-label="Gửi"
          className="mb-1 grid size-8 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-background disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
      {error && <p className="mt-1 px-1 text-xs text-destructive">{error}</p>}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="mt-1 px-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Hủy
        </button>
      )}
    </div>
  );
}

function ReplyItem({
  reply,
  threadId,
  threadSlug,
  currentUserId,
  isStaff,
  isAuthed,
  locked,
  isChild,
  onChanged,
}: {
  reply: ReplyNode;
  threadId: string;
  threadSlug: string;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  locked: boolean;
  isChild?: boolean;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const isOwn = !!currentUserId && currentUserId === reply.authorId;
  const mayDelete = isStaff || isOwn;

  const onDelete = () => {
    if (!confirm("Xóa trả lời này?")) return;
    startTransition(async () => {
      const res = await deleteReply(reply.id, threadSlug);
      if (res.ok) onChanged();
      else alert(res.error);
    });
  };

  return (
    <div className="group/r flex gap-2">
      <Avatar name={reply.author.name} size={isChild ? 8 : 9} />
      <div className="min-w-0 flex-1">
        {/* Bong bóng bình luận kiểu Facebook */}
        <div className="inline-block max-w-full rounded-2xl bg-muted px-3 py-2">
          <span className="block text-[13px] font-semibold leading-tight">
            {reply.author.name ?? "Ẩn danh"}
          </span>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-snug text-foreground/90">
            {reply.content}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-3 pl-3 text-xs">
          <span className="text-muted-foreground">
            {timeAgo(reply.createdAt)}
          </span>
          <ThreadLikeButton
            kind="reply"
            id={reply.id}
            threadSlug={threadSlug}
            initialLiked={reply.likedByMe}
            initialCount={reply.likeCount}
            isAuthed={isAuthed}
            variant="text"
          />
          {!isChild && isAuthed && !locked && (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Trả lời
            </button>
          )}
          {isAuthed && !isOwn && (
            <ReportButton replyId={reply.id} />
          )}
          {mayDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="font-semibold text-muted-foreground opacity-0 transition-all hover:text-destructive focus-visible:opacity-100 disabled:opacity-50 group-hover/r:opacity-100 max-sm:opacity-100"
            >
              Xóa
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-2">
            <ReplyForm
              threadId={threadId}
              threadSlug={threadSlug}
              parentId={reply.id}
              autoFocus
              placeholder={`Trả lời ${reply.author.name ?? ""}…`}
              onDone={() => setReplying(false)}
              onSubmitted={onChanged}
            />
          </div>
        )}

        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-2.5 space-y-3 border-l border-border/50 pl-3.5">
            {reply.replies.map((r) => (
              <ReplyItem
                key={r.id}
                reply={r}
                threadId={threadId}
                threadSlug={threadSlug}
                currentUserId={currentUserId}
                isStaff={isStaff}
                isAuthed={isAuthed}
                locked={locked}
                onChanged={onChanged}
                isChild
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReplySection({
  threadId,
  threadSlug,
  locked,
  replies: initialReplies,
  preloaded = false,
  currentUserId,
  isStaff,
  isAuthed,
  realtimeEnabled,
}: {
  threadId: string;
  threadSlug: string;
  locked: boolean;
  replies: ReplyNode[];
  preloaded?: boolean; // true = replies đã SSR sẵn (permalink); false = feed, tự tải
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  realtimeEnabled: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [replies, setReplies] = useState<ReplyNode[]>(initialReplies);
  const [loaded, setLoaded] = useState(preloaded);

  // Tải (hoặc làm mới) cây trả lời từ server.
  const reload = useCallback(async () => {
    const data = await fetchReplies(threadId);
    setReplies(data);
    setLoaded(true);
  }, [threadId]);

  // Lần đầu mở (feed chưa preload) → tải cây trả lời. setState diễn ra sau await
  // (bất đồng bộ), không gây cascading render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!preloaded) void reload();
  }, [preloaded, reload]);

  // Sau khi thêm/xóa trả lời: cập nhật cây tại chỗ + làm mới trang (đếm ở thẻ bài).
  const onChanged = useCallback(() => {
    void reload();
    router.refresh();
  }, [reload, router]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void reload();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  useEffect(() => {
    if (!realtimeEnabled) {
      const id = window.setInterval(() => {
        if (document.visibilityState === "visible") void reload();
      }, 20000);
      return () => window.clearInterval(id);
    }
    let client: import("ably").Realtime | null = null;
    let cancelled = false;
    (async () => {
      try {
        const Ably = await import("ably");
        if (cancelled) return; // đã unmount trong lúc import
        client = new Ably.Realtime({ authUrl: "/api/ably/token" });
        client.connection.on("connected", () => setLive(true));
        client.connection.on("disconnected", () => setLive(false));
        client.connection.on("suspended", () => setLive(false));
        // subscribe() trả về Promise (attach) — nuốt lỗi khi đóng lúc đang kết nối.
        void client.channels
          .get(`thread:${threadSlug}`)
          .subscribe("replies:changed", () => void reload())
          .catch(() => {});
      } catch (e) {
        console.error("[Ably] lỗi khởi tạo realtime:", e);
      }
    })();
    return () => {
      cancelled = true;
      setLive(false);
      try {
        client?.close();
      } catch {
        /* bỏ qua */
      }
      client = null;
    };
  }, [realtimeEnabled, threadSlug, reload]);

  return (
    <section id="tra-loi" className="scroll-mt-24">
      {/* Ô nhập */}
      {locked ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden />
          Chủ đề đã khóa, không thể trả lời.
        </div>
      ) : isAuthed ? (
        <ReplyForm
          threadId={threadId}
          threadSlug={threadSlug}
          onSubmitted={onChanged}
        />
      ) : (
        <div className="rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground">
          <Link
            href={`/login?callbackUrl=/cong-dong/${threadSlug}`}
            className="font-medium text-primary hover:underline"
          >
            Đăng nhập
          </Link>{" "}
          để tham gia trả lời.
        </div>
      )}

      {live && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-500">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Trực tiếp
        </p>
      )}

      {replies.length > 0 ? (
        <div className="mt-3 space-y-3">
          {replies.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              threadId={threadId}
              threadSlug={threadSlug}
              currentUserId={currentUserId}
              isStaff={isStaff}
              isAuthed={isAuthed}
              locked={locked}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : loaded ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Chưa có bình luận. Hãy là người đầu tiên!
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Đang tải…</p>
      )}
    </section>
  );
}
