import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  ChevronRight,
  Heart,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { initials, timeAgo } from "@/lib/format";

export type SidebarTrip = {
  slug: string;
  body: string;
  createdAt: Date;
  departDate?: Date | null;
  slots?: number | null;
  author: { name: string | null };
  place: { name: string } | null;
};

export type SidebarAbout = {
  name: string;
  cover: string;
  count: number;
};

const RULES = [
  { Icon: Sparkles, text: "Chia sẻ trải nghiệm thật, hữu ích cho người sau." },
  { Icon: Users, text: "Tôn trọng nhau, không công kích cá nhân." },
  { Icon: ShieldCheck, text: "Không spam hay quảng cáo trá hình." },
];

// Sidebar cộng đồng: (tùy chọn) thẻ giới thiệu điểm đến + "đang tìm bạn đồng
// hành" + nội quy ngắn + liên kết.
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
    <div className="flex flex-col gap-5">
      {/* Giới thiệu cộng đồng điểm đến (ảnh làm chủ) */}
      {about && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-black/[0.03]">
          <div className="relative aspect-[16/9]">
            <Image
              src={about.cover}
              alt={about.name}
              fill
              sizes="20rem"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute inset-x-3 bottom-2.5">
              <p className="text-sm font-semibold text-white">
                Cộng đồng {about.name}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-white/85">
                <MessagesSquare className="size-3.5" aria-hidden />
                {about.count.toLocaleString("vi-VN")} bài đăng
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Đang tìm bạn đồng hành */}
      {trips.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/[0.03]">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Users className="size-4 text-primary" aria-hidden />
            Đang tìm bạn đồng hành
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-border/50">
            {trips.map((t) => (
              <li key={t.slug} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={`/cong-dong/${t.slug}`} className="group flex gap-2.5">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary"
                  >
                    {initials(t.author.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug text-foreground/90 transition-colors group-hover:text-primary">
                      {t.body}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {t.place ? `${t.place.name} · ` : ""}
                        {timeAgo(t.createdAt)}
                      </span>
                      {t.departDate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                          <CalendarDays className="size-3" aria-hidden />
                          {new Date(t.departDate).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                          {t.slots != null ? ` · ${t.slots} chỗ` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nội quy ngắn */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/[0.03]">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Heart className="size-4 text-warm" aria-hidden />
          Cộng đồng văn minh
        </h2>
        <ul className="mt-3 space-y-2.5">
          {RULES.map(({ Icon, text }) => (
            <li key={text} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Liên kết */}
      <Link
        href={bottomLink.href}
        className="group flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-medium shadow-sm shadow-black/[0.03] transition-colors hover:border-primary/40 hover:text-primary"
      >
        {bottomLink.label}
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </Link>
    </div>
  );
}
