import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Heart, MessagesSquare, Sparkles, Users } from "lucide-react";
import { initials, timeAgo } from "@/lib/format";

export type SidebarTrip = {
  slug: string;
  body: string;
  createdAt: Date;
  author: { name: string | null };
  place: { name: string } | null;
};

export type SidebarAbout = {
  name: string;
  cover: string;
  count: number;
};

// Sidebar cộng đồng: (tùy chọn) thẻ giới thiệu + "đang tìm bạn đồng hành" +
// nội quy ngắn + liên kết.
export function CommunitySidebar({
  about,
  trips,
  bottomLink,
}: {
  about?: SidebarAbout;
  trips: SidebarTrip[];
  bottomLink: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Giới thiệu cộng đồng (kèm ảnh điểm đến) */}
      {about && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-black/5">
          <div className="relative aspect-[16/9]">
            <Image
              src={about.cover}
              alt={about.name}
              fill
              sizes="18rem"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <p className="absolute bottom-2.5 left-3 right-3 text-sm font-semibold text-white">
              Cộng đồng {about.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground">
            <MessagesSquare className="size-3.5 text-primary" aria-hidden />
            {about.count} bài đăng
          </div>
        </div>
      )}

      {/* Đang tìm bạn đồng hành */}
      {trips.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Users className="size-4 text-primary" aria-hidden />
            Đang tìm bạn đồng hành
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {trips.map((t) => (
              <li key={t.slug}>
                <Link href={`/cong-dong/${t.slug}`} className="group flex gap-2.5">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary"
                  >
                    {initials(t.author.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm leading-snug text-foreground/90 transition-colors group-hover:text-primary">
                      {t.body}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.place ? `${t.place.name} · ` : ""}
                      {timeAgo(t.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nội quy ngắn */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Heart className="size-4 text-primary" aria-hidden />
          Cộng đồng văn minh
        </h2>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <li>• Chia sẻ trải nghiệm thật, hữu ích cho người sau.</li>
          <li>• Tôn trọng nhau, không công kích cá nhân.</li>
          <li>• Không spam, quảng cáo trá hình.</li>
        </ul>
      </div>

      {/* Liên kết */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-sky-50 p-4 dark:to-sky-950/20">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Khám phá thêm
        </p>
        <Link
          href={bottomLink.href}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {bottomLink.label}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
