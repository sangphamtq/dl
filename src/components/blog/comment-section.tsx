"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reply, Trash2 } from "@/components/icons";
import { cn } from "@/lib/utils";
import { addComment, deleteComment } from "@/app/(site)/blog/actions";

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

// Ô monogram vuông (phẳng, không bo tròn) — dấu ấn editorial thay avatar tròn.
function Monogram({ name, small }: { name: string | null; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[2px] bg-[#1f2226] font-semibold uppercase text-white dark:bg-white dark:text-[#1f2226]",
        small ? "size-7 text-[0.6rem]" : "size-9 text-xs",
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
    <div>
      <textarea
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? "Viết bình luận…"}
        rows={parentId ? 2 : 3}
        className="w-full resize-y border-b-2 border-[#dcd9d2] bg-transparent py-2 text-sm leading-relaxed text-[#1f2226] outline-none transition-colors placeholder:text-[#2e2e2e]/40 focus:border-[#348320] dark:border-white/15 dark:text-white dark:placeholder:text-white/40"
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value.trim()}
          className="bg-[#2e871c] px-5 py-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#256f16] disabled:opacity-40"
        >
          {pending ? "Đang gửi…" : parentId ? "Trả lời" : "Gửi bình luận"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-[0.8125rem] font-medium uppercase tracking-wide text-[#2e2e2e]/50 hover:text-[#1f2226] dark:text-white/50 dark:hover:text-white"
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

  const action =
    "text-[0.75rem] font-medium uppercase tracking-wide transition-colors";

  return (
    <div className="group/c flex gap-3.5">
      <Monogram name={comment.author.name} small={isReply} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold text-[#1f2226] dark:text-white">
            {comment.author.name ?? "Ẩn danh"}
          </span>
          <span className="text-xs text-[#2e2e2e]/45 dark:text-white/40">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1f2226]/90 dark:text-white/85">
          {comment.content}
        </p>

        <div className="mt-2 flex items-center gap-4">
          {!isReply && isAuthed && (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className={cn(action, "inline-flex items-center gap-1 text-[#2e2e2e]/55 hover:text-[#348320] dark:text-white/55")}
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
              className={cn(action, "inline-flex items-center gap-1 text-[#2e2e2e]/55 opacity-0 hover:text-destructive focus-visible:opacity-100 disabled:opacity-50 group-hover/c:opacity-100 max-sm:opacity-100 dark:text-white/55")}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Xóa
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-4">
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
          <div className="mt-5 space-y-5 border-l-2 border-[#dcd9d2] pl-5 dark:border-white/10">
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
    <section
      id="thao-luan"
      className="mt-12 scroll-mt-24 border-t border-[#e8e6e1] pt-8 dark:border-white/10"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#1f2226] dark:text-white">
          Thảo luận
        </h2>
        <span className="text-[0.8rem] font-semibold tabular-nums text-[#2e2e2e]/40 dark:text-white/40">
          {total}
        </span>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-[#348320]">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#348320] opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#348320]" />
            </span>
            Trực tiếp
          </span>
        )}
      </div>

      <div className="mt-6">
        {isAuthed ? (
          <CommentForm postId={postId} postSlug={postSlug} />
        ) : (
          <p className="text-sm text-[#2e2e2e]/70 dark:text-white/60">
            <Link
              href={`/login?callbackUrl=/blog/${postSlug}`}
              className="font-semibold text-[#348320] underline underline-offset-2 hover:text-[#256f16]"
            >
              Đăng nhập
            </Link>{" "}
            để tham gia thảo luận.
          </p>
        )}
      </div>

      {comments.length > 0 ? (
        <div className="mt-8 divide-y divide-[#e8e6e1] dark:divide-white/10">
          {comments.map((c) => (
            <div key={c.id} className="py-6 first:pt-0">
              <CommentItem
                comment={c}
                postId={postId}
                postSlug={postSlug}
                currentUserId={currentUserId}
                isStaff={isStaff}
                isAuthed={isAuthed}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-[#2e2e2e]/50 dark:text-white/40">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      )}
    </section>
  );
}
