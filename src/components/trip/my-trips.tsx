import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import { coverUrl } from "@/lib/place-image";
import { NewTripButton, TripCardMenu } from "@/components/trip/trip-list-actions";
import { RiseInView } from "@/components/site/reveal";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD } from "@/lib/radius";

/**
 * Khối "Chuyến của bạn" ở trang `/lich-trinh` (trang gộp: chuyến của tôi + lịch trình mẫu — `/lich-trinh/cua-toi` đã
 * chuyển hướng về đây). Server Component, chỉ dựng khi đã đăng nhập; khách thấy `MyTripsGuest`.
 */


// Số ngày liệt kê trên thẻ dẫn đầu; phần dư gộp thành một dòng "+N ngày nữa".
const LEAD_DAYS = 5;

const coverSel = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;
const stopSel = { select: { name: true, slug: true, images: coverSel } } as const;

type Img = { url: string; isCover: boolean };
type Stop = { name: string; photo: string };

/** Tiêu đề khối của trang /lich-trinh — chữ thường đậm, KHÔNG in hoa giãn chữ (dành cho hero). Dùng chung với khối mẫu. */
export const SECTION_TITLE =
  "font-[family-name:var(--font-display)] text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-tight";

function Head({ meta, action }: { meta?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <RiseInView distance={14}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h2 className={SECTION_TITLE}>Chuyến của bạn</h2>
          {meta && <p className="flex gap-x-4 text-sm text-muted-foreground">{meta}</p>}
        </div>
        {action}
      </div>
    </RiseInView>
  );
}

export async function MyTrips({ userId, planningId }: { userId: string; planningId: string | null }) {
  const trips = await prisma.trip.findMany({
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
  });

  // Chuyến đang lên lịch luôn là thẻ dẫn đầu: đó là chuyến người dùng quay lại nhiều nhất, và thẻ dẫn đầu là chỗ duy
  // nhất liệt kê từng ngày.
  const ordered = [...trips].sort((a, b) => Number(b.id === planningId) - Number(a.id === planningId));
  const totalDays = trips.reduce((n, t) => n + t._count.days, 0);
  const totalItems = trips.reduce((n, t) => n + t._count.items, 0);

  return (
    <section id="cua-toi" className="scroll-mt-24">
      <Head
        meta={
          trips.length > 0 && (
            <>
              <span>
                <strong className="font-semibold tabular-nums text-foreground">{trips.length}</strong> chuyến
              </span>
              <span>
                <strong className="font-semibold tabular-nums text-foreground">{totalDays}</strong> ngày
              </span>
              <span>
                <strong className="font-semibold tabular-nums text-foreground">{totalItems}</strong> mục
              </span>
            </>
          )
        }
        // Chưa có chuyến nào thì ô rỗng bên dưới giữ nút tạo — hai nút cùng màn hình thì không nút nào là lối rõ ràng.
        action={trips.length > 0 ? <NewTripButton /> : undefined}
      />

      {ordered.length > 0 ? (
        // Thẻ DẪN (chuyến đang lên lịch / sửa gần nhất) nằm ngang hết bề rộng, kèm từng ngày; còn lại là lưới thẻ ảnh nhỏ.
        <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className={cn(R_CARD, "mt-6 border border-dashed border-border px-6 py-12 text-center")}>
          <p className="font-[family-name:var(--font-display)] text-lg tracking-tight">Bạn chưa có lịch trình nào</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tạo một chuyến, hoặc nhân bản một lịch trình mẫu bên dưới rồi sửa theo ý bạn.
          </p>
          <div className="mt-5">
            <NewTripButton />
          </div>
        </div>
      )}
    </section>
  );
}

/** Khách chưa đăng nhập: cùng chỗ đứng với "Chuyến của bạn", mời tạo chuyến (trang tạo tự đưa qua đăng nhập). */
export function MyTripsGuest() {
  return (
    <section className={cn(R_CARD, "flex flex-wrap items-center justify-between gap-x-6 gap-y-4 bg-band px-5 py-5 sm:px-6")}>
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-display)] text-lg tracking-tight">Tự xếp chuyến của bạn</p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Gom nơi muốn đến, xếp vào từng ngày — có giờ ước tính và báo trước chỗ nào chưa mở lúc bạn tới.
        </p>
      </div>
      {/* Cùng nút với người đã đăng nhập — trang tạo tự đưa khách qua đăng nhập rồi quay lại. */}
      <NewTripButton />
    </section>
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

  const meta = (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">
      {owner && <span>Chuyến của {owner}</span>}
      {isGuest && !owner && <span>Được mời cùng sửa</span>}
      {trip.place && <span>{trip.place.name}</span>}
      <span>
        <strong className="font-semibold tabular-nums text-foreground">{trip._count.days}</strong> ngày
      </span>
      {trip._count.items > 0 && (
        <span>
          <strong className="font-semibold tabular-nums text-foreground">{trip._count.items}</strong> mục
        </span>
      )}
    </p>
  );
  const when = (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">
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
  );

  return (
    <li className={cn("relative", lead && "sm:col-span-2 lg:col-span-3")}>
      <RiseInView distance={14}>
        <div
          className={cn(
            "group",
            lead && "grid gap-4 sm:grid-cols-[minmax(0,22rem)_1fr] sm:gap-8",
          )}
        >
          <span
            className={cn(
              R_CARD,
              "relative block overflow-hidden bg-muted",
              lead ? "aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-[13rem]" : "aspect-[16/10]",
            )}
          >
            {cover ? (
              <Image
                src={cover}
                alt=""
                fill
                sizes={lead ? "(min-width: 640px) 22rem, 92vw" : "(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 92vw"}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-3xl font-semibold leading-none">
                    {trip._count.days}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">ngày</span>
                </span>
              </span>
            )}
            {isPlanning && (
              <span
                className={cn(
                  R_BADGE,
                  "absolute left-2.5 top-2.5 bg-primary px-2 py-1 text-[0.6875rem] font-semibold text-primary-foreground",
                )}
              >
                Đang lên lịch
              </span>
            )}
          </span>

          <div className={cn("min-w-0", lead ? "flex flex-col sm:py-1 sm:pr-10" : "mt-3 pr-8")}>
            {meta}
            <h3
              className={cn(
                "mt-1 font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight",
                lead ? "text-[clamp(1.375rem,2.6vw,1.75rem)]" : "text-lg",
              )}
            >
              <Link
                href={`/lich-trinh/cua-toi/${trip.id}`}
                className="transition-colors after:absolute after:inset-0 group-hover:text-primary-ink"
              >
                {trip.title}
              </Link>
            </h3>

            {lead && trip.days.length > 0 && (
              <ol className="mt-3 space-y-1">
                {trip.days.slice(0, LEAD_DAYS).map((d, i) => (
                  <li key={d.id} className="flex items-baseline gap-3 text-[0.9375rem]">
                    <span className="w-14 shrink-0 text-sm text-muted-foreground">Ngày {i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{d.title ?? ""}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {d._count.items > 0 ? (
                        <>
                          <strong className="font-semibold tabular-nums text-foreground">{d._count.items}</strong> điểm
                          dừng
                        </>
                      ) : (
                        "Chưa xếp"
                      )}
                    </span>
                  </li>
                ))}
                {restDays > 0 && <li className="pl-[4.25rem] text-sm text-muted-foreground">+{restDays} ngày nữa</li>}
              </ol>
            )}
            {!lead && stops.length > 0 && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{stops.map((s) => s.name).join(", ")}</p>
            )}
            <div className={cn(lead ? "mt-auto pt-4" : "mt-2")}>{when}</div>
          </div>
        </div>
      </RiseInView>

      <TripCardMenu
        tripId={trip.id}
        title={trip.title}
        isPlanning={isPlanning}
        className={cn(
          "absolute bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background",
          lead ? "right-2 top-2 sm:right-0 sm:top-0 sm:bg-transparent sm:shadow-none sm:backdrop-blur-none" : "right-2 top-2",
        )}
      />
    </li>
  );
}
