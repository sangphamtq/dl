import Link from "next/link";
import { Ic } from "@/components/icon";
import { timeAgo } from "@/lib/format";
import { THREAD_TYPE_LABELS } from "@/lib/community";
import type { CommunityDigest } from "@/lib/community-feed";

export function CommunityPreview({
  digest,
  href,
  placeName,
}: {
  digest: CommunityDigest;
  href: string;
  placeName: string;
}) {
  const { people, lastAt, threads } = digest;

  // Chỉ số "có người & còn sống". CỐ Ý không lặp lại số bài — tiêu đề section đã
  // in "N thảo luận" rồi; hai con số giống nhau đứng cách nhau 20px là thừa.
  // Còn lại là hai dữ kiện tiêu đề KHÔNG nói: bao nhiêu người, và lần cuối có ai
  // lên tiếng (một nơi 20 bài mà im từ năm ngoái thì khác hẳn 4 bài của tuần này).
  const stats = [
    people > 0 ? `${people} người tham gia` : null,
    lastAt ? `Gần nhất ${timeAgo(lastAt)}` : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {stats.map((s) => (
          <span
            key={s}
            className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>

      {threads.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {threads.map((t) => (
            <li key={t.slug}>
              <Link
                href={href}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:gap-4"
              >
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {THREAD_TYPE_LABELS[t.type] ?? t.type}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground/90 transition-colors group-hover:text-primary">
                  {t.body}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Ic icon="message-circle" className="size-3.5" aria-hidden />
                  {t.replyCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border/60 bg-card px-4 py-4 sm:px-5">
        <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
          Còn gì chưa rõ về {placeName}? Hỏi người vừa đi về.
        </p>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-warm px-5 py-2.5 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
        >
          <Ic icon="message-circle" className="size-4" aria-hidden />
          Vào cộng đồng
        </Link>
      </div>
    </>
  );
}
