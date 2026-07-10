import Image from "next/image";
import Link from "next/link";
import { Ic } from "@/components/icon";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroSearch } from "@/components/site/hero-search";

const pub = { status: "published" as const };

const placeSelect = {
  slug: true,
  name: true,
  kind: true,
  tagline: true,
  description: true,
  provinceName: true,
  images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
  _count: {
    select: {
      spots: true,
      eateries: true,
      activities: true,
      accommodations: true,
    },
  },
} as const;

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "short",
});

// Chủ đề khám phá — ánh xạ sang màn hình [loai] của một Place; ảnh minh hoạ lấy
// từ ảnh điểm đến thật (gán runtime) để "ảnh làm chủ", không dùng ảnh chế.
const THEMES = [
  { key: "dia-diem", name: "Địa điểm", icon: "signpost" },
  { key: "hoat-dong", name: "Trải nghiệm", icon: "compass" },
  { key: "am-thuc", name: "Ẩm thực", icon: "utensils" },
  { key: "luu-tru", name: "Lưu trú", icon: "bed-double" },
  { key: "di-chuyen", name: "Di chuyển", icon: "bus" },
  { key: "", name: "Tất cả", icon: "sparkles" },
] as const;

function total(p: PlaceRow) {
  const c = p._count;
  return c.spots + c.eateries + c.activities + c.accommodations;
}

export default async function Home() {
  const [session, featured, posts, provinceOpts, counts, galleryImgs] =
    await Promise.all([
      auth(),
      prisma.place.findMany({
        where: { ...pub, isFeatured: true },
        orderBy: [{ order: "asc" }, { popularity: "desc" }, { name: "asc" }],
        take: 12,
        select: placeSelect,
      }),
      prisma.post.findMany({
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: 3,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
          createdAt: true,
          author: { select: { name: true } },
          images: {
            where: { isCover: true },
            take: 1,
            select: { url: true, isCover: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.place.findMany({
        where: { ...pub, kind: "province" },
        orderBy: { name: "asc" },
        select: { slug: true, name: true },
      }),
      Promise.all([
        prisma.place.count({ where: { ...pub, kind: "province" } }),
        prisma.place.count({ where: { ...pub, kind: "destination" } }),
        prisma.spot.count({ where: pub }),
        prisma.post.count({ where: pub }),
      ]),
      prisma.image.findMany({
        where: { placeId: { not: null }, place: pub },
        orderBy: { id: "desc" },
        take: 8,
        select: { url: true, alt: true, place: { select: { slug: true } } },
      }),
    ]);

  const user = session?.user;

  const places =
    featured.length > 0
      ? featured
      : await prisma.place.findMany({
          where: pub,
          orderBy: { createdAt: "desc" },
          take: 12,
          select: placeSelect,
        });

  const [provinceCount, destCount, spotCount, postCount] = counts;

  const heroBg = places[0]
    ? coverUrl(places[0].images, places[0].slug, 1920, 1080)
    : "https://picsum.photos/seed/vietnam-hero/1920/1080";

  const popular = places.slice(0, 3);
  const themePlaces = places.slice(0, THEMES.length);

  const stats = [
    { icon: "map-pin", value: provinceCount, label: "Tỉnh / Thành phố" },
    { icon: "compass", value: destCount, label: "Điểm đến lớn" },
    { icon: "signpost", value: spotCount, label: "Địa điểm tham quan" },
    { icon: "book-open", value: postCount, label: "Bài cẩm nang" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="relative isolate flex min-h-[640px] items-center overflow-hidden sm:min-h-[700px]">
          <Image
            src={heroBg}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />

          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            <div className="max-w-2xl text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 py-1 pl-1.5 pr-3 text-xs font-medium backdrop-blur">
                <span className="rounded-full bg-warm px-2 py-0.5 text-warm-foreground">
                  Xin chào
                </span>
                {user?.name ?? "người lữ hành"} 👋
              </span>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.03] tracking-tight drop-shadow-sm sm:text-5xl lg:text-[3.75rem]">
                Khám phá Việt Nam,
                <br />
                mỗi chuyến một hành trình
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
                Một nơi để biết nên ăn gì, chơi gì, ở đâu và đi lại thế nào —
                gọn gàng cho từng điểm đến, để bạn chỉ việc xách balo lên và đi.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/diem-den"
                  className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
                >
                  Bắt đầu khám phá
                  <Ic icon="arrow-right" className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white"
                >
                  <span className="flex size-10 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur transition-colors hover:bg-white/20">
                    <Ic icon="book-open" className="size-4" aria-hidden />
                  </span>
                  Xem cẩm nang
                </Link>
              </div>
            </div>

            {/* Thanh tìm kiếm nổi */}
            <div className="mt-12 max-w-3xl">
              <HeroSearch places={provinceOpts} />
            </div>
          </div>
        </section>

        {/* ─── CHỦ ĐỀ KHÁM PHÁ ──────────────────────────────────── */}
        {themePlaces.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionTitle
              eyebrow="Muôn nơi chờ bạn"
              title="Khám phá theo chủ đề"
            />
            <div className="mt-12 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-6">
              {THEMES.map((theme, i) => {
                const p = themePlaces[i] ?? themePlaces[0];
                const href = `/diem-den/${p.slug}${theme.key ? `/${theme.key}` : ""}`;
                return (
                  <Link
                    key={theme.name}
                    href={href}
                    className={cn(
                      "group text-center",
                      i % 2 === 1 && "sm:translate-y-6",
                    )}
                  >
                    <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] bg-muted shadow-lg shadow-black/5 transition-transform duration-300 group-hover:-translate-y-1.5">
                      <Image
                        src={coverUrl(p.images, p.slug, 320, 420)}
                        alt={theme.name}
                        fill
                        sizes="(min-width: 640px) 16vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                      <span className="absolute left-1/2 top-3 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-background/90 text-primary shadow backdrop-blur">
                        <Ic icon={theme.icon} className="size-4" aria-hidden />
                      </span>
                    </div>
                    <span className="mt-3 block text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
                      {theme.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── ĐIỂM ĐẾN PHỔ BIẾN (3 card, giữa nổi) ─────────────── */}
        {popular.length > 0 && (
          <section className="bg-accent/50">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <SectionTitle
                eyebrow="Được yêu thích"
                title="Điểm đến phổ biến"
              />
              <div className="mt-12 grid grid-cols-1 items-start gap-6 sm:grid-cols-3">
                {popular.map((p, i) => (
                  <PopularCard key={p.slug} place={p} featured={i === 1} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── VỀ CHÚNG TÔI ─────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Ảnh chồng lớp + badge tròn */}
            <div className="relative pb-10 pr-10">
              <div className="relative aspect-[4/5] w-4/5 overflow-hidden rounded-[2rem] bg-muted shadow-xl shadow-black/10">
                <Image
                  src={coverUrl(
                    places[1]?.images ?? [],
                    places[1]?.slug ?? "about-1",
                    600,
                    750,
                  )}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 40vw, 80vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 aspect-square w-1/2 overflow-hidden rounded-[2rem] border-[6px] border-background bg-muted shadow-xl shadow-black/10">
                <Image
                  src={coverUrl(
                    places[2]?.images ?? [],
                    places[2]?.slug ?? "about-2",
                    400,
                    400,
                  )}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, 40vw"
                  className="object-cover"
                />
              </div>
              {/* Badge tròn calligraphy */}
              <div className="absolute -left-3 top-4 flex size-28 flex-col items-center justify-center rounded-full bg-primary text-center text-primary-foreground shadow-lg shadow-primary/30 sm:size-32">
                <span className="font-script text-3xl leading-none sm:text-4xl">
                  100%
                </span>
                <span className="mt-1 px-3 text-[0.65rem] font-medium leading-tight">
                  Miễn phí & minh bạch
                </span>
              </div>
            </div>

            {/* Nội dung */}
            <div>
              <ScriptEyebrow>Về chúng tôi</ScriptEyebrow>
              <h2 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
                Thông tin du lịch đáng tin, cho người Việt
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Không phải sàn đặt phòng, không chạy theo hoa hồng. Chúng tôi tổng
                hợp và kiểm chứng thông tin để bạn tự tin lên đường — và tránh
                được những cú lừa cọc quen thuộc.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <TrustItem
                  icon="shield-check"
                  title="Xác minh chính chủ"
                  desc="Kênh liên hệ đã kiểm chứng, chống lừa cọc."
                />
                <TrustItem
                  icon="compass"
                  title="Cẩm nang tận nơi"
                  desc="Ăn, chơi, ở, đi lại — theo từng điểm đến."
                />
              </div>

              <Link
                href="/diem-den"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 rounded-full",
                )}
              >
                Khám phá ngay
                <Ic icon="arrow-right" className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── DẢI THỐNG KÊ ─────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="relative isolate overflow-hidden rounded-[2rem]">
            <Image
              src={
                places[3]
                  ? coverUrl(places[3].images, places[3].slug, 1600, 700)
                  : heroBg
              }
              alt=""
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="-z-10 object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-primary/75" />
            <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid grid-cols-2 gap-2 rounded-[1.75rem] bg-background/95 p-4 shadow-xl shadow-black/10 backdrop-blur sm:grid-cols-4 sm:p-6">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 text-center"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Ic icon={s.icon} className="size-5" aria-hidden />
                    </span>
                    <div className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                      {s.value.toLocaleString("vi-VN")}
                      <span className="text-primary">+</span>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-primary-foreground">
                <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary-foreground/50 text-center sm:size-28">
                  <span className="font-script text-xl leading-tight sm:text-2xl">
                    Mỗi bước
                    <br />
                    một hành
                    <br />
                    trình
                  </span>
                </div>
                <p className="max-w-[10rem] text-sm leading-relaxed text-primary-foreground/90">
                  Dữ liệu cập nhật, kiểm duyệt liên tục, phủ khắp vùng miền.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── GỢI Ý ĐIỂM ĐẾN (dải card tối) ────────────────────── */}
        {places.length >= 6 && (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionTitle
              eyebrow="Gợi ý cho bạn"
              title="Nguồn cảm hứng cho chuyến đi"
            />
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {places.slice(3, 6).map((p) => (
                <OfferCard key={p.slug} place={p} />
              ))}
            </div>
          </section>
        )}

        {/* ─── CẢM NHẬN NGƯỜI DÙNG ──────────────────────────────── */}
        <section className="bg-accent/50">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_1fr] lg:gap-16">
            {/* Ảnh trái + badge nổi */}
            <div className="relative mx-auto w-full max-w-sm">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-primary/15">
                <Image
                  src={coverUrl(
                    places[0]?.images ?? [],
                    "testimonial",
                    560,
                    700,
                  )}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-lg shadow-black/10">
                <span className="flex size-10 items-center justify-center rounded-full bg-warm/15 text-warm">
                  <Ic icon="star" className="size-5 fill-warm text-warm" aria-hidden />
                </span>
                <div>
                  <div className="text-lg font-bold leading-none">4.9/5</div>
                  <div className="text-xs text-muted-foreground">
                    từ cộng đồng
                  </div>
                </div>
              </div>
            </div>

            {/* Nội dung */}
            <div>
              <ScriptEyebrow>Người đi trước nói gì</ScriptEyebrow>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Được cộng đồng tin dùng
              </h2>
              <div className="mt-8 space-y-4">
                {TESTIMONIALS.map((t) => (
                  <TestimonialCard key={t.name} t={t} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CẨM NANG MỚI ─────────────────────────────────────── */}
        {posts.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-center sm:text-left">
                <ScriptEyebrow align="left">Cẩm nang</ScriptEyebrow>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Bài viết mới nhất
                </h2>
              </div>
              <Link
                href="/blog"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-full",
                )}
              >
                Xem tất cả
                <Ic icon="arrow-right" className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* ─── THƯ VIỆN ẢNH ─────────────────────────────────────── */}
        {galleryImgs.length >= 4 && (
          <section className="bg-accent/50">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <SectionTitle
                eyebrow="Muôn màu Việt Nam"
                title="Thư viện ảnh"
              />
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {galleryImgs.slice(0, 8).map((img, i) => (
                  <Link
                    key={img.url + i}
                    href={
                      img.place ? `/diem-den/${img.place.slug}` : "/diem-den"
                    }
                    className={cn(
                      "group relative overflow-hidden rounded-2xl bg-muted",
                      i === 0 || i === 5
                        ? "col-span-2 aspect-[2/1]"
                        : "aspect-square",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? ""}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25" />
                    <Ic icon="camera"
                      className="absolute right-3 top-3 size-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── DẢI CTA ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <CtaBanner places={places} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function ScriptEyebrow({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 font-script text-2xl font-bold text-primary",
        align === "center" && "justify-center",
      )}
    >
      <Ic icon="backpack" className="size-4 text-primary/80" aria-hidden />
      {children}
    </p>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <ScriptEyebrow>{eyebrow}</ScriptEyebrow>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

type PlaceRow = {
  slug: string;
  name: string;
  kind: "province" | "destination";
  tagline: string | null;
  description: string | null;
  provinceName: string | null;
  images: { url: string; isCover: boolean }[];
  _count: {
    spots: number;
    eateries: number;
    activities: number;
    accommodations: number;
  };
};

function PopularCard({
  place,
  featured,
}: {
  place: PlaceRow;
  featured?: boolean;
}) {
  const n = total(place);
  return (
    <Link
      href={`/diem-den/${place.slug}`}
      className={cn(
        "group flex flex-col rounded-[1.75rem] bg-card p-3 shadow-lg shadow-black/5 ring-1 ring-border/60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10",
        featured && "sm:-translate-y-5 sm:shadow-xl",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={coverUrl(place.images, place.slug, 640, 480)}
          alt={place.name}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
          {place.kind === "province" ? "Tỉnh / Thành" : "Điểm đến"}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <h3 className="text-lg font-bold tracking-tight transition-colors group-hover:text-primary">
          {place.name}
        </h3>
        {(place.tagline || place.description) && (
          <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {place.tagline ?? place.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Ic icon="map-pin" className="size-3.5 text-primary" aria-hidden />
            {place.provinceName ?? "Việt Nam"}
          </span>
          {n > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Ic icon="compass" className="size-3.5 text-primary" aria-hidden />
              {n} mục
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="font-script text-2xl font-bold text-primary">
            Khám phá
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              featured
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
            )}
          >
            Chi tiết
            <Ic icon="arrow-right" className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function TrustItem({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Ic icon={icon} className="size-5" aria-hidden />
      </span>
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}

function OfferCard({ place }: { place: PlaceRow }) {
  return (
    <Link
      href={`/diem-den/${place.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-foreground p-6 text-background shadow-lg shadow-black/10 transition-transform hover:-translate-y-1"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/20 blur-2xl"
      />
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          <Ic icon="sparkles" className="size-3" aria-hidden />
          Gợi ý
        </span>
        <div className="relative size-16 overflow-hidden rounded-2xl ring-2 ring-background/20">
          <Image
            src={coverUrl(place.images, place.slug, 160, 160)}
            alt={place.name}
            fill
            sizes="64px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>
      <h3 className="mt-6 font-script text-4xl font-bold leading-none text-background">
        {place.name}
      </h3>
      {(place.tagline || place.description) && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-background/70">
          {place.tagline ?? place.description}
        </p>
      )}
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        Khám phá điểm đến
        <Ic icon="arrow-right"
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}

type Testimonial = { name: string; role: string; quote: string; seed: string };

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Minh Anh",
    role: "Du khách · Hà Nội",
    quote:
      "Lên lịch cho chuyến Hà Giang chưa bao giờ nhẹ đầu đến thế. Ăn gì, ở đâu, đi lại ra sao đều có sẵn — khỏi lục tung mấy group Facebook.",
    seed: "avatar-minhanh",
  },
  {
    name: "Quốc Bảo",
    role: "Phượt thủ · Đà Nẵng",
    quote:
      "Phần lưu trú xác minh chính chủ cứu tôi một bàn thua trông thấy. Liên hệ đúng người, không dính cọc lừa như lần trước.",
    seed: "avatar-quocbao",
  },
];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="relative rounded-3xl bg-card p-6 shadow-lg shadow-black/5 ring-1 ring-border/60">
      <Ic icon="quote"
        className="absolute right-6 top-6 size-8 text-primary/15"
        aria-hidden
      />
      <div className="flex items-center gap-3">
        <Image
          src={`https://picsum.photos/seed/${t.seed}/80/80`}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-full object-cover"
        />
        <div>
          <div className="text-sm font-semibold tracking-tight">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-0.5" aria-label="5 trên 5 sao">
        {Array.from({ length: 5 }).map((_, i) => (
          <Ic icon="star" key={i} className="size-4 fill-warm text-warm" aria-hidden />
        ))}
      </div>
      <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">
        “{t.quote}”
      </blockquote>
    </figure>
  );
}

type PostData = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  author: { name: string | null } | null;
  images: { url: string; isCover: boolean }[];
  _count: { likes: number; comments: number };
};

function PostCard({ post }: { post: PostData }) {
  const date = post.publishedAt ?? post.createdAt;
  const [day, month] = dateFmt.format(date).split(" ");
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-muted shadow-sm shadow-black/5">
        <Image
          src={coverUrl(post.images, post.slug, 640, 400)}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex flex-col items-center rounded-2xl bg-primary px-3 py-2 text-center text-primary-foreground shadow-lg shadow-primary/25">
          <span className="text-lg font-extrabold leading-none">{day}</span>
          <span className="text-[0.65rem] font-medium uppercase">{month}</span>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Ic icon="badge-check" className="size-3.5 text-primary" aria-hidden />
            {post.author?.name ?? "Ban biên tập"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Ic icon="message-circle" className="size-3.5" aria-hidden />
            {post._count.comments} bình luận
          </span>
        </div>
        {post.category && (
          <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-wide text-primary">
            {label(POST_CATEGORY_LABELS, post.category)}
          </span>
        )}
        <h3 className="mt-1 text-lg font-bold tracking-tight line-clamp-2 transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Đọc thêm
          <Ic icon="arrow-right"
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}

function CtaBanner({ places }: { places: PlaceRow[] }) {
  const shots = places.slice(0, 3);
  return (
    <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-primary px-6 py-14 text-primary-foreground sm:px-14 sm:py-20">
      {/* Vòng tròn đồng tâm */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full border border-primary-foreground/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full border border-primary-foreground/10"
      />
      {/* Đường bay nét đứt + máy bay */}
      <svg
        aria-hidden
        viewBox="0 0 400 120"
        className="pointer-events-none absolute inset-x-0 top-6 mx-auto hidden h-24 w-full max-w-2xl text-primary-foreground/40 sm:block"
      >
        <path
          d="M20 90 Q 200 -10 380 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
      </svg>
      {/* Skyline silhouette */}
      <svg
        aria-hidden
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-primary-foreground/10"
      >
        <path
          fill="currentColor"
          d="M0 120 V70 h40 v-20 h30 v20 h25 v-35 h20 v35 h35 v-50 h15 v50 h40 v-25 h30 v25 h45 v-40 h18 v40 h38 v-60 h14 v60 h42 v-30 h28 v30 h40 v-45 h16 v45 h44 v-22 h26 v22 h48 v-55 h14 v55 h40 v-30 h30 v30 h40 v-40 h18 v40 h40 v-24 h28 v24 h44 V120 Z"
        />
      </svg>

      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Ic icon="sparkles" className="size-3" aria-hidden />
            100% miễn phí
          </span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
            Bắt đầu hành trình chỉ với một cú nhấp
          </h2>
          <p className="mt-4 text-primary-foreground/85">
            Chọn một điểm đến và để chúng tôi lo phần còn lại — từ ăn chơi đến
            lưu trú, đi lại.
          </p>
          <Link
            href="/diem-den"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
          >
            Khám phá điểm đến
            <Ic icon="arrow-right" className="size-4" aria-hidden />
          </Link>
        </div>

        {/* Cụm ảnh tròn chồng lớp */}
        {shots.length > 0 && (
          <div className="relative hidden h-44 w-44 shrink-0 lg:block">
            {shots.map((p, i) => (
              <div
                key={p.slug}
                className={cn(
                  "absolute overflow-hidden rounded-full border-4 border-primary shadow-xl",
                  i === 0 && "left-0 top-4 size-28",
                  i === 1 && "right-0 top-0 size-20",
                  i === 2 && "bottom-0 right-6 size-24",
                )}
              >
                <Image
                  src={coverUrl(p.images, p.slug, 160, 160)}
                  alt={p.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
