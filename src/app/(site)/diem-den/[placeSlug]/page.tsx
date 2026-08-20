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
  ACTIVITY_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { SectionHeading } from "@/components/site/section-heading";
import { SpotSpotlight } from "@/components/site/spot-spotlight";
import { ExperienceGrid } from "@/components/site/experience-grid";
import { FoodMenu } from "@/components/site/food-menu";
import { StayDirectory } from "@/components/site/stay-directory";
import { CommunityPreview } from "@/components/site/community-preview";
import { getPlaceCommunityDigest } from "@/lib/community-feed";
import { getSettings } from "@/lib/settings";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceHeroCenter } from "@/components/site/place-hero-center";
import { PlaceTabs } from "@/components/site/place-tabs";
import { ReviewsSection, type ReviewListItem } from "@/components/site/place-reviews";
import { summarizeReviews } from "@/lib/review-meta";
import { PeerBar } from "@/components/site/peer-bar";
import { PlainProse } from "@/components/site/plain-prose";
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

// Dải nội dung của trang. Trang này trước đây là 9 khối TRẮNG liên tiếp nên cuộn
// một hồi là mất phương hướng — không biết đang ở mục thứ mấy, cũng không có gì
// dừng mắt lại. `tint` cho một dải nền `muted` rất nhạt; xen kẽ trắng/nhạt tạo
// nhịp mà không cần thêm viền, bóng hay hoạ tiết nào.
//
// Nền đặt trên MỘT dải tràn hết bề ngang, container nằm bên trong — không phải
// nền của riêng khối nội dung: nền chỉ rộng bằng nội dung thì đọc ra là một cái
// thẻ khổng lồ, không phải một chương của trang.
//
// `bleed`: khối tự dựng container riêng (dải Địa điểm cần ảnh tràn mép) → chỉ
// bọc nền, không bọc container.
function Band({
  tint,
  bleed,
  children,
}: {
  tint?: boolean;
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={tint ? "bg-muted/60" : undefined}>
      {bleed ? (
        children
      ) : (
        <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:space-y-20 sm:px-6 sm:py-20">
          {children}
        </div>
      )}
    </div>
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

// Cờ TẠM ẨN phần Cộng đồng trên trang điểm đến (cùng đợt gỡ khỏi header và
// thanh tab). Khai báo kiểu `boolean` chứ KHÔNG để TS suy ra literal `false`:
// literal khiến TS coi nhánh JSX bên trong là không chạm tới được, và mọi thu
// hẹp kiểu (vd `place` đã qua `notFound()`) không còn hiệu lực trong đó.
const COMMUNITY_ENABLED: boolean = false;

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
        // 4 = một hàng bốn thẻ ở lg (xem ExperienceGrid); còn lại đi qua link
        // "Xem tất cả".
        take: 4,
        select: {
          slug: true,
          name: true,
          description: true,
          category: true,
          durationText: true,
          seasonText: true,
          images: listingImages,
          // "Diễn ra ở" — hai spot đầu để in tên thật, cộng tổng số cho "+N".
          spotLinks: {
            take: 2,
            orderBy: { order: "asc" },
            select: { spot: { select: { name: true } } },
          },
          _count: { select: { spotLinks: true } },
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
          // Phần "thực tế" cho dải Spotlight: giờ mở cửa, điểm nhấn và số
          // Vivu-er đã đến.
          openingHours: true,
          tags: true,
          highlights: {
            orderBy: { order: "asc" },
            take: 3,
            select: { title: true },
          },
          _count: { select: { checkIns: true } },
        },
      },
      // Đặc sản (Specialty) KHÔNG còn được lấy: phần món ăn đã tắt hiển thị
      // công khai. Dữ liệu vẫn nguyên trong DB, chỉ là không render ở đâu.
      // CHỈ quán ĂN. Quán nước lấy bằng truy vấn riêng bên dưới: nhét chung một
      // `take: 3` thì quán nước gần như không bao giờ lọt (chúng đứng cuối theo
      // `order`), mà đó lại là thứ đáng xem nhất ở những nơi đi vì cảnh.
      eateries: {
        where: { ...pub, venueKind: { in: ["eat", "both"] as const } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        // Lấy dư 4 ô của section: `FoodMenu` giữ chỗ cho quán nước nên số ô
        // dành cho quán ăn thay đổi theo dữ liệu từng nơi.
        take: 6,
        select: {
          slug: true,
          name: true,
          category: true,
          venueKind: true,
          viewType: true,
          bestTime: true,
          meals: true,
          wardName: true,
          districtName: true,
          images: listingImages,
        },
      },
      accommodations: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        // 4 = ĐÚNG MỘT HÀNG bốn ô (xem StayDirectory). Tab tổng quan chỉ giới
        // thiệu cái nổi bật; xem hết thì qua trang /luu-tru.
        take: 4,
        select: {
          slug: true,
          name: true,
          category: true,
          address: true,
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
  const settings = await getSettings(); // kiểu hero dùng chung toàn site
  if (!place || (place.status !== "published" && !staff)) notFound();

  // Trạng thái check-in "đã đến" của user hiện tại + tổng số người đã đến.
  const session = await auth();
  const userId = session?.user?.id;
  const [checkInRow, visitors, tripTemplates] = await Promise.all([
    userId
      ? prisma.checkIn.findUnique({
          where: { userId_placeId: { userId, placeId: place.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    getVisitors("place", place.id),
    // Lịch trình mẫu gắn nơi này — lối vào tính năng Lịch trình từ trang điểm
    // đến, đồng thời giải bài toán "/lich-trinh lần đầu vào thì trống trơn".
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published", placeId: place.id },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        _count: {
          select: {
            days: true,
            // CHỈ mục đã xếp vào ngày mới là "điểm dừng". Mục chưa xếp ngày
            // (dayId = null) là gợi ý kèm theo, đếm vào đây là nói quá.
            items: { where: { dayId: { not: null } } },
          },
        },
      },
    }),
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
  // Số chỗ ở ĐÃ xác minh chính chủ — hiện thành "N/M đã xác minh" ở section Lưu
  // trú. Đếm riêng vì `place.accommodations` chỉ lấy 6 mục đầu.
  const verifiedStays =
    counts.accommodation > 0
      ? await prisma.accommodation.count({
          where: { placeId: place.id, ...pub, isVerified: true },
        })
      : 0;
  // Quán nước cho section Ẩm thực — truy vấn riêng để có suất hiện riêng, không
  // phải tranh 3 chỗ với quán ăn. Ưu tiên quán CÓ view (cảnh mới là thứ bán ở
  // mục này), sau đó theo thứ tự biên tập.
  const drinkVenues =
    counts.eatery > 0
      ? await prisma.eatery.findMany({
          where: {
            placeId: place.id,
            ...pub,
            venueKind: { in: ["drink", "both"] },
          },
          orderBy: [
            { isFeatured: "desc" },
            { order: "asc" },
            { name: "asc" },
          ],
          take: 6,
          select: {
            slug: true,
            name: true,
            category: true,
            venueKind: true,
            viewType: true,
            bestTime: true,
            meals: true,
            wardName: true,
            districtName: true,
            images: listingImages,
          },
        })
      : [];

  const stats = buildPlaceStats(place.viewCount);
  const tabs = buildPlaceTabs(place.slug, counts);
  const heroReviews =
    isDestination && reviewSummary.total > 0
      ? { stars: reviewSummary.stars, total: reviewSummary.total }
      : undefined;

  // Tóm tắt cộng đồng của điểm đến: mấy con số "có người" + vài bài mới.
  // TẠM ẨN: không truy vấn nữa cho khỏi tốn một vòng DB mỗi lần mở trang.
  // Bật lại: đặt COMMUNITY_ENABLED = true và bỏ comment dòng dưới.
  // const community = await getPlaceCommunityDigest(place.id);
  const community = { total: 0 } as Awaited<
    ReturnType<typeof getPlaceCommunityDigest>
  >;

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
    place.eateries.length > 0 ||
    drinkVenues.length > 0 ||
    place.accommodations.length > 0 ||
    counts.transport > 0;

  const videos = await resolveVideos(place.videos);

  // "Thông tin chung": danh sách {label, value} biên tập trong CMS.
  const quickFacts =
    (place.quickInfo as { label: string; value: string }[] | null) ?? [];

  // Câu đầu mô tả tách ra làm lede (phóng to), phần còn lại là thân bài.
  const [lede, descBody] = splitLede(place.description);

  // Nhịp nền nhạt/trắng bắt đầu từ mục TRẢI NGHIỆM: hai mục mở đầu (Đôi nét,
  // Địa điểm đáng ghé) để trắng — mục Địa điểm đã có khối ảnh đóng khung rất
  // đậm, thêm nền nhạt nữa là hai tín hiệu cùng lúc.
  //
  // Từ Trải nghiệm trở xuống thì gọi `tinted()` cho từng dải: lần gọi ĐẦU trả
  // về nhạt, rồi luân phiên. Đếm theo dải THỰC SỰ được render (không gắn cứng
  // vào từng mục) nên điểm đến thiếu mục nào — chưa có thảo luận cộng đồng, chưa
  // có lưu trú… — nhịp vẫn đúng, không bị hai dải cùng màu dính nhau.
  let bandIndex = 0;
  const tinted = () => bandIndex++ % 2 === 0;

  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker
        placeId={place.id}
        name={place.name}
        provinceName={place.provinceName}
      />

      <main className="flex-1">
        {/* Kiểu hero là CÀI ĐẶT CHUNG toàn site (SiteSetting.heroLayout, đổi ở
            /cms/settings) — mỗi trang chỉ render MỘT hero, không có toggle phía
            khách. */}
        {settings.heroLayout === "classic" ? (
          <PlaceHero
            place={place}
            heroImages={heroImages}
            stats={stats}
            back={{ href: "/diem-den", label: "Điểm đến" }}
            checkIn={checkIn}
            visitors={visitors}
            reviews={heroReviews}
          />
        ) : (
          <PlaceHeroCenter
            place={place}
            heroImages={heroImages}
            stats={stats}
            back={{ href: "/diem-den", label: "Điểm đến" }}
            checkIn={checkIn}
            visitors={visitors}
            reviews={heroReviews}
          />
        )}

        {/* Thanh tab: Tổng quan + xem tất cả từng listing + nút Video */}
        <PlaceTabs items={tabs} />

        {(place.description || quickFacts.length > 0 || showChildren) && (
        <Band>
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
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-14">
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
                    <PlainProse
                      text={descBody}
                      className="mt-4 leading-7 text-muted-foreground"
                    />
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
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Bài giới thiệu
                        </span>
                        <span className="mt-0.5 line-clamp-2 font-semibold leading-6 text-foreground decoration-primary/40 underline-offset-4 transition-colors group-hover:text-primary group-hover:underline">
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
              <SectionHeading title={`Điểm đến tại ${place.name}`} />
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}
        </Band>
        )}

        {/* Tham quan (Spot) — nền TRẮNG, ảnh tràn mép nên `bleed` (khối tự dựng
            container riêng). */}
        {place.spots.length > 0 && (
          <Band bleed>
          <section id="tham-quan" className="scroll-mt-32">
            <SpotSpotlight
              title="Địa điểm đáng ghé"
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
                tagline: s.tagline,
                description: s.description,
                // Fact rút gọn — dựng ở server để component client chỉ nhận
                // chuỗi (tên icon là string, `Ic` tra bảng khi render).
                facts: [{ icon: "clock", text: s.openingHours }].filter(
                  (f): f is { icon: string; text: string } => Boolean(f.text),
                ),
                tags: s.tags.slice(0, 3),
                highlights: s.highlights.map((h) => h.title),
                visits: s._count.checkIns,
              }))}
            />
          </section>
          </Band>
        )}

        {/* Trải nghiệm — bốn thẻ dọc, tĩnh (xem ExperienceGrid). Nằm TRONG
            container: bản băng ảnh tràn viền cũ đứng ngay dưới dải Địa điểm cũng
            tràn viền, hai khối lớn liền nhau đọc ra như một chuỗi. */}
        {place.activities.length > 0 && (
          <Band tint={tinted()}>
            <section id="trai-nghiem" className="scroll-mt-32">
              <ExperienceGrid
                title="Trải nghiệm nổi bật"
                href={`/diem-den/${place.slug}/hoat-dong`}
                count={counts.activity}
                unit="trải nghiệm"
                items={place.activities.map((a) => ({
                  slug: a.slug,
                  name: a.name,
                  category: a.category
                    ? label(ACTIVITY_CATEGORY_LABELS, a.category)
                    : null,
                  image: coverUrl(a.images, a.slug),
                  duration: shortFact(a.durationText),
                  season: shortFact(a.seasonText),
                  spotNames: a.spotLinks.map((l) => l.spot.name),
                  spotCount: a._count.spotLinks,
                }))}
              />
            </section>
          </Band>
        )}

        {/* Ẩm thực — một hàng ô ảnh, quán ăn & quán nước chung (xem FoodMenu) */}
        {(place.eateries.length > 0 || drinkVenues.length > 0) && (
          <Band tint={tinted()}>
            <section id="am-thuc" className="scroll-mt-32">
              <FoodMenu
                placeName={place.name}
                href={`/diem-den/${place.slug}/am-thuc`}
                count={counts.eatery}
                eateries={place.eateries}
                drinks={drinkVenues}
              />
            </section>
          </Band>
        )}

        {/* Lưu trú + trạng thái rỗng */}
        {(place.accommodations.length > 0 || !hasAnyContent) && (
          <Band tint={tinted()}>
            {/* Lưu trú — một hàng bốn ô ảnh, chữ + huy hiệu xác minh đặt trên
                ảnh (xem StayDirectory) */}
            {place.accommodations.length > 0 && (
            <section id="luu-tru" className="scroll-mt-32">
              <StayDirectory
                placeName={place.name}
                href={`/diem-den/${place.slug}/luu-tru`}
                total={counts.accommodation}
                verifiedTotal={verifiedStays}
                stays={place.accommodations}
              />
            </section>
          )}

          {tripTemplates.length > 0 && (
            <section id="lich-trinh" className="scroll-mt-32">
              <SectionHeading
                title={`Gợi ý lịch trình ở ${place.name}`}
                href="/lich-trinh"
                count={tripTemplates.length}
                unit="lịch trình"
              />
              <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tripTemplates.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/lich-trinh/${t.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/5"
                    >
                      <span className="text-xs font-medium text-warm">
                        {t._count.days} ngày · {t._count.items} điểm dừng
                      </span>
                      <span className="mt-1.5 font-semibold leading-snug tracking-tight group-hover:text-primary">
                        {t.title}
                      </span>
                      {t.summary && (
                        <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {t.summary}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
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
          </Band>
        )}

        {/* Hỏi đáp cộng đồng — TẠM ẨN cùng đợt gỡ Cộng đồng khỏi header và
            thanh tab điểm đến. Bật lại: đổi `false &&` thành `community.total > 0 &&`
            rồi bỏ comment lời gọi `getPlaceCommunityDigest` ở trên. */}
        {COMMUNITY_ENABLED && community.total > 0 && (
          <Band tint={tinted()}>
            <section id="hoi-dap" className="scroll-mt-32">
              <SectionHeading
                title="Hỏi đáp cộng đồng"
                href={`/diem-den/${place.slug}/cong-dong`}
                count={community.total}
                unit="thảo luận"
              />
              <CommunityPreview
                digest={community}
                href={`/diem-den/${place.slug}/cong-dong`}
                placeName={place.name}
              />
            </section>
          </Band>
        )}

        {/* Đánh giá của Vivu-er (chỉ điểm đến lớn) */}
        {isDestination && (
          <Band tint={tinted()}>
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
          </Band>
        )}

        {/* Cẩm nang — tự dựng container riêng nên đứng ngoài Band */}
        <RelatedPosts type="place" id={place.id} />
      </main>

      <PeerBar
        groups={peerGroups}
        currentSlug={place.slug}
        prefix="diem-den"
        title="Điểm đến"
      />
    </div>
  );
}


/* ── Rút gọn một fact cho dòng ghi chú trên "tuyến đường" trải nghiệm ──
   Biên tập hay viết cả vế phụ vào `seasonText` ("Quanh năm; rộn ràng nhất dịp
   lễ hội") hay `durationText` ("Nửa ngày (đi về trong ngày)"). Trên vạch đường
   chỉ có chỗ cho một dòng, nên cắt ở dấu `;` hoặc `(` đầu tiên: giữ mệnh đề
   chính, bỏ phần giải thích — vẫn đọc được nguyên vẹn thay vì bị `truncate`
   xén giữa chữ. KHÔNG cắt ở gạch ngang: nó là dấu nối khoảng ("Tháng 10 – 4",
   "Nửa ngày – 1 ngày"), cắt vào là mất nửa thông tin. */
function shortFact(text: string | null): string | null {
  if (!text) return null;
  const head = text.split(/[;(]/)[0].trim().replace(/[,.]$/, "");
  return head || null;
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

