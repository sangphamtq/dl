import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Route } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TripControls } from "@/components/trip/trip-controls";
import { TRIP_SORTS, type TripSortKey } from "@/lib/trip-template-sort";
import { cn } from "@/lib/utils";
import { R_CARD } from "@/lib/radius";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { coverUrl } from "@/lib/place-image";
import { Curtain, Rise, RiseInView } from "@/components/site/reveal";
import { HeroLink } from "@/components/site/hero-link";
import { getPlanningTripId } from "@/app/(site)/lich-trinh/actions";

// `/lich-trinh` — trang CÔNG KHAI của cả tính năng lịch trình.
//
// Trước đây chỗ này là danh sách chuyến CÁ NHÂN và `redirect("/login")` ngay
// dòng đầu, nên lịch trình mẫu — thứ dựng để làm đòn bẩy SEO — lại không có
// trang index nào. Nay phần cá nhân ở `/lich-trinh/cua-toi`, chỗ này cho khách.
// Xem docs/lich-trinh.md §4 và §7a.
//
// ── VÌ SAO BỎ BỘ DUYỆT (TripBrowser) ────────────────────────────────────────
// Bản trước dựng cả bộ máy catalogue quanh nội dung: ô tìm kiếm + lọc số ngày +
// sắp xếp + chip điểm đến + công tắc lưới/danh sách + "tải thêm" theo trang 9.
// Đo trên dữ liệu thật: **8 ô điều khiển cho 2 lịch trình** — và đúng 2 cái đó
// trang chủ đã bày sẵn. Lọc 2 mục thì không phải là lọc, chỉ là đồ đạc.
//
// Quan trọng hơn: trang CŨ GIẢI THÍCH cách tự xếp lịch trình ("bấm Thêm vào
// lịch trình ở bất kỳ địa điểm nào rồi kéo vào ngày") bằng một đoạn văn ở đáy
// trang, trong khi site đã có sẵn nút một-chạm "Lên lịch trình đi X" mà trang
// này không hề mời. Nay đoạn văn đó thành HÀNH ĐỘNG THẬT: lưới điểm đến, bấm
// một cái là mở đúng hộp "tiếp tục chuyến đang có / bắt đầu từ mẫu / tạo mới".
//
// Bộ duyệt đã xoá (`components/trip/trip-browser.tsx`) — khi nào số mẫu vượt
// ~8 thì lấy lại trong lịch sử git, đừng dựng lại từ đầu.
//
// ── PHONG CÁCH: LẤY NGUYÊN CỦA `/diem-den` ──────────────────────────────────
// Tiêu đề in hoa giãn chữ (`--font-display`), nhãn `MICRO`, bo góc theo bộ
// chung, và thẻ LẤY ẢNH LÀM CHỦ: tên đặt GIỮA ảnh dưới lớp phủ tối, hàng dữ
// kiện ngăn bằng khoảng trắng ở đáy ảnh. Một lịch trình và một điểm đến là hai mặt của cùng một
// chuyến đi, người dùng đi qua lại giữa hai trang — chúng không được là hai sản
// phẩm khác nhau.

export const metadata = {
  title: "Lịch trình mẫu · Halivivu",
  description:
    "Lịch trình gợi ý theo từng điểm đến — xem chi tiết từng ngày, giờ ước tính, rồi sao về tài khoản và sửa theo ý bạn.",
};

// CÙNG một hằng với `destination-filter.tsx` — đừng chế biến thể riêng.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

const coverSel = {
  where: { isCover: true },
  take: 1,
  select: { url: true, alt: true },
} as const;

const pub = { status: "published" as const };

/** "3 ngày 2 đêm" — đúng cách người Việt gọi độ dài một chuyến. */
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
            // Ảnh bìa của từng mục — dùng làm ảnh DỰ PHÒNG cho mẫu chưa có ảnh
            // bìa riêng, và làm ảnh cho dải mở đầu (xem `heroUrl`). Số mẫu đếm
            // trên đầu ngón tay nên vài chục dòng ảnh ở đây rẻ hơn một truy vấn
            // thứ hai.
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

  // Chuyến đang lên lịch trình — chỉ tra khi CÓ cookie và người dùng đã đăng
  // nhập. `ownerId` trong điều kiện là để cookie của phiên trước (hoặc của máy
  // dùng chung) không lôi ra chuyến của người khác.
  const planning =
    isAuthed && planningId
      ? await prisma.trip.findFirst({
          where: { id: planningId, ownerId: session!.user!.id },
          select: {
            id: true,
            title: true,
            _count: { select: { days: true, items: true } },
          },
        })
      : null;

  // Lọc + sắp xếp làm Ở ĐÂY chứ không trong truy vấn: số mẫu đếm trên đầu ngón
  // tay, mà `lengths` (các độ dài có thật) phải tính trên TOÀN BỘ mẫu — lọc ở
  // tầng DB thì chip "2 ngày" sẽ biến mất ngay khi đang đứng ở "3 ngày".
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
      return 0; // "noi-bat" — giữ đúng thứ tự truy vấn đã sắp
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
        {/* ── Dải mở đầu ───────────────────────────────────────────────────
            Cùng khuôn với `/diem-den`: ảnh tràn viền + lớp phủ hình bầu dục,
            tên trang bằng serif in hoa giãn chữ, hai nút kính bên dưới.
            Nền TỐI vẽ sẵn dưới ảnh — không có ảnh (chưa mẫu nào có ảnh điểm
            dừng) thì chữ trắng vẫn đọc được, thay vì trắng trên trắng. */}
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

        {/* DẢI TRẠNG THÁI của CHÍNH NGƯỜI ĐANG XEM, không phải một thẻ nội dung.
            Hai thứ nói "đây là của bạn", cả hai đều cần:
              · ẢNH ĐẠI DIỆN — dấu hiệu mạnh nhất, không cần đọc chữ cũng hiểu;
              · CÂU Ở NGÔI THỨ HAI viết thường ("Bạn đang lên lịch trình …").
                Bản trước dùng nhãn IN HOA NHỎ `MICRO`, mà đó đúng là kiểu chữ
                của nhãn phân loại ở các hàng mẫu ("BÌNH THUẬN · 3 NGÀY 2 ĐÊM")
                — nên nó đọc ra như metadata của một mẫu, không phải lời hệ
                thống nói với người dùng.
            Nền phớt màu đã tự tách khối nên KHÔNG thêm đường kẻ. Đặt ngay dưới
            hero: người quay lại giữa chừng cần đường về trước, chưa cần mẫu mới. */}
        {planning && (
          <Link
            href={`/lich-trinh/cua-toi/${planning.id}`}
            className="group block bg-primary/5 transition-colors hover:bg-primary/10"
          >
            <span className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
              <Avatar className="size-8 shrink-0 ring-2 ring-primary/20">
                {session?.user?.image && (
                  <AvatarImage src={session.user.image} alt="" />
                )}
                <AvatarFallback className="text-xs">
                  {(session?.user?.name ?? session?.user?.email ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug text-muted-foreground">
                Bạn đang lên lịch trình{" "}
                <span className="font-[family-name:var(--font-display)] font-medium tracking-tight text-foreground">
                  {planning.title}
                </span>
              </span>

              <span className={cn(MICRO, "shrink-0 text-muted-foreground")}>
                <span className="tabular-nums text-foreground">
                  {planning._count.days}
                </span>{" "}
                ngày{" "}
                <span className="ms-3 tabular-nums text-foreground">
                  {planning._count.items}
                </span>{" "}
                mục
              </span>

              <span className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-primary-ink">
                Tiếp tục
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </span>
            </span>
          </Link>
        )}

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">

          {/* ── Lịch trình mẫu ─────────────────────────────────────────────
              MỖI MẪU MỘT HÀNG TRÀN NGANG, không phải thẻ teaser trong lưới:
              hai mẫu xếp thành thẻ thì bỏ trống nửa hàng và không nói được gì
              hơn tên + số ngày. Nửa trái là THẺ ẢNH đúng khuôn `/diem-den`
              (tên giữa ảnh, dữ kiện gạch mảnh ở đáy), nửa phải là thứ chỉ lịch
              trình mới có: TỪNG NGÀY. */}
          {rows.length > 0 ? (
            <section>
              <SectionHead title="Lịch trình mẫu" />

              <TripControls lengths={lengths} days={days} sort={sort} />

              {visible.length === 0 ? (
                <p className="mt-10 text-sm text-muted-foreground">
                  Không có mẫu nào dài {days} ngày.{" "}
                  <Link href="/lich-trinh" className="underline underline-offset-4">
                    Xoá bộ lọc
                  </Link>
                </p>
              ) : (
              <ul className="mt-6 divide-y divide-border">
                {visible.map((t) => {
                  const days = t.days;
                  // Luôn có ảnh: bìa mẫu → ảnh điểm dừng đầu tiên → ảnh dự
                  // phòng theo slug. Thẻ ở /diem-den cũng vậy, nên hai trang
                  // không bao giờ có cái nào là ô xám trống.
                  const cover =
                    coverOf(t) ?? coverUrl([], t.slug ?? t.id, 900, 600);
                  const stops = days.reduce((n, d) => n + d._count.items, 0);
                  const where = t.place?.parent?.name ?? t.place?.name ?? null;
                  return (
                    <li key={t.id}>
                      <RiseInView distance={14}>
                        <Link
                          href={`/lich-trinh/${t.slug}`}
                          className="group grid gap-4 py-7 focus-visible:outline-none sm:grid-cols-[minmax(0,19rem)_1fr] sm:gap-7 sm:py-8"
                        >
                          {/* Ảnh CAO BẰNG cột chữ (`sm:h-full`), không đặt tỉ lệ
                              cố định: mẫu 1 ngày có cột chữ ngắn, mẫu 3 ngày dài
                              hơn — để `aspect-[4/3]` thì hàng nào cũng thừa hoặc
                              thiếu chỗ. `min-h` giữ ảnh không bị bẹp ở mẫu ngắn. */}
                          <span
                            className={cn(
                              R_CARD,
                              "relative block aspect-[4/3] overflow-hidden bg-muted group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background sm:aspect-auto sm:h-full sm:min-h-[12rem]",
                            )}
                          >
                            <Image
                              src={cover}
                              alt=""
                              fill
                              sizes="(min-width: 640px) 19rem, 92vw"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            />
                          </span>

                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                              {where && (
                                <span className={cn(MICRO, "text-muted-foreground")}>
                                  {where}
                                </span>
                              )}
                              <span className={cn(MICRO, "text-muted-foreground")}>
                                {lengthLabel(days.length)}
                              </span>
                              <span className={cn(MICRO, "text-muted-foreground")}>
                                <span className="tabular-nums text-foreground">
                                  {stops}
                                </span>{" "}
                                điểm dừng
                              </span>
                            </span>

                            <span className="mt-1.5 block font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.6vw,1.875rem)] font-normal leading-[1.18] tracking-tight underline-offset-[6px] group-hover:underline">
                              {t.title}
                            </span>

                            {t.summary && (
                              <span className="mt-2 block max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                                {t.summary}
                              </span>
                            )}

                            {/* KHÔNG kẻ nét dưới từng ngày: số thứ tự ở cột
                                trái và số điểm dừng neo mép phải đã tự tạo hai
                                trục thẳng hàng, mắt bám theo được. Thêm nét thì
                                một trang 5 mẫu có tới ~16 đường ngang. */}
                            <span className="mt-4 block">
                              {days.map((d, i) => (
                                <span
                                  key={d.id}
                                  className="flex items-baseline gap-3 py-1.5"
                                >
                                  <span
                                    className={cn(
                                      MICRO,
                                      "w-5 shrink-0 tabular-nums text-muted-foreground",
                                    )}
                                    aria-hidden
                                  >
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-[0.9375rem] tracking-tight">
                                    {d.title ?? `Ngày ${i + 1}`}
                                  </span>
                                  <span
                                    className={cn(MICRO, "shrink-0 text-muted-foreground")}
                                  >
                                    <span className="tabular-nums text-foreground">
                                      {d._count.items}
                                    </span>{" "}
                                    điểm dừng
                                  </span>
                                </span>
                              ))}
                            </span>
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

/** Tiêu đề mục — serif in hoa giãn chữ + nhãn nhỏ bên phải, khuôn của `Rail`. */
function SectionHead({
  title,
  meta,
}: {
  title: string;
  /** Dữ kiện phụ bên phải tiêu đề. Bỏ trống thì tiêu đề đứng một mình. */
  meta?: React.ReactNode;
}) {
  return (
    <RiseInView distance={14}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.25rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
          {title}
        </h2>
        {meta && <p className={cn(MICRO, "text-muted-foreground")}>{meta}</p>}
      </div>
    </RiseInView>
  );
}


/**
 * Ảnh của một mẫu: bìa riêng → ảnh bìa của ĐIỂM DỪNG ĐẦU TIÊN có ảnh → **null**.
 *
 * ⚠ KHÔNG rơi về `coverUrl()` (ảnh giữ chỗ picsum). Đã thử và bỏ — mẫu Tà Xùa,
 * một chuyến LÊN NÚI SĂN MÂY, nhận về một tấm bờ biển bão tố (docs §7a). Trả
 * null để chỗ gọi để trống ô ảnh (chỉ còn khuôn chữ trên nền `muted`).
 *
 * Nấc giữa là nấc đáng giá: ảnh của một điểm dừng trong CHÍNH chuyến đó vừa có
 * thật vừa đúng chuyện, mà bản cũ bỏ qua (nó chỉ dùng ảnh điểm dừng cho dải mở
 * đầu, còn thẻ thì để trống).
 */
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

