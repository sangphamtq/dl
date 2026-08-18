import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Route, Sparkles } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanningTripId } from "./actions";
import { NewTripButton, TripCardMenu } from "@/components/trip/trip-list-actions";

export const metadata = {
  title: "Lịch trình của tôi · Halivivu",
  description:
    "Gom điểm muốn đến, xếp theo ngày và xem ngay giờ ước tính — biết trước quán nào chưa mở lúc bạn tới.",
};

// Danh sách chuyến của người dùng + gợi ý lịch trình mẫu.
// Bắt đăng nhập (docs/lich-trinh.md §2) — trang này toàn dữ liệu cá nhân.
export default async function LichTrinhPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/lich-trinh");
  const userId = session.user.id;

  const [trips, templates, planningId] = await Promise.all([
    prisma.trip.findMany({
      // Chuyến mình sở hữu HOẶC được mời cùng sửa.
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
        // Ảnh bìa thẻ: mượn ảnh của địa điểm đầu tiên trong chuyến.
        items: {
          take: 1,
          where: { spotId: { not: null } },
          select: {
            spot: { select: { images: { where: { isCover: true }, take: 1, select: { url: true } } } },
          },
        },
        // Nơi bấm "Lên lịch trình đi X" — dùng làm ảnh bìa dự phòng.
        place: {
          select: { images: { where: { isCover: true }, take: 1, select: { url: true } } },
        },
      },
    }),
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published" },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: 6,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        place: { select: { name: true } },
        images: { where: { isCover: true }, take: 1, select: { url: true, alt: true } },
        _count: { select: { days: true } },
      },
    }),
    getPlanningTripId(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <main className="relative flex-1 bg-gradient-to-b from-sky-100/70 via-sky-50/40 to-background dark:from-muted/30 dark:via-muted/10">
        {/* Hoạ tiết vòng tròn đồng tâm — sau nội dung */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-4 -z-10 size-[34rem] rounded-full border border-primary/10 [mask-image:radial-gradient(circle,black,transparent_70%)]"
        >
          <div className="absolute inset-12 rounded-full border border-primary/10" />
          <div className="absolute inset-28 rounded-full border border-warm/10" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-sm font-medium text-warm">Chuyến đi của bạn</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Lịch trình
              </h1>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                Gom nơi muốn đến, xếp vào từng ngày — chúng tôi tính giúp
                giờ ước tính và báo trước chỗ nào chưa mở lúc bạn tới.
              </p>
            </div>
            <NewTripButton />
          </div>

          {/* ── Chuyến của tôi ─────────────────────────────────── */}
          {trips.length > 0 ? (
            <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => {
                const cover =
                  trip.items[0]?.spot?.images[0]?.url ??
                  trip.place?.images[0]?.url ??
                  null;
                return (
                  <li key={trip.id} className="group relative">
                    <div className="h-full overflow-hidden rounded-2xl bg-card shadow-lg shadow-black/5 transition-shadow hover:shadow-xl">
                      <div className="relative aspect-[4/3] bg-muted">
                        {cover ? (
                          <Image
                            src={cover}
                            alt={trip.title}
                            fill
                            sizes="(min-width:1024px) 20rem, (min-width:640px) 45vw, 90vw"
                            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <Route className="size-8 text-muted-foreground/40" aria-hidden />
                          </div>
                        )}
                        {trip.id === planningId && (
                          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-primary backdrop-blur-sm">
                            Đang lên lịch trình
                          </span>
                        )}
                        {/* Chuyến của người khác mời mình vào — không đánh dấu
                            thì danh sách trộn lẫn mà không biết cái nào của ai. */}
                        {trip.ownerId !== userId && (
                          <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                            {trip.owner?.name
                              ? `Chuyến của ${trip.owner.name.split(" ").slice(-1)[0]}`
                              : "Được mời cùng sửa"}
                          </span>
                        )}
                        <TripCardMenu
                          tripId={trip.id}
                          title={trip.title}
                          isPlanning={trip.id === planningId}
                        />
                      </div>

                      <div className="p-4">
                        <h2 className="font-semibold leading-snug tracking-tight">
                          <Link
                            href={`/lich-trinh/${trip.id}`}
                            className="after:absolute after:inset-0 hover:text-primary"
                          >
                            {trip.title}
                          </Link>
                        </h2>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden />
                            {trip._count.days} ngày
                          </span>
                          <span aria-hidden className="h-3 w-px bg-border" />
                          <span>{trip._count.items} mục</span>
                          {trip.startDate && (
                            <>
                              <span aria-hidden className="h-3 w-px bg-border" />
                              <span>
                                {trip.startDate.toLocaleDateString("vi-VN", {
                                  day: "numeric",
                                  month: "numeric",
                                  year: "numeric",
                                  timeZone: "UTC",
                                })}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <Route className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 font-semibold tracking-tight">
                Bạn chưa có lịch trình nào
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Tạo một chuyến rồi bấm <strong className="font-medium text-foreground">Thêm vào lịch trình</strong>{" "}
                ở bất kỳ địa điểm, quán ăn hay chỗ ở nào bạn thích.
              </p>
              <div className="mt-5">
                <NewTripButton />
              </div>
            </div>
          )}

          {/* ── Lịch trình mẫu ─────────────────────────────────── */}
          {templates.length > 0 && (
            <section className="mt-14">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-warm" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Lịch trình gợi ý
                </h2>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Do biên tập soạn — bấm để nhân bản thành chuyến của riêng bạn rồi sửa thoải mái.
              </p>

              <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <li key={t.id} className="group relative">
                    <div className="h-full overflow-hidden rounded-2xl bg-card shadow-lg shadow-black/5 transition-shadow hover:shadow-xl">
                      <div className="relative aspect-[4/3] bg-muted">
                        {t.images[0] ? (
                          <Image
                            src={t.images[0].url}
                            alt={t.images[0].alt ?? t.title}
                            fill
                            sizes="(min-width:1024px) 20rem, (min-width:640px) 45vw, 90vw"
                            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <Sparkles className="size-8 text-muted-foreground/40" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold leading-snug tracking-tight">
                          <Link
                            href={`/lich-trinh/mau/${t.slug}`}
                            className="after:absolute after:inset-0 hover:text-primary"
                          >
                            {t.title}
                          </Link>
                        </h3>
                        {t.summary && (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {t.summary}
                          </p>
                        )}
                        <p className="mt-2 flex items-center gap-2.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden />
                            {t._count.days} ngày
                          </span>
                          {t.place && (
                            <>
                              <span aria-hidden className="h-3 w-px bg-border" />
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3.5" aria-hidden />
                                {t.place.name}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
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
