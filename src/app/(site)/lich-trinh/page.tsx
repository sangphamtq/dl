import Link from "next/link";
import Image from "next/image";
import { Route } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TripControls } from "@/components/trip/trip-controls";
import { TRIP_SORTS, type TripSortKey } from "@/lib/trip-template-sort";
import { cn } from "@/lib/utils";
import { R_CARD } from "@/lib/radius";
import { Curtain, Rise, RiseInView } from "@/components/site/reveal";
import { HeroLink } from "@/components/site/hero-link";
import { getPlanningTripId } from "@/app/(site)/lich-trinh/actions";
import { MyTrips, MyTripsGuest, SECTION_TITLE } from "@/components/trip/my-trips";

// MỘT trang cho cả "chuyến của tôi" (đã đăng nhập) lẫn lịch trình mẫu (công khai, gánh SEO) — `/lich-trinh/cua-toi`
// chuyển hướng vĩnh viễn về đây (next.config.ts).
export const metadata = {
  title: "Lịch trình",
  description:
    "Lịch trình gợi ý theo từng điểm đến và chuyến của riêng bạn — xem chi tiết từng ngày, giờ ước tính, rồi sao về tài khoản và sửa theo ý bạn.",
};


const coverSel = {
  where: { isCover: true },
  take: 1,
  select: { url: true, alt: true },
} as const;

const pub = { status: "published" as const };

function lengthLabel(days: number): string {
  return days > 1 ? `${days} ngày ${days - 1} đêm` : "1 ngày";
}

export default async function TripTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ ngay?: string; "sap-xep"?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const isAuthed = !!session?.user;

  const [rows, planningId] = await Promise.all([
    prisma.trip.findMany({
      where: {
        isTemplate: true,
        ...pub,
        slug: { not: null },
        // Phải có ÍT NHẤT MỘT ngày đã xếp được mục vào. Mẫu vừa tạo trong CMS
        // (một ngày trống) mà lọt ra đây thì trang đang mời khách xem một lịch
        // trình không có gì. KHÔNG dùng `items: { some: {} }`: `items` tính cả
        // mục còn trong túi "Chưa xếp ngày", tức mẫu toàn mục chưa xếp vẫn lọt.
        days: { some: { items: { some: {} } } },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        place: { select: { name: true, parent: { select: { name: true } } } },
        images: coverSel,
        days: {
          orderBy: { index: "asc" },
          select: {
            id: true,
            title: true,
            _count: { select: { items: true } },
            items: {
              orderBy: { order: "asc" },
              select: {
                spot: { select: { images: coverSel } },
                activity: { select: { images: coverSel } },
                eatery: { select: { images: coverSel } },
                accommodation: { select: { images: coverSel } },
              },
            },
          },
        },
      },
    }),
    getPlanningTripId(),
  ]);

  const lengths = [...new Set(rows.map((t) => t.days.length))].sort(
    (a, b) => a - b,
  );
  const days = sp.ngay && /^\d+$/.test(sp.ngay) ? Number(sp.ngay) : null;
  const sort: TripSortKey =
    (TRIP_SORTS.find((x) => x.key === sp["sap-xep"])?.key as TripSortKey) ??
    "noi-bat";

  const stopsOf = (t: (typeof rows)[number]) =>
    t.days.reduce((n, d) => n + d._count.items, 0);
  const visible = rows
    .filter((t) => days === null || t.days.length === days)
    .sort((a, b) => {
      if (sort === "ngan-nhat") return a.days.length - b.days.length;
      if (sort === "dai-nhat") return b.days.length - a.days.length;
      if (sort === "nhieu-diem") return stopsOf(b) - stopsOf(a);
      return 0;
    });

  const covers = rows.map((t) => coverOf(t));
  // Ảnh dải mở đầu KHÔNG được trùng ảnh của bất kỳ mẫu nào bên dưới: cùng một
  // tấm hiện hai lần trong một màn hình thì dải mở đầu đọc ra như một cái thẻ bị
  // phóng to. Vì mẫu chỉ dùng ảnh bìa (hoặc ảnh điểm dừng đầu tiên), mọi ảnh
  // điểm dừng KHÁC đều an toàn — và vẫn là ảnh của đúng chuyến đó.
  const used = new Set(covers.filter(Boolean) as string[]);
  const heroUrl =
    rows
      .flatMap((t) => t.days)
      .flatMap((d) => d.items)
      .flatMap((it) => [
        it.spot?.images[0]?.url,
        it.activity?.images[0]?.url,
        it.eatery?.images[0]?.url,
        it.accommodation?.images[0]?.url,
      ])
      .find((u) => u && !used.has(u)) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 overflow-x-clip">
        <section className="relative isolate overflow-hidden bg-[#0b1a12]">
          {heroUrl && (
            <Image
              src={heroUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_55%]"
            />
          )}
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_84%_92%_at_50%_50%,rgba(8,22,15,0.62)_0%,rgba(8,22,15,0.5)_46%,rgba(8,22,15,0.32)_76%,rgba(8,22,15,0.18)_100%)]"
          />

          <div className="relative mx-auto flex min-h-[clamp(15rem,22vw,18.5rem)] max-w-7xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:min-h-[clamp(19rem,26vw,22.5rem)] lg:pb-12 lg:pt-[7rem]">
            <Curtain>
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,7.5vw,5.5rem)] font-normal uppercase leading-[1.15] tracking-[0.12em] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.62)] sm:tracking-[0.18em]">
                Lịch trình
              </h1>
            </Curtain>
            <Rise delay={0.18} className="mt-5 sm:mt-6">
              <p className="max-w-[40rem] text-[clamp(1.0625rem,2vw,1.5rem)] font-normal leading-snug text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.72)]">
                Xếp sẵn từng ngày, có giờ ước tính từng chặng.
              </p>
            </Rise>
            <Rise delay={0.32} className="mt-8 sm:mt-10">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <HeroLink href="/diem-den" label="Chọn điểm đến" />
                <HeroLink href="/ban-do" label="Đo chuyến trên bản đồ" />
              </div>
            </Rise>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
          {/* Việc của BẠN đứng trước mẫu: người có chuyến dở cần đường quay lại trước một mẫu mới. */}
          <div className="mb-14 sm:mb-20">
            {isAuthed && session?.user?.id ? (
              <MyTrips userId={session.user.id} planningId={planningId} />
            ) : (
              <MyTripsGuest />
            )}
          </div>

          {rows.length > 0 ? (
            <section>
              <SectionHead
                title="Lịch trình mẫu"
                meta="Do biên tập soạn — mở một mẫu rồi nhân bản thành chuyến của bạn."
              />

              <TripControls lengths={lengths} days={days} sort={sort} />

              {visible.length === 0 ? (
                <p className="mt-10 text-sm text-muted-foreground">
                  Không có mẫu nào dài {days} ngày.{" "}
                  <Link href="/lich-trinh" className="underline underline-offset-4">
                    Xoá bộ lọc
                  </Link>
                </p>
              ) : (
              // LƯỚI 2 cột: ảnh trên, chữ dưới. Từng ngày chỉ hiện tối đa 3 dòng — trang chi tiết mẫu mới là chỗ đọc đủ.
              <ul className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
                {visible.map((t) => {
                  const days = t.days;
                  // Ảnh THẬT hoặc không ảnh — ⚠️ KHÔNG `coverUrl()`: mẫu Tà Xùa (lên núi săn mây) từng nhận ảnh bờ biển bão.
                  const cover = coverOf(t);
                  const stops = days.reduce((n, d) => n + d._count.items, 0);
                  const where = t.place?.parent?.name ?? t.place?.name ?? null;
                  const more = days.length - 3;
                  return (
                    <li key={t.id}>
                      <RiseInView distance={14}>
                        <Link href={`/lich-trinh/${t.slug}`} className="group block focus-visible:outline-none">
                          <span
                            className={cn(
                              R_CARD,
                              "relative block aspect-[16/9] overflow-hidden bg-muted group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
                            )}
                          >
                            {cover ? (
                              <Image
                                src={cover}
                                alt=""
                                fill
                                sizes="(min-width: 640px) 40rem, 92vw"
                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                              />
                            ) : (
                              // Chưa có ảnh thật: ô nền trơn ghi NƠI — muốn có ảnh thì gắn ảnh bìa cho mẫu trong CMS.
                              <span className="absolute inset-0 grid place-items-center px-6 text-center">
                                <span className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-tight text-foreground/35">
                                  {t.place?.name ?? lengthLabel(days.length)}
                                </span>
                              </span>
                            )}
                          </span>

                          <span className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">
                            {where && <span>{where}</span>}
                            <span className="text-foreground">{lengthLabel(days.length)}</span>
                            <span>
                              <strong className="font-semibold tabular-nums text-foreground">{stops}</strong> điểm dừng
                            </span>
                          </span>

                          <span className="mt-1 block font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.4vw,1.75rem)] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary-ink">
                            {t.title}
                          </span>

                          {t.summary && (
                            <span className="mt-1.5 line-clamp-2 block text-[0.9375rem] leading-relaxed text-muted-foreground">
                              {t.summary}
                            </span>
                          )}

                          <span className="mt-4 block border-t border-border/70 pt-3">
                            {days.slice(0, 3).map((d, i) => (
                              <span key={d.id} className="flex items-baseline gap-3 py-1 text-[0.9375rem]">
                                <span className="w-14 shrink-0 text-sm text-muted-foreground">Ngày {i + 1}</span>
                                <span className="min-w-0 flex-1 truncate">{d.title ?? ""}</span>
                                <span className="shrink-0 text-sm text-muted-foreground">
                                  <strong className="font-semibold tabular-nums text-foreground">{d._count.items}</strong>{" "}
                                  điểm
                                </span>
                              </span>
                            ))}
                            {more > 0 && (
                              <span className="block pl-[4.25rem] pt-1 text-sm text-muted-foreground">+{more} ngày nữa</span>
                            )}
                          </span>
                        </Link>
                      </RiseInView>
                    </li>
                  );
                })}
              </ul>
              )}
            </section>
          ) : (
            <section className={cn(R_CARD, "border border-dashed border-border px-6 py-14 text-center")}>
              <Route className="mx-auto size-9 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 font-[family-name:var(--font-display)] text-lg tracking-tight">
                Chưa có lịch trình mẫu nào
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Bạn vẫn tự xếp được — mở một điểm đến rồi bấm “Thêm vào lịch
                trình” ở bất kỳ địa điểm, quán ăn hay chỗ ở nào.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function SectionHead({
  title,
  meta,
}: {
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <RiseInView distance={14}>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h2 className={SECTION_TITLE}>{title}</h2>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
      </div>
    </RiseInView>
  );
}


function coverOf(t: {
  slug: string | null;
  images: { url: string }[];
  days: {
    items: {
      spot: { images: { url: string }[] } | null;
      activity: { images: { url: string }[] } | null;
      eatery: { images: { url: string }[] } | null;
      accommodation: { images: { url: string }[] } | null;
    }[];
  }[];
}): string | null {
  const own = t.images[0]?.url;
  if (own) return own;
  const fromStop = t.days
    .flatMap((d) => d.items)
    .flatMap((it) => [
      it.spot?.images[0]?.url,
      it.activity?.images[0]?.url,
      it.eatery?.images[0]?.url,
      it.accommodation?.images[0]?.url,
    ])
    .find(Boolean);
  return fromStop ?? null;
}

