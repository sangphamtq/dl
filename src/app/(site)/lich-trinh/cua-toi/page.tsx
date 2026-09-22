import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import { coverUrl } from "@/lib/place-image";
import { getPlanningTripId } from "../actions";
import { NewTripButton, TripCardMenu } from "@/components/trip/trip-list-actions";
import { RiseInView } from "@/components/site/reveal";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Số ngày liệt kê trên thẻ dẫn đầu; phần dư gộp thành một dòng "+N ngày nữa".
const LEAD_DAYS = 5;

const coverSel = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;
const stopSel = { select: { name: true, slug: true, images: coverSel } } as const;

export const metadata = {
  title: "Lịch trình của tôi",
  robots: { index: false, follow: false },
  description:
    "Gom điểm muốn đến, xếp theo ngày và xem ngay giờ ước tính — biết trước quán nào chưa mở lúc bạn tới.",
};

type Img = { url: string; isCover: boolean };
type Stop = { name: string; photo: string };

export default async function LichTrinhPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/lich-trinh/cua-toi");
  const userId = session.user.id;

  const [trips, templates, planningId] = await Promise.all([
    prisma.trip.findMany({
      where: {
        isTemplate: false,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        updatedAt: true,
        ownerId: true,
        owner: { select: { name: true } },
        _count: { select: { items: true, days: true } },
        place: { select: { name: true, slug: true, images: coverSel } },
        days: {
          orderBy: { index: "asc" },
          select: { id: true, title: true, _count: { select: { items: true } } },
        },
        items: {
          take: 3,
          orderBy: [{ day: { index: "asc" } }, { order: "asc" }],
          select: {
            customTitle: true,
            spot: stopSel,
            eatery: stopSel,
            activity: stopSel,
            accommodation: stopSel,
          },
        },
      },
    }),
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published" },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        images: coverSel,
        place: { select: { name: true } },
        _count: { select: { days: true } },
      },
    }),
    getPlanningTripId(),
  ]);

  // Chuyến đang lên lịch luôn là thẻ dẫn đầu: đó là chuyến người dùng quay lại
  // nhiều nhất, và thẻ dẫn đầu là chỗ duy nhất liệt kê từng ngày.
  const ordered = [...trips].sort(
    (a, b) => Number(b.id === planningId) - Number(a.id === planningId),
  );
  const totalDays = trips.reduce((n, t) => n + t._count.days, 0);
  const totalItems = trips.reduce((n, t) => n + t._count.items, 0);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <p className={cn(MICRO, "text-warm-ink")}>Chuyến đi của bạn</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4.4vw,3rem)] font-normal uppercase leading-[1.15] tracking-[0.1em] sm:tracking-[0.14em]">
                Lịch trình
              </h1>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                Gom nơi muốn đến, xếp vào từng ngày — chúng tôi tính giúp giờ ước
                tính và báo trước chỗ nào chưa mở lúc bạn tới.
              </p>
            </div>
            {/* Khi chưa có chuyến nào, ô rỗng bên dưới giữ nút tạo — hai nút cam
                cùng màn hình thì không nút nào là lối đi rõ ràng nữa. */}
            {trips.length > 0 && (
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <NewTripButton />
                <p className={cn(MICRO, "flex gap-x-5 text-muted-foreground")}>
                  <span>
                    <span className="tabular-nums text-foreground">
                      {trips.length}
                    </span>{" "}
                    chuyến
                  </span>
                  <span>
                    <span className="tabular-nums text-foreground">
                      {totalDays}
                    </span>{" "}
                    ngày
                  </span>
                  <span>
                    <span className="tabular-nums text-foreground">
                      {totalItems}
                    </span>{" "}
                    mục
                  </span>
                </p>
              </div>
            )}
          </div>

          {ordered.length > 0 ? (
            <ul className="mt-10 divide-y divide-border border-y border-border">
              {ordered.map((trip, i) => (
                <TripRow
                  key={trip.id}
                  trip={trip}
                  lead={i === 0}
                  isPlanning={trip.id === planningId}
                  isGuest={trip.ownerId !== userId}
                />
              ))}
            </ul>
          ) : (
            <div
              className={cn(
                R_CARD,
                "mt-10 border border-dashed border-border px-6 py-14 text-center",
              )}
            >
              <p className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                Bạn chưa có lịch trình nào
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Tạo một chuyến rồi bấm{" "}
                <strong className="font-medium text-foreground">
                  Thêm vào lịch trình
                </strong>{" "}
                ở bất kỳ địa điểm, quán ăn hay chỗ ở nào bạn thích.
              </p>
              <div className="mt-5">
                <NewTripButton />
              </div>
            </div>
          )}

          {templates.length > 0 && (
            <section className="mt-16">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.125rem,2.2vw,1.5rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                  Lịch trình gợi ý
                </h2>
                <Link
                  href="/lich-trinh"
                  className={cn(
                    MICRO,
                    "text-muted-foreground transition-colors hover:text-foreground",
                  )}
                >
                  Xem tất cả →
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Do biên tập soạn — bấm để nhân bản thành chuyến của riêng bạn rồi
                sửa thoải mái.
              </p>

              <ul className="mt-4 divide-y divide-border">
                {templates.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/lich-trinh/${t.slug}`}
                      className="group flex items-center gap-4 py-3.5 sm:gap-5"
                    >
                      <span
                        className={cn(
                          R_CTRL,
                          "relative h-12 w-16 shrink-0 overflow-hidden bg-muted sm:h-14 sm:w-[4.75rem]",
                        )}
                      >
                        <Image
                          src={coverUrl(t.images, t.slug ?? t.id, 240, 180)}
                          alt=""
                          fill
                          sizes="76px"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] tracking-tight underline-offset-4 group-hover:underline">
                        {t.title}
                      </span>
                      <span
                        className={cn(
                          MICRO,
                          "flex shrink-0 gap-x-5 text-muted-foreground",
                        )}
                      >
                        {t.place && (
                          <span className="hidden sm:inline">{t.place.name}</span>
                        )}
                        <span>
                          <span className="tabular-nums text-foreground">
                            {t._count.days}
                          </span>{" "}
                          ngày
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

type TripRowData = {
  id: string;
  title: string;
  startDate: Date | null;
  updatedAt: Date;
  owner: { name: string | null } | null;
  _count: { items: number; days: number };
  place: { name: string; slug: string; images: Img[] } | null;
  days: { id: string; title: string | null; _count: { items: number } }[];
  items: {
    customTitle: string | null;
    spot: { name: string; slug: string; images: Img[] } | null;
    eatery: { name: string; slug: string; images: Img[] } | null;
    activity: { name: string; slug: string; images: Img[] } | null;
    accommodation: { name: string; slug: string; images: Img[] } | null;
  }[];
};

function TripRow({
  trip,
  lead,
  isPlanning,
  isGuest,
}: {
  trip: TripRowData;
  lead: boolean;
  isPlanning: boolean;
  isGuest: boolean;
}) {
  const stops: Stop[] = trip.items.flatMap((it) => {
    const t = it.spot ?? it.eatery ?? it.activity ?? it.accommodation;
    if (t) return [{ name: t.name, photo: coverUrl(t.images, t.slug, 720, 540) }];
    return it.customTitle ? [{ name: it.customTitle, photo: "" }] : [];
  });
  const cover =
    stops.find((s) => s.photo)?.photo ??
    (trip.place ? coverUrl(trip.place.images, trip.place.slug, 720, 540) : null);

  const owner = isGuest ? (trip.owner?.name?.split(" ").slice(-1)[0] ?? null) : null;
  const restDays = trip.days.length - LEAD_DAYS;

  return (
    <li className="relative">
      <RiseInView distance={14}>
        <div
          className={cn(
            "group grid gap-4",
            lead
              ? "py-6 sm:grid-cols-[minmax(0,23rem)_1fr] sm:gap-8 sm:py-8"
              : "py-5 sm:grid-cols-[minmax(0,13.5rem)_1fr] sm:gap-7 sm:py-6",
          )}
        >
          <span
            className={cn(
              R_CARD,
              "relative block overflow-hidden bg-muted",
              lead
                ? "aspect-[4/3] sm:h-full sm:min-h-[14rem]"
                : "aspect-[16/10] sm:h-full sm:min-h-[8.5rem]",
            )}
          >
            {cover ? (
              <Image
                src={cover}
                alt=""
                fill
                sizes={lead ? "(min-width: 640px) 23rem, 92vw" : "(min-width: 640px) 13.5rem, 92vw"}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center">
                <span className="text-center">
                  <span className="block font-[family-name:var(--font-display)] text-3xl leading-none">
                    {trip._count.days}
                  </span>
                  <span className={cn(MICRO, "mt-1.5 block text-muted-foreground")}>
                    ngày
                  </span>
                </span>
              </span>
            )}

            {isPlanning && (
              <span
                className={cn(
                  MICRO,
                  R_BADGE,
                  "absolute left-2.5 top-2.5 bg-primary px-2 py-1 text-primary-foreground",
                )}
              >
                Đang lên lịch
              </span>
            )}
          </span>

          <div className="min-w-0 pr-10">
            <p className={cn(MICRO, "flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground")}>
              {owner && <span>Chuyến của {owner}</span>}
              {isGuest && !owner && <span>Được mời cùng sửa</span>}
              {trip.place && <span>{trip.place.name}</span>}
              <span>
                <span className="tabular-nums text-foreground">
                  {trip._count.days}
                </span>{" "}
                ngày
              </span>
              {trip._count.items > 0 && (
                <span>
                  <span className="tabular-nums text-foreground">
                    {trip._count.items}
                  </span>{" "}
                  mục
                </span>
              )}
            </p>

            <h2
              className={cn(
                "mt-1.5 font-[family-name:var(--font-display)] font-normal leading-[1.18] tracking-tight",
                lead
                  ? "text-[clamp(1.5rem,3.2vw,2.125rem)]"
                  : "text-[clamp(1.25rem,2.4vw,1.5rem)]",
              )}
            >
              <Link
                href={`/lich-trinh/cua-toi/${trip.id}`}
                className="underline-offset-[6px] after:absolute after:inset-0 hover:underline"
              >
                {trip.title}
              </Link>
            </h2>

            {lead && trip.days.length > 0 ? (
              /* KHÔNG kẻ nét dưới từng ngày: số thứ tự bên trái và số điểm dừng
                 neo mép phải đã tạo hai trục thẳng hàng cho mắt bám theo. */
              <div className="mt-3.5">
                {trip.days.slice(0, LEAD_DAYS).map((d, i) => (
                  <p key={d.id} className="flex items-baseline gap-3 py-1">
                    <span
                      className={cn(
                        MICRO,
                        "w-5 shrink-0 tabular-nums text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
                      {d.title ?? `Ngày ${i + 1}`}
                    </span>
                    <span className={cn(MICRO, "shrink-0 text-muted-foreground")}>
                      {d._count.items > 0 ? (
                        <>
                          <span className="tabular-nums text-foreground">
                            {d._count.items}
                          </span>{" "}
                          điểm dừng
                        </>
                      ) : (
                        "chưa xếp"
                      )}
                    </span>
                  </p>
                ))}
                {restDays > 0 && (
                  <p className={cn(MICRO, "mt-1.5 ps-8 text-muted-foreground")}>
                    +{restDays} ngày nữa
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {stops.length > 0 ? (
                  stops.map((s) => <span key={s.name}>{s.name}</span>)
                ) : (
                  <span>Chưa có điểm dừng nào</span>
                )}
              </p>
            )}

            <p className={cn(MICRO, "mt-4 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground")}>
              {trip.startDate && (
                <span>
                  Khởi hành{" "}
                  <span className="tabular-nums text-foreground">
                    {trip.startDate.toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </span>
              )}
              <span>Sửa {timeAgo(trip.updatedAt)}</span>
            </p>
          </div>
        </div>
      </RiseInView>

      <TripCardMenu
        tripId={trip.id}
        title={trip.title}
        isPlanning={isPlanning}
        className={cn(
          "absolute right-0 bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background sm:bg-transparent sm:shadow-none sm:backdrop-blur-none",
          lead ? "top-6 sm:top-8" : "top-5 sm:top-6",
        )}
      />
    </li>
  );
}
