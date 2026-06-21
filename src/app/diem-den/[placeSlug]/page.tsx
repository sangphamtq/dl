import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import {
  SPOT_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { parseTicketTiers, formatVnd } from "@/lib/tickets";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { ListingCard } from "@/components/site/listing-card";
import { Rail } from "@/components/site/rail";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";
import { type HeroImage } from "@/components/site/place-hero-stack";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import { TransportSection } from "@/components/site/transport-section";
import { getTikTokInfo } from "@/lib/tiktok";
import {
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
} from "@/lib/place-meta";

const pub = { status: "published" as const };

// Nhãn giá hoạt động lấy từ ticketFree / ticketTiers (KHÔNG dùng priceRange cũ).
function activityPriceBadge(
  ticketFree: boolean,
  ticketTiers: unknown,
): string | null {
  if (ticketFree) return "Miễn phí";
  const prices = parseTicketTiers(ticketTiers)
    .map((t) => t.price)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  return `Từ ${formatVnd(Math.min(...prices))}`;
}
const listingImages = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true, description: true, status: true },
  });
  if (!place || place.status !== "published") return {};
  return {
    title: `${place.name} · Hành Trình Việt`,
    description: place.description ?? undefined,
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;

  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      status: true,
      tagline: true,
      description: true,
      tags: true,
      isFeatured: true,
      viewCount: true,
      provinceName: true,
      parent: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, caption: true, isCover: true },
      },
      children: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          kind: true,
          description: true,
          images: listingImages,
        },
      },
      activities: {
        // 'spot' = đặc trưng nhỏ chỉ ở 1 spot → không hiện ở cấp điểm đến.
        where: { ...pub, kind: { not: "spot" } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: {
          slug: true,
          name: true,
          description: true,
          durationText: true,
          seasonText: true,
          ticketFree: true,
          ticketTiers: true,
          images: listingImages,
        },
      },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: {
          slug: true,
          name: true,
          description: true,
          category: true,
          tags: true,
          images: listingImages,
        },
      },
      specialties: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          slug: true,
          name: true,
          images: listingImages,
        },
      },
      accommodations: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          slug: true,
          name: true,
          category: true,
          description: true,
          images: listingImages,
        },
      },
      transports: {
        where: pub,
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          direction: true,
          mode: true,
          fromName: true,
          duration: true,
          description: true,
        },
      },
      videos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { videoId: true, caption: true },
      },
    },
  });

  const staff = await isStaffViewer();
  if (!place || (place.status !== "published" && !staff)) notFound();

  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount, counts);
  const tabs = buildPlaceTabs(place.slug, counts);

  // Bài giới thiệu: post (đã xuất bản) nổi bật/mới nhất gắn với điểm đến này.
  const introPost = await prisma.post.findFirst({
    where: { status: "published", refs: { some: { placeId: place.id } } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true,
      title: true,
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
    },
  });

  const isProvince = place.kind === "province";
  // Hero: ảnh của điểm đến trước, rồi nối ảnh bìa các "địa điểm con"
  // (điểm đến con nếu là tỉnh + spot), chỉ lấy ảnh thật, khử trùng URL.
  const heroImages: HeroImage[] = place.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: i.caption,
  }));
  // Ảnh bìa các "địa điểm con" — caption = tên, click sang đúng trang địa điểm đó.
  const childCovers: HeroImage[] = [
    ...place.children.map((c) => ({
      cover: c.images[0],
      name: c.name,
      href: `/diem-den/${c.slug}`,
    })),
    ...place.spots.map((s) => ({
      cover: s.images[0],
      name: s.name,
      href: `/dia-diem/${s.slug}`,
    })),
  ]
    .filter((c) => c.cover?.url)
    .map((c) => ({
      url: c.cover!.url,
      alt: c.name,
      caption: c.name,
      href: c.href,
    }));
  const seenUrls = new Set(heroImages.map((i) => i.url));
  for (const c of childCovers) {
    if (!seenUrls.has(c.url)) {
      heroImages.push(c);
      seenUrls.add(c.url);
    }
  }
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], place.slug, 1600, 1000), alt: place.name });
  }

  const showChildren = isProvince && place.children.length > 0;

  const videoSeed = place.videos.map((v) => ({
    id: v.videoId,
    caption: v.caption ?? undefined,
  }));
  // Lấy thumbnail thật qua oEmbed (dedupe theo id, cache trong helper).
  const thumbById = new Map<string, string | null>();
  await Promise.all(
    [...new Set(videoSeed.map((v) => v.id))].map(async (id) => {
      thumbById.set(id, (await getTikTokInfo(id)).thumbnail);
    }),
  );
  const videos = videoSeed.map((v) => ({
    ...v,
    thumbnail: thumbById.get(v.id) ?? null,
  }));

  // Đánh số section theo thứ tự xuất hiện (mục nào có dữ liệu mới được tính).
  const sectionNum: Record<string, string> = {};
  let nseq = 0;
  const numFor = (present: boolean, key: string) => {
    if (present) sectionNum[key] = String(++nseq).padStart(2, "0");
  };
  numFor(showChildren, "children");
  numFor(place.spots.length > 0, "spots");
  numFor(place.activities.length > 0, "activities");
  numFor(place.specialties.length > 0, "specialties");
  numFor(place.accommodations.length > 0, "accommodations");
  numFor(place.transports.length > 0, "transports");


  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker placeId={place.id} />
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero
          place={place}
          heroImages={heroImages}
          stats={stats}
          videos={videos}
          back={{ href: "/diem-den", label: "Điểm đến" }}
        />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing + nút Video */}
        <PlaceTabs items={tabs} videos={videos} placeName={place.name} />

        <div className="mx-auto max-w-7xl divide-y divide-border/60 px-4 py-14 sm:px-6 sm:py-20">
          {/* Đôi nét */}
          {place.description && (
            <section id="doi-net" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Giới thiệu
              </p>
              <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_16rem] lg:gap-14">
                <div className="max-w-prose">
                  <p className="whitespace-pre-line leading-8 text-foreground/90">
                    {place.description}
                  </p>
                  {place.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {place.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {introPost && (
                    <Link
                      href={`/blog/${introPost.slug}`}
                      className="group mt-6 inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-4 text-sm shadow-sm shadow-black/5 transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={coverUrl(introPost.images, introPost.slug, 96, 96)}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-muted-foreground">
                          Bài giới thiệu
                        </span>
                        <span className="block truncate font-medium">
                          {introPost.title}
                        </span>
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </Link>
                  )}
                </div>
                <QuickInfo />
              </div>
            </section>
          )}

          {/* Điểm đến con (chỉ tỉnh) — lưới (là Place, cấp khác) */}
          {showChildren && (
            <section id="diem-den-con" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <SectionHeading
                num={sectionNum.children}
                eyebrow="Điểm đến"
                title={`Điểm đến tại ${place.name}`}
              />
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}

          {/* Tham quan (Spot) — rail */}
          {place.spots.length > 0 && (
            <section id="tham-quan" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <SectionHeading
                num={sectionNum.spots}
                eyebrow="Địa điểm"
                title="Địa điểm đáng ghé"
                description="Hang động kỳ ảo, đảo đá vịnh ngọc, di tích lịch sử — mảnh ghép của bạn."
                href={`/diem-den/${place.slug}/dia-diem`}
                count={counts.spot}
              />
              <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                {place.spots.map((s) => (
                  <ListingCard
                    key={s.slug}
                    href={`/dia-diem/${s.slug}`}
                    name={s.name}
                    slug={s.slug}
                    images={s.images}
                    subtitle={s.description}
                    tag={s.category ? label(SPOT_CATEGORY_LABELS, s.category) : null}
                    meta={s.tags[0] ? [s.tags[0]] : []}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* Trải nghiệm — rail cuộn ngang */}
          {place.activities.length > 0 && (
            <section id="trai-nghiem" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <SectionHeading
                num={sectionNum.activities}
                eyebrow="Trải nghiệm"
                title="Trải nghiệm không thể bỏ lỡ"
                description="Từ mạo hiểm gây cấn đến thư giãn nhẹ nhàng — chọn trải nghiệm hợp gu bạn."
                href={`/diem-den/${place.slug}/hoat-dong`}
                count={counts.activity}
              />
              <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                {place.activities.map((a) => (
                  <ListingCard
                    key={a.slug}
                    href={`/hoat-dong/${a.slug}`}
                    name={a.name}
                    slug={a.slug}
                    images={a.images}
                    subtitle={a.description}
                    meta={[a.durationText, a.seasonText].filter(
                      (x): x is string => Boolean(x),
                    )}
                    price={activityPriceBadge(a.ticketFree, a.ticketTiers)}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* Ẩm thực (đặc sản) — rail card nhỏ */}
          {place.specialties.length > 0 && (
            <section id="am-thuc" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <SectionHeading
                num={sectionNum.specialties}
                eyebrow="Ẩm thực"
                title="Đặc sản nên thử"
                description="Hương vị bản địa khó quên — gợi ý món & nơi thưởng thức."
                href={`/diem-den/${place.slug}/am-thuc`}
                count={counts.specialty + counts.eatery}
              />
              <Rail itemClassName="basis-1/3 sm:basis-1/4 lg:basis-1/6">
                {place.specialties.map((sp) => (
                  <ListingCard
                    key={sp.slug}
                    href={`/dac-san/${sp.slug}`}
                    name={sp.name}
                    slug={sp.slug}
                    images={sp.images}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* Lưu trú — rail */}
          {place.accommodations.length > 0 && (
            <section id="luu-tru" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <SectionHeading
                num={sectionNum.accommodations}
                eyebrow="Lưu trú"
                title="Chỗ nghỉ gợi ý"
                description="Resort sang trọng hay homestay ấm cúng — chọn nơi dừng chân hợp túi tiền."
                href={`/diem-den/${place.slug}/luu-tru`}
                count={counts.accommodation}
              />
              <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                {place.accommodations.map((ac) => (
                  <ListingCard
                    key={ac.slug}
                    href={`/luu-tru/${ac.slug}`}
                    name={ac.name}
                    slug={ac.slug}
                    images={ac.images}
                    subtitle={ac.description}
                    tag={ac.category ? label(ACCOMMODATION_CATEGORY_LABELS, ac.category) : null}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* Di chuyển — lưới (hướng dẫn, không phải rail) */}
          {place.transports.length > 0 && (
            <section id="di-chuyen" className="scroll-mt-32 py-10 first:pt-0 last:pb-0">
              <SectionHeading
                num={sectionNum.transports}
                eyebrow="Di chuyển"
                title="Đi lại thế nào?"
              />
              <TransportSection transports={place.transports} />
            </section>
          )}
        </div>

        {/* Cẩm nang */}
        <RelatedPosts type="place" id={place.id} />
      </main>

      <SiteFooter />
    </div>
  );
}


/* ── Bảng "Trước khi đi" cạnh đoạn Giới thiệu ────────────────────── */
// TODO: tạm để cứng cho preview — sau bổ sung field vào Place (bestSeason,
// idealDays, weather, distanceText, budgetText) rồi đọc từ DB.
function QuickInfo() {
  const facts = [
    { label: "Thời điểm đẹp", value: "Tháng 11 – tháng 4" },
    { label: "Nên đi", value: "2 – 3 ngày" },
    { label: "Thời tiết", value: "Nắng ấm, khô ráo" },
    { label: "Cách TP.HCM", value: "≈ 200 km" },
    { label: "Chi phí / ngày", value: "1 – 2 triệu" },
  ];

  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Trước khi đi
      </p>
      <dl className="mt-3 divide-y divide-border/60 border-y border-border/60">
        {facts.map((f) => (
          <div
            key={f.label}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className="text-right text-sm font-semibold tracking-tight">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

/* ── Tiêu đề section ────────────────────────────────────────────── */
function SectionHeading({
  num,
  eyebrow,
  title,
  description,
  href,
  count,
}: {
  num: string;
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  count?: number;
}) {
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] tabular-nums">
              {num}
            </span>
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Xem tất cả
            {count != null && (
              <span className="tabular-nums text-primary/70">({count})</span>
            )}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {description && (
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      )}
    </>
  );
}
