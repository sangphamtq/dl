import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Route, Sparkles } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanningTripId } from "../actions";
import { NewTripButton, TripCardMenu } from "@/components/trip/trip-list-actions";
import { cn } from "@/lib/utils";

// Cùng họ chữ tiêu đề với các trang đã chuyển giọng — khai TẠI TRANG vì
// `--font-serif` không có trong root layout.
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

// Nhãn nhỏ in hoa — CÙNG hằng với `destination-filter.tsx`.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

export const metadata = {
  title: "Lịch trình của tôi · Halivivu",
  // Dữ liệu cá nhân — noindex. `/lich-trinh` (danh sách mẫu) mới là trang có index.
  robots: { index: false, follow: false },
  description:
    "Gom điểm muốn đến, xếp theo ngày và xem ngay giờ ước tính — biết trước quán nào chưa mở lúc bạn tới.",
};

// Danh sách chuyến của người dùng. Bắt đăng nhập (docs/lich-trinh.md §2) —
// trang này toàn dữ liệu cá nhân, nên nó nằm dưới `/lich-trinh/cua-toi` chứ
// không phải ngay `/lich-trinh`: cả nhánh riêng tư gom vào MỘT tiền tố thì
// `sw.js` chặn cache bằng đúng một dòng, và `/lich-trinh` được tự do làm trang
// công khai có index (docs/lich-trinh.md §4).
//
// Vẫn giữ một dải LỊCH TRÌNH MẪU ở cuối: người vừa đăng nhập mà chưa có chuyến
// nào thì mẫu là cách bắt đầu tốt nhất — trạng thái rỗng cần chỗ bấu víu. Khác
// bản trước ở chỗ nó chỉ còn là GỢI Ý (3 cái + link xem tất cả), danh sách đầy
// đủ đã có trang riêng công khai.
export default async function LichTrinhPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/lich-trinh/cua-toi");
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
      take: 3,
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
    // Nền TRẮNG, không hoạ tiết. Bản trước có dải chuyển sắc xanh da trời cộng
    // ba vòng tròn đồng tâm ở góc phải — hai thứ trang trí thuần tuý, mà bộ vật
    // liệu biên tập (`/diem-den`, `/dia-diem`, `/blog`…) không dùng nền màu lẫn
    // hoạ tiết: phân tầng ở đó do chữ và khoảng trắng lo.
    <div className={cn("flex flex-1 flex-col", serif.variable)}>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <p className={cn(MICRO, "text-warm-ink")}>Chuyến đi của bạn</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-serif)] text-[clamp(1.75rem,4.4vw,3rem)] font-normal uppercase leading-[1.15] tracking-[0.1em] sm:tracking-[0.14em]">
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
                    <div className="h-full overflow-hidden border border-border bg-card transition-colors hover:border-foreground">
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
                          <span
                            className={cn(
                              MICRO,
                              "absolute left-3 top-3 bg-white/95 px-2 py-1 text-neutral-900 shadow-sm backdrop-blur-sm",
                            )}
                          >
                            Đang lên lịch trình
                          </span>
                        )}
                        {/* Chuyến của người khác mời mình vào — không đánh dấu
                            thì danh sách trộn lẫn mà không biết cái nào của ai. */}
                        {trip.ownerId !== userId && (
                          <span
                            className={cn(
                              MICRO,
                              "absolute bottom-3 left-3 bg-white/95 px-2 py-1 text-neutral-900 shadow-sm backdrop-blur-sm",
                            )}
                          >
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
                            href={`/lich-trinh/cua-toi/${trip.id}`}
                            className="underline-offset-4 after:absolute after:inset-0 hover:underline"
                          >
                            {trip.title}
                          </Link>
                        </h2>
                        <p className={cn(MICRO, "mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted-foreground")}>
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
            <div className="mt-8 border border-dashed border-border px-6 py-14 text-center">
              <Route className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 font-[family-name:var(--font-display)] text-lg tracking-tight">
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
              {/* Bỏ icon tia lấp lánh cạnh tiêu đề: tiêu đề mục ở bộ vật liệu
                  này chỉ có chữ và một đường kẻ. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
                <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.125rem,2.2vw,1.5rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                  Lịch trình gợi ý
                </h2>
                <Link
                  href="/lich-trinh"
                  className={cn(MICRO, "text-muted-foreground transition-colors hover:text-foreground")}
                >
                  Xem tất cả →
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Do biên tập soạn — bấm để nhân bản thành chuyến của riêng bạn rồi sửa thoải mái.
              </p>

              <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <li key={t.id} className="group relative">
                    <div className="h-full overflow-hidden border border-border bg-card transition-colors hover:border-foreground">
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
                            href={`/lich-trinh/${t.slug}`}
                            className="underline-offset-4 after:absolute after:inset-0 hover:underline"
                          >
                            {t.title}
                          </Link>
                        </h3>
                        {t.summary && (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {t.summary}
                          </p>
                        )}
                        <p className={cn(MICRO, "mt-2.5 flex items-center gap-2.5 text-muted-foreground")}>
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
