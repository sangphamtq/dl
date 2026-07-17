import Link from "next/link";
import { Ic } from "@/components/icon";
import { THREAD_TYPE_LABELS } from "@/lib/community";
import type { PostData } from "@/components/community/post-card";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
});

// Xem trước vài thảo luận cộng đồng của điểm đến (read-only) → link tới permalink.
export function CommunityPreview({ posts }: { posts: PostData[] }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/cong-dong/${p.slug}`}
          className="group flex flex-col rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {THREAD_TYPE_LABELS[p.type] ?? p.type}
            </span>
            <span className="truncate">{p.author.name ?? "Ẩn danh"}</span>
            <span aria-hidden>·</span>
            <span>{dateFmt.format(p.createdAt)}</span>
          </div>
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-foreground/90">
            {p.body}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Ic icon="message-circle" className="size-3.5" aria-hidden />
              {p.replyCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Ic icon="heart" className="size-3.5" aria-hidden />
              {p.likeCount}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
