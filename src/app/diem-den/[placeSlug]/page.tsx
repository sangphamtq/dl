import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Ic } from "@/components/icon";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { PlaceAboutVideo } from "@/components/site/place-about-video";
import {
  SPOT_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { SectionHeading } from "@/components/site/section-heading";
import { SpotShowcase } from "@/components/site/spot-showcase";
import { Rail } from "@/components/site/rail";
import { CommunityPreview } from "@/components/site/community-preview";
import { getFeed } from "@/lib/community-feed";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceHeroExplore } from "@/components/site/place-hero-explore";
import { PlaceHeroSwitch } from "@/components/site/place-hero-switch";
import { PlaceTabs } from "@/components/site/place-tabs";
import { ReviewsSection, type ReviewListItem } from "@/components/site/place-reviews";
import { summarizeReviews } from "@/lib/review-meta";
import { PeerBar } from "@/components/site/peer-bar";
import { getDestinationPeerGroups } from "@/lib/peers";
import {
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
  buildHeroImages,
  resolveVideos,
  getVisitors,
} from "@/lib/place-meta";

const pub = { status: "published" as const };

// Card trải nghiệm — ảnh trên (khung 4:3), tên + fact (thời lượng · mùa) bên
// dưới. Sạch, không phủ gradient — chữ đọc trên nền, không "ảnh tối".
function ExperienceCard({
  href,
  name,
  slug,
  images,
  facts,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  facts: { icon: string; text: string }[];
}) {
  const duration = facts.find((f) => f.icon === "clock");
  const season = facts.find((f) => f.icon === "calendar");
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 80vw"
          className="object-cover"
        />
        {duration && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium">
            <Ic icon="clock" className="size-3 text-primary" aria-hidden />
            {duration.text}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold tracking-tight transition-colors group-hover:text-primary">
        {name}
      </h3>
      {season && (
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Ic icon="calendar" className="size-3.5 shrink-0" aria-hidden />
          {season.text}
        </p>
      )}
    </Link>
  );
}

// Card đặc sản — gallery ảnh vuông, tên phủ lên đáy ("ăn ảnh").
function SpecialtyCard({
  href,
  name,
  slug,
  images,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 40vw"
          className="object-cover"
        />
      </div>
      <h3 className="mt-2.5 text-sm font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
        {name}
      </h3>
    </Link>
  );
}

// Card lưu trú — ảnh + tên + loại hình + huy hiệu đã xác minh (danh bạ chính chủ).
function StayCard({
  href,
  name,
  slug,
  images,
  category,
  isVerified,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  category: string | null;
  isVerified: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
          className="object-cover"
        />
        {isVerified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/90 px-2.5 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Ic icon="badge-check" className="size-3.5" aria-hidden />
            Đã xác minh
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
          {name}
        </h3>
        {category && (
          <p className="mt-1 text-sm text-muted-foreground">{category}</p>
        )}
      </div>
    </Link>
  );
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
    title: `${place.name} · Halivivu`,
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
      quickInfo: true,
      isFeatured: true,
      viewCount: true,
      provinceName: true,
      parentId: true,
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
          tagline: true,
          description: true,
          category: true,
          wardName: true,
          districtName: true,
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
        take: 4,
        select: {
          slug: true,
          name: true,
          category: true,
          isVerified: true,
          images: listingImages,
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

  // Trạng thái check-in "đã đến" của user hiện tại + tổng số người đã đến.
  const session = await auth();
  const userId = session?.user?.id;
  const [checkInRow, visitors] = await Promise.all([
    userId
      ? prisma.checkIn.findUnique({
          where: { userId_placeId: { userId, placeId: place.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    getVisitors("place", place.id),
  ]);
  const checkIn = { checked: !!checkInRow, isAuthed: !!userId };

  // Đánh giá (chỉ điểm đến lớn): tổng hợp review đang hiện + review của chính user.
  const isDestination = place.kind === "destination";
  const [reviewRows, myReviewRow] = isDestination
    ? await Promise.all([
        prisma.review.findMany({
          // Chỉ hiện review khi tác giả HIỆN còn đánh dấu đã đến nơi này (bỏ đánh
          // dấu → tự ẩn & không tính vào tổng hợp; đánh dấu lại → tự hiện).
          where: {
            placeId: place.id,
            isHidden: false,
            author: { checkIns: { some: { placeId: place.id } } },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            stance: true,
            highlights: true,
            caveats: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true, image: true } },
          },
        }),
        userId
          ? prisma.review.findUnique({
              where: {
                placeId_authorId: { placeId: place.id, authorId: userId },
              },
              select: {
                stance: true,
                highlights: true,
                caveats: true,
                content: true,
              },
            })
          : Promise.resolve(null),
      ])
    : [[], null];
  const reviewSummary = summarizeReviews(reviewRows);
  const reviewItems: ReviewListItem[] = reviewRows.map((r) => ({
    id: r.id,
    author: r.author,
    stance: r.stance,
    highlights: r.highlights,
    caveats: r.caveats,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    isMine: r.author.id === userId,
  }));

  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount);
  const tabs = buildPlaceTabs(place.slug, counts);
  const heroReviews =
    isDestination && reviewSummary.total > 0
      ? { stars: reviewSummary.stars, total: reviewSummary.total }
      : undefined;

  // Vài thảo luận cộng đồng mới nhất về điểm đến này (xem trước).
  const communityPosts = (
    await getFeed({
      placeId: place.id,
      take: 3,
      sort: "active",
      currentUserId: userId ?? null,
    })
  ).posts;

  // Thanh chuyển nhanh: mọi điểm đến lớn gom theo miền (làm nổi cái đang xem).
  const peerGroups = await getDestinationPeerGroups();

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
  // Hero (giữ nguyên trên mọi tab — xem buildHeroImages): ảnh điểm đến + ảnh bìa
  // địa điểm con (điểm đến con nếu là tỉnh + spot), khử trùng URL.
  const heroImages = buildHeroImages(
    place.images,
    place.children,
    place.spots,
    place.slug,
    place.name,
  );

  const showChildren = isProvince && place.children.length > 0;

  // Không có mục con nào để liệt kê → hiện trạng thái rỗng thân thiện.
  const hasAnyContent =
    place.children.length > 0 ||
    place.spots.length > 0 ||
    place.activities.length > 0 ||
    place.specialties.length > 0 ||
    place.accommodations.length > 0 ||
    counts.transport > 0;

  const videos = await resolveVideos(place.videos);

  // "Thông tin chung": danh sách {label, value} biên tập trong CMS.
  const quickFacts =
    (place.quickInfo as { label: string; value: string }[] | null) ?? [];

  // Câu đầu mô tả tách ra làm lede (phóng to), phần còn lại là thân bài.
  const [lede, descBody] = splitLede(place.description);

  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker
        placeId={place.id}
        name={place.name}
        provinceName={place.provinceName}
      />
      <SiteHeader />

      <main className="flex-1">
        <PlaceHeroSwitch
          classic={
            <PlaceHero
              place={place}
              heroImages={heroImages}
              stats={stats}
              back={{ href: "/diem-den", label: "Điểm đến" }}
              checkIn={checkIn}
              visitors={visitors}
              reviews={heroReviews}
            />
          }
          bento={
            <PlaceHeroExplore
              place={place}
              heroImages={heroImages}
              counts={counts}
              videos={videos}
              facts={quickFacts}
              back={{ href: "/diem-den", label: "Điểm đến" }}
              checkIn={checkIn}
              visitors={visitors}
              reviews={heroReviews}
            />
          }
        />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing + nút Video */}
        <PlaceTabs items={tabs} />

        <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:space-y-20 sm:px-6 sm:py-20">
          {/* Đôi nét — nhịp editorial: lede phóng to → thân bài 2 cột báo chí →
              hàng tag + bài giới thiệu → hàng fact kẻ mảnh. Hero phía trên đã rất
              đậm (ảnh, số liệu, video) và ngay dưới là băng ảnh "Địa điểm đáng
              ghé", nên mục này cố tình sạch, không card/bóng để làm quãng nghỉ. */}
          {(place.description || quickFacts.length > 0) && (
            <section id="doi-net" className="scroll-mt-32">
              {/* KHÔNG có SectionHeading: đây là mục mở đầu, ngay dưới hero đã
                  có tên điểm đến cỡ lớn và thanh tab "Tổng quan" — thêm một
                  nhãn nữa chỉ là tầng chữ thứ ba nói cùng một chuyện. Lede cỡ
                  lớn tự đóng vai mở màn. Các section sau vẫn giữ heading vì
                  chúng cần được phân biệt với nhau.
                  Cột phải (24rem) vì media chính là video TikTok khổ dọc: bề
                  rộng cột chính là thứ khống chế chiều cao 9/16 của nó.
                  "Thông tin chung" nằm TRONG cột trái chứ không thành hàng
                  riêng bên dưới: chữ không thôi thì thấp hơn video một quãng,
                  gom vào đây vừa lấp đúng chỗ trống vừa bớt một tầng cho mục. */}
              <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-14">
                <div>
                  {lede && (
                    // Drop cap thay cho tiêu đề đã bỏ — báo hiệu điểm mở đầu
                    // bằng chính chữ, không thêm hoạ tiết.
                    // `leading-[0.85]` + `mt-1`: chừa chỗ cho dấu tiếng Việt khi
                    // chữ đầu là Ở/Ấ/Đ… (leading quá chặt sẽ ăn mất dấu).
                    // Bỏ `text-balance` vì cân dòng đá nhau với chữ float.
                    <p className="text-xl font-medium leading-relaxed text-foreground first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[3.25rem] first-letter:font-semibold first-letter:leading-[0.85] sm:text-2xl sm:leading-relaxed sm:first-letter:text-[4rem]">
                      {lede}
                    </p>
                  )}
                  {descBody && (
                    <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">
                      {descBody}
                    </p>
                  )}
                  {/* Bài giới thiệu đặt NGAY DƯỚI mô tả (trước khối Thông tin
                      chung): nó là phần đọc tiếp của mạch chữ, còn Thông tin
                      chung là dữ kiện tra cứu — để xen vào giữa thì đứt mạch.
                      Bỏ dạng viên thuốc bo tròn + ảnh tròn: mục này giờ toàn
                      chữ và đường kẻ mảnh, một viên nền xám nổi lên giữa đó
                      lạc hệ. Thay bằng một hàng phẳng, ảnh chữ nhật bo nhẹ. */}
                  {introPost && (
                    <Link
                      href={`/blog/${introPost.slug}`}
                      className="group mt-6 flex items-center gap-4"
                    >
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={coverUrl(
                            introPost.images,
                            introPost.slug,
                            160,
                            160,
                          )}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Bài giới thiệu
                        </span>
                        <span className="mt-0.5 block line-clamp-2 font-semibold leading-6 text-foreground decoration-primary/40 underline-offset-4 transition-colors group-hover:text-primary group-hover:underline">
                          {introPost.title}
                        </span>
                      </span>
                      <Ic
                        icon="arrow-right"
                        className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </Link>
                  )}
                  {quickFacts.length > 0 && <QuickInfo facts={quickFacts} />}
                </div>
                {videos.length > 0 ? (
                  <PlaceAboutVideo videos={videos} placeName={place.name} />
                ) : (
                  <AboutMedia
                    images={heroImages}
                    slug={place.slug}
                    name={place.name}
                  />
                )}
              </div>
            </section>
          )}


          {/* Điểm đến con (chỉ tỉnh) — lưới (là Place, cấp khác) */}
          {showChildren && (
            <section id="diem-den-con" className="scroll-mt-32">
              <SectionHeading eyebrow="Khám phá" title={`Điểm đến tại ${place.name}`} />
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Tham quan (Spot) — band full-width (ngoài container) */}
        {place.spots.length > 0 && (
          <section id="tham-quan" className="scroll-mt-32">
            <SpotShowcase
              title="Địa điểm đáng ghé"
              eyebrow="Tham quan"
              count={counts.spot}
              allHref={`/diem-den/${place.slug}/dia-diem`}
              spots={place.spots.map((s) => ({
                slug: s.slug,
                name: s.name,
                category: s.category
                  ? label(SPOT_CATEGORY_LABELS, s.category)
                  : null,
                location: s.wardName ?? s.districtName ?? null,
                image: coverUrl(s.images, s.slug),
                description: s.description ?? s.tagline,
              }))}
            />
          </section>
        )}

        <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:space-y-20 sm:px-6 sm:py-20">
          {/* Trải nghiệm — rail card sạch */}
          {place.activities.length > 0 && (
            <section id="trai-nghiem" className="scroll-mt-32">
              <SectionHeading
                eyebrow="Trải nghiệm"
                title="Trải nghiệm nổi bật"
                href={`/diem-den/${place.slug}/hoat-dong`}
                count={counts.activity}
                unit="trải nghiệm"
              />
              <div className="mt-6">
                <Rail itemClassName="basis-4/5 sm:basis-2/5 lg:basis-1/4">
                  {place.activities.map((a) => (
                    <ExperienceCard
                      key={a.slug}
                      href={`/hoat-dong/${a.slug}`}
                      name={a.name}
                      slug={a.slug}
                      images={a.images}
                      facts={[
                        a.durationText && { icon: "clock", text: a.durationText },
                        a.seasonText && {
                          icon: "calendar",
                          text: a.seasonText,
                        },
                      ].filter(
                        (x): x is { icon: string; text: string } => Boolean(x),
                      )}
                    />
                  ))}
                </Rail>
              </div>
            </section>
          )}

          {/* Ẩm thực (đặc sản) — rail card nhỏ */}
          {place.specialties.length > 0 && (
            <section id="am-thuc" className="scroll-mt-32">
              <SectionHeading
                eyebrow="Ẩm thực"
                title="Đặc sản địa phương"
                href={`/diem-den/${place.slug}/am-thuc`}
                count={counts.specialty + counts.eatery}
                unit="món"
              />
              <Rail itemClassName="basis-2/5 sm:basis-1/4 lg:basis-1/5">
                {place.specialties.map((sp) => (
                  <SpecialtyCard
                    key={sp.slug}
                    href={`/diem-den/${place.slug}/am-thuc#specialty-${sp.slug}`}
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
            <section id="luu-tru" className="scroll-mt-32">
              <SectionHeading
                eyebrow="Nghỉ ngơi"
                title="Nơi lưu trú"
                href={`/diem-den/${place.slug}/luu-tru`}
                count={counts.accommodation}
                unit="chỗ ở"
              />
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.accommodations.map((ac) => (
                  <StayCard
                    key={ac.slug}
                    href={`/luu-tru/${ac.slug}`}
                    name={ac.name}
                    slug={ac.slug}
                    images={ac.images}
                    category={
                      ac.category
                        ? label(ACCOMMODATION_CATEGORY_LABELS, ac.category)
                        : null
                    }
                    isVerified={ac.isVerified}
                  />
                ))}
              </div>
            </section>
          )}

          {!hasAnyContent && (
            <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
              <Ic
                icon="compass"
                className="mx-auto size-10 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-3 font-medium">Nội dung đang được cập nhật</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Điểm đến này chưa có địa điểm, trải nghiệm hay nơi lưu trú nào — quay
                lại sau nhé.
              </p>
            </div>
          )}

          {/* Hỏi đáp cộng đồng — xem trước vài thảo luận */}
          {communityPosts.length > 0 && (
            <section id="hoi-dap" className="scroll-mt-32">
              <SectionHeading
                eyebrow="Cộng đồng"
                title="Hỏi đáp cộng đồng"
                href={`/diem-den/${place.slug}/cong-dong`}
                count={communityPosts.length}
                unit="thảo luận"
              />
              <CommunityPreview posts={communityPosts} />
            </section>
          )}

          {/* Đánh giá của Vivu-er (chỉ điểm đến lớn) */}
          {isDestination && (
            <ReviewsSection
              target={{
                kind: "place",
                id: place.id,
                slug: place.slug,
                name: place.name,
                image: coverUrl(place.images, place.slug, 96, 96),
              }}
              summary={reviewSummary}
              reviews={reviewItems}
              myReview={myReviewRow}
              isAuthed={checkIn.isAuthed}
            />
          )}
        </div>

        {/* Cẩm nang */}
        <RelatedPosts type="place" id={place.id} />
      </main>

      <SiteFooter />
      <PeerBar
        groups={peerGroups}
        currentSlug={place.slug}
        prefix="diem-den"
        title="Điểm đến"
      />
    </div>
  );
}


/* ── Tách câu đầu của mô tả làm lede (đoạn dẫn phóng to) ────────────
   Ngắt ở dấu kết câu + khoảng trắng + chữ HOA kế tiếp, nên "2.000m" hay
   "1.600m" (dấu chấm phân cách hàng nghìn kiểu Việt) không bị hiểu là hết câu.
   Câu đầu quá ngắn hoặc quá dài thì bỏ qua, trả nguyên văn về thân bài. */
function splitLede(text: string | null): [string | null, string | null] {
  if (!text) return [null, null];
  const m = text.match(/^([\s\S]+?[.!?…])\s+(?=[\p{Lu}"'"“„])/u);
  const first = m?.[1];
  if (!first || first.length < 40 || first.length > 320) return [null, text];
  return [first, text.slice(m[0].length) || null];
}

/* ── Cụm ảnh của mục Đôi nét (dùng khi Place chưa có video) ───────────
   Ảnh lớn + một ảnh vuông chồng lấn ở góc. Ảnh nhỏ nằm TRONG khung ảnh lớn
   (inset dương) chứ không tràn ra ngoài — offset âm ở cột phải dễ sinh cuộn
   ngang trên mobile. Thiếu ảnh thì mỗi ô lấy một seed placeholder khác nhau
   để không lặp lại cùng một tấm; upload ảnh thật vào Place là tự thay. */
function AboutMedia({
  images,
  slug,
  name,
}: {
  images: { url: string; alt?: string | null }[];
  slug: string;
  name: string;
}) {
  const big = images[0] ?? { url: coverUrl([], `${slug}-doi-net`, 900, 1100) };
  const small = images[1];
  return (
    <div className="mx-auto w-full max-w-[15rem] space-y-3 lg:max-w-none">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-lg shadow-black/10">
        <Image
          src={big.url}
          alt={big.alt || name}
          fill
          sizes="(min-width: 1024px) 16rem, 15rem"
          className="object-cover"
        />
      </div>
      {small && (
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={small.url}
            alt={small.alt || name}
            fill
            sizes="(min-width: 1024px) 16rem, 15rem"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}

/* ── "Thông tin chung" trong cột trái của mục Đôi nét (nội dung từ CMS)
   Kẻ mảnh, không card/bóng: hero phía trên và băng ảnh phía dưới đã đủ đậm.
   Luôn 2 cột — đặt dưới phần chữ trong cột trái nên không đủ rộng cho 4.
   Đường kẻ dọc tính theo chỉ số thay vì nth-child: ô mở đầu mỗi hàng (chỉ số
   chẵn) không có kẻ trái, ô còn lại thì có. */
function QuickInfo({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="mt-7 grid grid-cols-2 gap-y-5 border-y border-border/60 py-6">
      {facts.map((f, i) => (
        <div
          key={i}
          className={cn(
            "border-border/60 pr-5",
            i % 2 === 0 ? "" : "border-l pl-5",
          )}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {f.label}
          </dt>
          <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-foreground">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

