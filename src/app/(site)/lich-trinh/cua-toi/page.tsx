import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import { coverUrl } from "@/lib/place-image";
import { getPlanningTripId } from "../actions";
import { NewTripButton, TripCardMenu } from "@/components/trip/trip-list-actions";
import { cn } from "@/lib/utils";

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

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

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <p className={cn(MICRO, "text-warm-ink")}>Chuyến đi của bạn</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4.4vw,3rem)] font-normal uppercase leading-[1.15] tracking-[0.1em] sm:tracking-[0.14em]">
                Lịch trình
              </h1>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                Gom nơi muốn đến, xếp vào từng ngày — chúng tôi tính giúp giờ ước
                tính và báo trước chỗ nào chưa mở lúc bạn tới.
              </p>
            </div>
            <NewTripButton />
          </div>

          {trips.length > 0 ? (
            <ul className="-mx-4 mt-9 border-y border-border">
              {trips.map((trip) => {
                const isPlanning = trip.id === planningId;
                const isGuest = trip.ownerId !== userId;
                const stops: Stop[] = trip.items.flatMap((it) => {
                  const t = it.spot ?? it.eatery ?? it.activity ?? it.accommodation;
                  if (t)
                    return [{ name: t.name, photo: coverUrl(t.images, t.slug, 480, 360) }];
                  return it.customTitle
                    ? [{ name: it.customTitle, photo: "" }]
                    : [];
                });
                const photos = stops.map((s) => s.photo).filter(Boolean);
                if (photos.length === 0 && trip.place)
                  photos.push(
                    coverUrl(trip.place.images, trip.place.slug, 480, 360),
                  );

                return (
                  <li
                    key={trip.id}
                    className={cn(
                      "relative border-b border-border last:border-b-0",
                      isPlanning &&
                        "bg-primary/5 shadow-[inset_2px_0_0_var(--primary)]",
                    )}
                  >
                    <div className="grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6 sm:py-6">
                      <StopMosaic photos={photos} days={trip._count.days} />

                      <div className="min-w-0 sm:pr-10">
                        {(isPlanning || isGuest) && (
                          <p
                            className={cn(
                              MICRO,
                              "mb-1",
                              isPlanning ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {isPlanning
                              ? "Đang lên lịch trình"
                              : trip.owner?.name
                                ? `Chuyến của ${trip.owner.name.split(" ").slice(-1)[0]}`
                                : "Được mời cùng sửa"}
                          </p>
                        )}

                        <h2 className="text-lg font-semibold leading-snug tracking-tight">
                          <Link
                            href={`/lich-trinh/cua-toi/${trip.id}`}
                            className="underline-offset-4 after:absolute after:inset-0 hover:underline"
                          >
                            {trip.title}
                          </Link>
                        </h2>

                        <p className="mt-1.5 flex min-w-0 flex-1 gap-x-4 overflow-hidden whitespace-nowrap text-sm text-muted-foreground [mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]">
                          {stops.length > 0 ? (
                            stops.map((s) => <span key={s.name}>{s.name}</span>)
                          ) : (
                            <span>Chưa có điểm dừng nào</span>
                          )}
                        </p>

                        <p
                          className={cn(
                            MICRO,
                            "mt-3 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground",
                          )}
                        >
                          <span>{trip._count.days} ngày</span>
                          {trip._count.items > 0 && (
                            <span>{trip._count.items} mục</span>
                          )}
                          {trip.startDate && (
                            <span>
                              Khởi hành{" "}
                              {trip.startDate.toLocaleDateString("vi-VN", {
                                day: "numeric",
                                month: "numeric",
                                year: "numeric",
                                timeZone: "UTC",
                              })}
                            </span>
                          )}
                          <span>Sửa {timeAgo(trip.updatedAt)}</span>
                        </p>
                      </div>
                    </div>

                    <TripCardMenu
                      tripId={trip.id}
                      title={trip.title}
                      isPlanning={isPlanning}
                      className="absolute right-3 top-4 bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background sm:right-4 sm:top-6 sm:bg-transparent sm:shadow-none sm:backdrop-blur-none"
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-9 border border-dashed border-border px-6 py-14 text-center">
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
            <section className="mt-14">
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

              <ul className="mt-4">
                {templates.map((t) => (
                  <li key={t.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/lich-trinh/${t.slug}`}
                      className="group flex items-center gap-4 py-3 transition-colors sm:gap-5"
                    >
                      <span className="relative size-12 shrink-0 overflow-hidden bg-muted sm:size-14">
                        <Image
                          src={coverUrl(t.images, t.slug ?? t.id, 240, 240)}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium underline-offset-4 group-hover:underline">
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
                        <span>{t._count.days} ngày</span>
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

function Tile({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width:640px) 15rem, 100vw"
        className="object-cover"
      />
    </span>
  );
}

function StopMosaic({ photos, days }: { photos: string[]; days: number }) {
  const box =
    "relative aspect-[16/10] overflow-hidden bg-muted sm:aspect-auto sm:h-full sm:min-h-[8.5rem]";

  if (photos.length === 0) {
    return (
      <div className={cn(box, "aspect-[5/2] grid place-items-center bg-muted")}>
        <span className="text-center">
          <span className="block font-[family-name:var(--font-display)] text-3xl leading-none">
            {days}
          </span>
          <span className={cn(MICRO, "mt-1.5 block text-muted-foreground")}>
            ngày
          </span>
        </span>
      </div>
    );
  }

  if (photos.length === 1)
    return (
      <div className={box}>
        <Tile src={photos[0]} className="absolute inset-0" />
      </div>
    );

  if (photos.length === 2)
    return (
      <div className={cn(box, "grid grid-cols-2 gap-px bg-background")}>
        <Tile src={photos[0]} />
        <Tile src={photos[1]} />
      </div>
    );

  return (
    <div
      className={cn(
        box,
        "grid grid-cols-[1.7fr_1fr] grid-rows-2 gap-px bg-background",
      )}
    >
      <Tile src={photos[0]} className="row-span-2" />
      <Tile src={photos[1]} />
      <Tile src={photos[2]} />
    </div>
  );
}
