"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, Reply, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { addReply, deleteReply } from "@/app/cong-dong/actions";
import { ThreadLikeButton } from "./thread-like-button";

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
}: {
  threadId: string;
  threadSlug: string;
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
      const res = await addReply({ threadId, threadSlug, content, parentId });
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
        placeholder={placeholder ?? "Viết trả lời…"}
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
          {pending ? "Đang gửi…" : parentId ? "Trả lời" : "Gửi"}
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

function ReplyItem({
  reply,
  threadId,
  threadSlug,
  currentUserId,
  isStaff,
  isAuthed,
  locked,
  isChild,
}: {
  reply: ReplyNode;
  threadId: string;
  threadSlug: string;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  locked: boolean;
  isChild?: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const mayDelete =
    isStaff || (!!currentUserId && currentUserId === reply.authorId);

  const onDelete = () => {
    if (!confirm("Xóa trả lời này?")) return;
    startTransition(async () => {
      const res = await deleteReply(reply.id, threadSlug);
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  };

  return (
    <div className="group/r flex gap-3">
      <Avatar name={reply.author.name} size={isChild ? 8 : 9} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {reply.author.name ?? "Ẩn danh"}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(reply.createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {reply.content}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <ThreadLikeButton
            kind="reply"
            id={reply.id}
            threadSlug={threadSlug}
            initialLiked={reply.likedByMe}
            initialCount={reply.likeCount}
            isAuthed={isAuthed}
            size="sm"
          />
          {!isChild && isAuthed && !locked && (
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
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 transition-all hover:text-destructive focus-visible:opacity-100 disabled:opacity-50 group-hover/r:opacity-100 max-sm:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Xóa
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-3">
            <ReplyForm
              threadId={threadId}
              threadSlug={threadSlug}
              parentId={reply.id}
              autoFocus
              placeholder={`Trả lời ${reply.author.name ?? ""}…`}
              onDone={() => setReplying(false)}
            />
          </div>
        )}

        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l border-border/50 pl-4">
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
  replies,
  total,
  currentUserId,
  isStaff,
  isAuthed,
  realtimeEnabled,
}: {
  threadId: string;
  threadSlug: string;
  locked: boolean;
  replies: ReplyNode[];
  total: number;
  currentUserId: string | null;
  isStaff: boolean;
  isAuthed: boolean;
  realtimeEnabled: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

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
        client.channels
          .get(`thread:${threadSlug}`)
          .subscribe("replies:changed", () => router.refresh());
      } catch (e) {
        console.error("[Ably] lỗi khởi tạo realtime:", e);
      }
    })();
    return () => {
      setLive(false);
      client?.close();
    };
  }, [realtimeEnabled, threadSlug, router]);

  return (
    <section id="tra-loi" className="mt-10 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <MessageCircle className="size-5 text-primary" aria-hidden />
        Trả lời
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
        {locked ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4" aria-hidden />
            Chủ đề đã bị khóa, không thể trả lời.
          </div>
        ) : isAuthed ? (
          <ReplyForm threadId={threadId} threadSlug={threadSlug} />
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Link
              href={`/login?callbackUrl=/cong-dong/${threadSlug}`}
              className="font-medium text-primary hover:underline"
            >
              Đăng nhập
            </Link>{" "}
            để tham gia trả lời.
          </div>
        )}
      </div>

      {replies.length > 0 ? (
        <div className="mt-8 space-y-7">
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
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Chưa có trả lời nào. Hãy là người đầu tiên!
        </p>
      )}
    </section>
  );
}
