import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { ArrowRight, Route } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { Curtain, Rise, RiseInView } from "@/components/site/reveal";
import { HeroLink } from "@/components/site/hero-link";
import { PlanTripButton } from "@/components/site/plan-trip-button";
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
// Serif in hoa giãn chữ cho tiêu đề (Playfair, `--font-serif` khai tại trang vì
// nó không có trong root layout), nhãn `MICRO`, HÌNH KHỐI VUÔNG, và thẻ LẤY ẢNH
// LÀM CHỦ: tên đặt GIỮA ảnh dưới lớp phủ tối, hàng dữ kiện ngăn bằng gạch mảnh
// trắng ở đáy ảnh. Một lịch trình và một điểm đến là hai mặt của cùng một
// chuyến đi, người dùng đi qua lại giữa hai trang — chúng không được là hai sản
// phẩm khác nhau.

export const metadata = {
  title: "Lịch trình mẫu · Halivivu",
  description:
    "Lịch trình gợi ý theo từng điểm đến — xem chi tiết từng ngày, giờ ước tính, rồi sao về tài khoản và sửa theo ý bạn.",
};

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

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

export default async function TripTemplatesPage() {
  const session = await auth();
  const isAuthed = !!session?.user;

  const [rows, places, planningId] = await Promise.all([
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
    // Nơi để BẮT ĐẦU một chuyến. Lấy dư rồi lọc bỏ nơi chưa có nội dung: mời
    // lên lịch trình cho một điểm đến rỗng là mời vào một trang trắng.
    prisma.place.findMany({
      where: {
        ...pub,
        OR: [
          { kind: "destination" },
          { kind: "province", treatAsDestination: true },
        ],
      },
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
      take: 18,
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        tagline: true,
        images: coverSel,
        parent: { select: { name: true } },
        _count: {
          select: {
            spots: { where: pub },
            eateries: { where: pub },
            accommodations: { where: pub },
            activities: { where: pub },
          },
        },
      },
    }),
    getPlanningTripId(),
  ]);

  const starters = places
    .filter(
      (p) =>
        p._count.spots + p._count.eateries + p._count.accommodations + p._count.activities >
        0,
    )
    .slice(0, 8);

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

  const totalDays = rows.reduce((n, t) => n + t.days.length, 0);

  return (
    <div className={cn("flex flex-1 flex-col", serif.variable)}>
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
              <h1 className="font-[family-name:var(--font-serif)] text-[clamp(2.5rem,7.5vw,5.5rem)] font-normal uppercase leading-[1.15] tracking-[0.12em] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.62)] sm:tracking-[0.18em]">
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
          {/* Người đang có chuyến dở cần ĐƯỜNG QUAY LẠI, không cần một mẫu mới
              — nên nó đứng trước cả danh sách mẫu. */}
          {planning && (
            <Link
              href={`/lich-trinh/cua-toi/${planning.id}`}
              className="group mb-12 flex items-center gap-4 border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 sm:mb-14"
            >
              <span className="grid size-10 shrink-0 place-items-center bg-primary/10 text-primary">
                <Route className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn(MICRO, "block text-muted-foreground")}>
                  Đang lên lịch trình
                </span>
                <span className="mt-1 block truncate font-[family-name:var(--font-display)] text-lg tracking-tight">
                  {planning.title}
                </span>
                <span className={cn(MICRO, "mt-1 block text-muted-foreground")}>
                  <span className="tabular-nums text-foreground">
                    {planning._count.days}
                  </span>{" "}
                  ngày ·{" "}
                  <span className="tabular-nums text-foreground">
                    {planning._count.items}
                  </span>{" "}
                  mục
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          )}

          {/* ── Lịch trình mẫu ─────────────────────────────────────────────
              MỖI MẪU MỘT HÀNG TRÀN NGANG, không phải thẻ teaser trong lưới:
              hai mẫu xếp thành thẻ thì bỏ trống nửa hàng và không nói được gì
              hơn tên + số ngày. Nửa trái là THẺ ẢNH đúng khuôn `/diem-den`
              (tên giữa ảnh, dữ kiện gạch mảnh ở đáy), nửa phải là thứ chỉ lịch
              trình mới có: TỪNG NGÀY. */}
          {rows.length > 0 ? (
            <section>
              <SectionHead
                title="Lịch trình mẫu"
                meta={
                  <>
                    <span className="tabular-nums text-foreground">{rows.length}</span> mẫu
                    {" · "}
                    <span className="tabular-nums text-foreground">{totalDays}</span> ngày
                  </>
                }
              />

              <ul className="mt-8 space-y-12 sm:space-y-16">
                {rows.map((t, ti) => {
                  const days = t.days.map((d, i) => ({
                    title: d.title ?? `Ngày ${i + 1}`,
                    stops: d._count.items,
                  }));
                  const stops = days.reduce((n, d) => n + d.stops, 0);
                  const where = t.place?.parent?.name ?? t.place?.name ?? null;
                  return (
                    <li key={t.id}>
                      <RiseInView distance={14}>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-10">
                          <Link
                            href={`/lich-trinh/${t.slug}`}
                            className="group relative block aspect-[3/2] overflow-hidden bg-muted"
                          >
                            {covers[ti] ? (
                              <>
                                <Image
                                  src={covers[ti]!}
                                  alt=""
                                  fill
                                  priority={ti === 0}
                                  sizes="(min-width: 1024px) 26rem, 100vw"
                                  className="object-cover"
                                />
                                <span
                                  aria-hidden
                                  className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none"
                                />
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12 transition-[box-shadow] duration-300 group-hover:ring-white/55 motion-reduce:transition-none"
                                />
                              </>
                            ) : (
                              // Mẫu chưa có ảnh: để TRỐNG, chỉ còn khuôn chữ.
                              // Bản trước vẽ N nốt tròn đánh số nối nét đứt (kế
                              // thừa từ thẻ cũ, nơi ô ảnh KHÔNG có chữ nào nên
                              // cần thứ gì đó lấp chỗ). Nay khuôn chữ nằm ngay
                              // trên đó: nốt vừa đè lên tên, vừa nói lại đúng
                              // điều hàng dữ kiện đã nói ("2 ngày 1 đêm").
                              <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-border transition-[box-shadow] duration-300 group-hover:ring-foreground/35 motion-reduce:transition-none"
                              />
                            )}

                            {/* Lớp chữ dùng CHUNG cho cả hai trường hợp, chỉ đổi
                                màu. Bản trước chỉ vẽ nó khi CÓ ảnh, nên mẫu chưa
                                có ảnh mất luôn tên lịch trình — cả hàng không
                                còn chỗ nào ghi nó tên gì. */}
                            <span className="absolute inset-0 flex flex-col p-4 sm:p-5">
                              <span className="flex flex-1 flex-col items-center justify-center px-2 pt-6 text-center">
                                {where && (
                                  <span
                                    className={cn(
                                      "max-w-full truncate font-[family-name:var(--font-rounded)] text-[0.8125rem] italic",
                                      covers[ti]
                                        ? "text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    {where}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-normal leading-[1.18] tracking-[-0.015em] sm:text-[1.5rem] lg:text-[1.75rem]",
                                    covers[ti]
                                      ? "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
                                      : "text-foreground",
                                  )}
                                >
                                  {t.title}
                                </span>
                              </span>

                              <span className="grid grid-cols-2 gap-x-5 sm:gap-x-8">
                                {[lengthLabel(days.length), `${stops} điểm dừng`].map(
                                  (fact) => (
                                    <span
                                      key={fact}
                                      className={cn(
                                        "mt-2 truncate border-t pt-1.5 text-[0.75rem] font-semibold leading-tight",
                                        covers[ti]
                                          ? "border-white/30 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]"
                                          : "border-border text-foreground",
                                      )}
                                    >
                                      {fact}
                                    </span>
                                  ),
                                )}
                              </span>
                            </span>
                          </Link>

                          <div className="min-w-0">
                            {/* Tên đã nằm GIỮA ẢNH — cột này không lặp lại nó,
                                chỉ nói tiếp: chuyến này gồm những ngày nào. */}
                            {t.summary && (
                              <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-muted-foreground">
                                {t.summary}
                              </p>
                            )}

                            <ol className="mt-6 border-t border-border">
                              {days.map((d, i) => (
                                <li
                                  key={i}
                                  className="flex items-baseline gap-4 border-b border-border py-3"
                                >
                                  <span
                                    className={cn(MICRO, "w-6 shrink-0 text-muted-foreground")}
                                    aria-hidden
                                  >
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] tracking-tight">
                                    {d.title}
                                  </span>
                                  <span className={cn(MICRO, "shrink-0 text-muted-foreground")}>
                                    <span className="tabular-nums text-foreground">
                                      {d.stops}
                                    </span>{" "}
                                    điểm dừng
                                  </span>
                                </li>
                              ))}
                            </ol>

                            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                              <SquareLink
                                href={`/lich-trinh/${t.slug}`}
                                label="Xem lịch trình"
                              />
                              <p className={cn(MICRO, "text-muted-foreground")}>
                                Sao về tài khoản rồi sửa thoải mái
                              </p>
                            </div>
                          </div>
                        </div>
                      </RiseInView>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <section className="border border-dashed border-border px-6 py-14 text-center">
              <Route className="mx-auto size-9 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 font-[family-name:var(--font-display)] text-lg tracking-tight">
                Chưa có lịch trình mẫu nào
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Bạn vẫn tự xếp được — chọn một điểm đến bên dưới để bắt đầu.
              </p>
            </section>
          )}

          {/* ── Tự bắt đầu ─────────────────────────────────────────────────
              Đây là chỗ bản cũ đặt MỘT ĐOẠN VĂN hướng dẫn ("bấm Thêm vào lịch
              trình ở bất kỳ địa điểm nào rồi kéo vào ngày"). Một trang công cụ
              mà phải giải thích công cụ bằng lời thì cái nút đang nằm sai chỗ:
              nút đó vốn có, chỉ là nó ở trang điểm đến. */}
          {starters.length > 0 && (
            <section className="mt-16 sm:mt-24">
              <SectionHead
                title="Tự xếp chuyến của bạn"
                meta={
                  <Link
                    href="/diem-den"
                    className="transition-colors hover:text-foreground"
                  >
                    Tất cả điểm đến →
                  </Link>
                }
              />
              {/* Cố ý KHÔNG viết "không mẫu nào hợp thì chọn nơi khác": hiện chỉ
                  hai điểm đến có đủ nội dung để xếp lịch, mà đúng hai nơi đó đã
                  có mẫu ở ngay trên. Câu đó sẽ tự mâu thuẫn. Chuyện thật là:
                  cùng một nơi, chuyến của bạn không nhất thiết giống mẫu. */}
              <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
                Mẫu chỉ là một cách đi. Chọn nơi bạn định tới — chuyến được tạo ngay,
                rồi cứ lướt địa điểm, quán ăn, chỗ ở của nơi đó mà bấm{" "}
                <strong className="font-semibold text-foreground">
                  Thêm vào lịch trình
                </strong>
                .
              </p>

              {/* Lưới CO THEO SỐ THẺ, không phải bốn cột cố định: hiện mới hai
                  nơi đủ nội dung, để nguyên `lg:grid-cols-4` thì hai ô trống bên
                  phải đọc ra như trang lỗi tải. Cùng bài học đã ghi ở khối "Gợi ý
                  lịch trình" của trang điểm đến. */}
              <ul
                className={cn(
                  "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2",
                  starters.length >= 3 && "lg:grid-cols-4",
                  starters.length <= 2 && "lg:max-w-3xl",
                )}
              >
                {starters.map((p, i) => (
                  <li key={p.id}>
                    <RiseInView delay={Math.min(i, 3) * 0.07}>
                      <PlanTripButton
                        placeId={p.id}
                        placeName={p.name}
                        isAuthed={isAuthed}
                        className="group block w-full"
                      >
                        {/* Cùng khuôn thẻ với `/diem-den`: ảnh 3/2, lớp phủ tối,
                            tên GIỮA ảnh, dữ kiện ngăn bằng gạch mảnh trắng. */}
                        <span className="relative block aspect-[3/2] overflow-hidden bg-muted">
                          <Image
                            src={coverUrl(
                              p.images.map((im) => ({ url: im.url, isCover: true })),
                              p.slug,
                              900,
                              600,
                            )}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                            className="object-cover"
                          />
                          <span
                            aria-hidden
                            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none"
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12 transition-[box-shadow] duration-300 group-hover:ring-white/55 motion-reduce:transition-none"
                          />
                          <span className="absolute inset-0 flex flex-col p-4 sm:p-5">
                            <span className="flex flex-1 flex-col items-center justify-center px-2 pt-6 text-center">
                              <span className="max-w-full truncate font-[family-name:var(--font-rounded)] text-[0.8125rem] italic text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                                {p.kind === "province" ? "Tỉnh" : (p.parent?.name ?? "Việt Nam")}
                              </span>
                              <span className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-normal leading-[1.18] tracking-[-0.015em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:text-[1.5rem]">
                                {p.name}
                              </span>
                            </span>

                            {/* Hàng đáy nói HÀNH ĐỘNG, không phải dữ kiện: thẻ
                                này bấm vào là mở hộp thoại tạo chuyến chứ không
                                phải đi tới một trang. Nhãn LUÔN hiện — điện
                                thoại không có hover. */}
                            <span className="mt-2 flex items-center justify-center gap-1.5 border-t border-white/30 pt-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
                              Lên lịch trình
                              <ArrowRight
                                className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                                aria-hidden
                              />
                            </span>
                          </span>
                        </span>
                      </PlanTripButton>
                    </RiseInView>
                  </li>
                ))}
              </ul>

              {/* Chuyến nhiều điểm đến không bắt đầu từ MỘT nơi — nó bắt đầu từ
                  câu hỏi "mấy nơi này có gần nhau không". Chỗ trả lời là bản đồ. */}
              <Link
                href="/ban-do"
                className="group mt-10 flex items-center justify-between gap-6 border-y border-border py-6 transition-colors hover:border-foreground"
              >
                <span className="min-w-0">
                  <span className={cn(MICRO, "block text-muted-foreground")}>
                    Đi nhiều nơi trong một chuyến
                  </span>
                  <span className="mt-1.5 block font-[family-name:var(--font-serif)] text-[clamp(1.125rem,2.2vw,1.5rem)] font-normal uppercase leading-[1.2] tracking-[0.1em]">
                    Đo trên bản đồ
                  </span>
                  <span className="mt-2 block max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Nối các điểm đến theo thứ tự, xem tổng đường và giờ lái từng chặng
                    trước khi chốt.
                  </span>
                </span>
                <ArrowRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
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
  meta: React.ReactNode;
}) {
  return (
    <RiseInView distance={14}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
        <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.25rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
          {title}
        </h2>
        <p className={cn(MICRO, "text-muted-foreground")}>{meta}</p>
      </div>
    </RiseInView>
  );
}

/** Nút vuông trên nền trang — bản "trên giấy" của `HeroLink`. */
function SquareLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        MICRO,
        "group inline-flex h-11 items-center gap-2 bg-foreground px-5 text-background transition-colors hover:bg-foreground/85",
      )}
    >
      {label}
      <ArrowRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
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

