import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import {
  BedDouble,
  BookOpen,
  Bus,
  CalendarDays,
  Compass,
  LayoutGrid,
  MapPin,
  Newspaper,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { Pagination } from "@/components/pagination";
import { PostStats } from "@/components/blog/post-stats";
import { SortSelect } from "@/components/blog/sort-select";
import { BlogFilters, type FilterOption } from "@/components/blog/blog-filters";
import { RiseInView } from "@/components/site/reveal";

export const metadata = {
  title: "Cẩm nang du lịch · Halivivu",
  description: "Kinh nghiệm, lịch trình gợi ý và review điểm đến khắp Việt Nam.",
};

// Cùng họ chữ tiêu đề với `/diem-den` và `/dia-diem` — khai TẠI TRANG vì
// `--font-serif` không có trong root layout.
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Nhãn nhỏ đầu khối — MỘT khuôn cho cả trang. Cỡ 0.6rem là hằng `MICRO` dùng
// chung với `/diem-den` (`destination-filter.tsx`) và `/dia-diem`; bản trước ở
// đây là 0.7rem, tức cùng một vai nhưng to hơn nửa bậc so với hai trang kia.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Khung ảnh dùng chung. MÉP VUÔNG — cùng hình khối với thẻ ở `/diem-den` và
// `/dia-diem`; bản trước bo `rounded-2xl`/`rounded-3xl`.
const SHOT = "overflow-hidden bg-muted";
// Vành sáng mảnh vẽ bên trong mép ảnh, đậm lên khi rê chuột — đúng vành của thẻ
// điểm đến (`ring-white/12` → `ring-white/55`), thay cho vành mực tĩnh.
const RING =
  "pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12 transition-[box-shadow] duration-300 group-hover:ring-white/55 motion-reduce:transition-none";
// Vành cho ảnh KHÔNG có chữ đè lên (thẻ trong lưới): vẫn cần một nét ngăn ảnh
// trời sáng với nền trang trắng.
const RING_PLAIN =
  "pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10";
// Lớp phủ đáy cho ảnh có chữ đè lên — cùng công thức với thẻ điểm đến.
const SCRIM =
  "absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none";

const CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "all", label: "Tất cả bài viết", Icon: LayoutGrid },
  { value: "cam-nang", label: "Cẩm nang", Icon: BookOpen },
  { value: "trai-nghiem", label: "Trải nghiệm", Icon: Compass },
  { value: "am-thuc", label: "Ẩm thực", Icon: UtensilsCrossed },
  { value: "luu-tru", label: "Lưu trú", Icon: BedDouble },
  { value: "di-chuyen", label: "Di chuyển", Icon: Bus },
  { value: "tin-tuc", label: "Tin tức", Icon: Newspaper },
];

const PER_PAGE = 9;

function DateMeta({ date, className }: { date: Date; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <CalendarDays className="size-3.5" aria-hidden />
      {dateFmt.format(date)}
    </span>
  );
}

function timeCutoff(t: string): Date | null {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000);
  switch (t) {
    case "tuan-nay":
      return days(7);
    case "thang-nay":
      return days(30);
    case "6-thang":
      return days(183);
    case "nam-nay":
      return new Date(new Date().getFullYear(), 0, 1);
    default:
      return null;
  }
}

const coverSelect = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

const cardSelect = {
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  isFeatured: true,
  createdAt: true,
  publishedAt: true,
  author: { select: { name: true } },
  images: coverSelect,
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.PostSelect;

type Card = Prisma.PostGetPayload<{ select: typeof cardSelect }>;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    dd?: string;
    tag?: string;
    time?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const category =
    sp.category && sp.category in POST_CATEGORY_LABELS ? sp.category : "all";
  const dd = sp.dd?.split(",").filter(Boolean) ?? [];
  const tags = sp.tag?.split(",").filter(Boolean) ?? [];
  const time = sp.time ?? "";
  const sort = sp.sort ?? "moi-nhat";
  const page = Math.max(1, Number(sp.page) || 1);
  const cutoff = timeCutoff(time);
  const noFilter =
    category === "all" && dd.length === 0 && tags.length === 0 && !time;

  const where: Prisma.PostWhereInput = {
    status: "published",
    ...(category !== "all" ? { category } : {}),
    ...(dd.length ? { refs: { some: { place: { slug: { in: dd } } } } } : {}),
    ...(tags.length ? { tags: { hasSome: tags } } : {}),
    ...(cutoff ? { publishedAt: { gte: cutoff } } : {}),
  };

  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === "cu-nhat"
      ? [{ publishedAt: "asc" }, { createdAt: "asc" }]
      : sort === "pho-bien"
        ? [{ popularity: "desc" }, { publishedAt: "desc" }]
        : [{ isFeatured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];

  const showFeatured = page === 1 && noFilter;

  const [
    posts,
    total,
    grouped,
    featured,
    destRows,
    topicRows,
    catCoverRows,
    newest,
  ] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      select: cardSelect,
    }),
    prisma.post.count({ where }),
    prisma.post.groupBy({
      by: ["category"],
      where: { status: "published" },
      _count: { _all: true },
    }),
    showFeatured
      ? prisma.post.findMany({
          where: { status: "published" },
          orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
          take: 3,
          select: cardSelect,
        })
      : Promise.resolve([] as Card[]),
    prisma.place.findMany({
      where: { postRefs: { some: { post: { status: "published" } } } },
      select: {
        name: true,
        slug: true,
        _count: {
          select: { postRefs: { where: { post: { status: "published" } } } },
        },
      },
    }),
    prisma.$queryRaw<{ tag: string; count: number }[]>`
      SELECT unnest(tags) AS tag, count(*)::int AS count
      FROM "Post" WHERE status = 'published'
      GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 12`,
    prisma.post.findMany({
      where: { status: "published", category: { not: null } },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      select: { category: true, slug: true, images: coverSelect },
    }),
    // Ngày bài mới nhất — dữ kiện THẬT thay cho lời hứa "Cập nhật hàng tuần".
    prisma.post.findFirst({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: { publishedAt: true, createdAt: true },
    }),
  ]);

  const totalPublished = grouped.reduce((s, g) => s + g._count._all, 0);
  const countOf = (v: string) =>
    v === "all"
      ? totalPublished
      : (grouped.find((g) => g.category === v)?._count._all ?? 0);

  const destinations: FilterOption[] = destRows
    .map((d) => ({ value: d.slug, label: d.name, count: d._count.postRefs }))
    .sort((a, b) => b.count - a.count);
  const topics: FilterOption[] = topicRows.map((t) => ({
    value: t.tag,
    label: t.tag,
    count: Number(t.count),
  }));

  // Ảnh đại diện cho từng danh mục (dùng ở "Chủ đề nổi bật").
  const catCover = new Map<
    string,
    { images: (typeof catCoverRows)[number]["images"]; slug: string }
  >();
  for (const r of catCoverRows) {
    if (r.category && !catCover.has(r.category))
      catCover.set(r.category, { images: r.images, slug: r.slug });
  }

  const liveTopics = CATEGORIES.filter(
    (c) => c.value !== "all" && countOf(c.value) > 0,
  );
  const totalPages = Math.ceil(total / PER_PAGE);
  const newestAt = newest ? (newest.publishedAt ?? newest.createdAt) : null;

  const buildHref = (patch: { category?: string; page?: number }): string => {
    const p = new URLSearchParams();
    const cat = patch.category ?? category;
    if (cat !== "all") p.set("category", cat);
    if (dd.length) p.set("dd", dd.join(","));
    if (tags.length) p.set("tag", tags.join(","));
    if (time) p.set("time", time);
    if (sort !== "moi-nhat") p.set("sort", sort);
    const pg = patch.page ?? 1;
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  };

  const lead = featured[0] ?? null;
  const featRest = featured.slice(1);

  return (
    // Nền TRẮNG như `/diem-den` và `/dia-diem`. Bản trước dùng nền be `muted/40`
    // để "đọc ra như một ấn phẩm tách khỏi phần tra cứu" — nhưng ba trang danh
    // sách này giờ dùng chung một bộ vật liệu, mà nền là thứ đầu tiên mắt nhận
    // ra: một trang be giữa hai trang trắng thì đọc ra là site khác, không phải
    // mục khác.
    <div className={cn("flex flex-1 flex-col", serif.variable)}>

      <main className="flex-1">
        {/* Container ĐÚNG BẰNG container của header: `max-w-7xl px-4 sm:px-6`.
            Trước đây trang này dùng `max-w-[81.25rem]` + `lg:px-8` riêng, nên ở
            màn rộng logo/nav lại thụt vào một khoảng khác nội dung bên dưới —
            hai mép lệch nhau chừng 70px, đủ để đọc ra là hai trang khác nhau. */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className={cn(MICRO, "flex items-center pt-6 text-muted-foreground")}>
            <Link href="/" className="transition-colors hover:text-primary">
              Trang chủ
            </Link>
            <span className="mx-2 text-border" aria-hidden>
              /
            </span>
            <span className="text-foreground">Cẩm nang</span>
          </nav>

          {/* Masthead — MỘT CỘT, không còn ảnh.
              Đã gỡ hai thứ, mỗi thứ một lý do:
                · nhãn eyebrow "Cẩm nang du lịch" nằm giữa breadcrumb vừa ghi
                  "Cẩm nang" và tiêu đề — ba dòng cho một cái tên;
                · ảnh masthead 30rem bên phải. Nó lấy bìa của MỘT BÀI BẤT KỲ
                  (`catCoverRows` trừ bài lead), tức là một tấm ảnh không nói gì
                  về trang — và tệ hơn, đúng tấm đó xuất hiện lại ngay bên dưới
                  ở "Chủ đề nổi bật" VÀ ở thẻ phụ của "Bài viết nổi bật". Ba lần
                  cùng một bức ảnh trong một màn hình.
              Bỏ ảnh thì đầu trang còn ~180px thay vì ~380px: lưới chủ đề và bài
              nổi bật — vốn đã đầy ảnh thật, đúng ngữ cảnh — lên thẳng tầm mắt. */}
          <section className="mt-5 max-w-3xl">
            <h1 className="text-balance font-[family-name:var(--font-serif)] text-[clamp(1.75rem,4.4vw,3.25rem)] font-normal uppercase leading-[1.15] tracking-[0.1em] sm:tracking-[0.14em]">
              Kinh nghiệm cho mọi hành trình
            </h1>
            {/* `max-w-2xl`: ở `max-w-xl` câu này rớt đúng hai chữ cuối xuống
                dòng hai, tốn thêm một dòng cho đầu trang vừa cố rút gọn. */}
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              Lịch trình gợi ý, review điểm đến, quán xá và những mẹo hữu ích cho
              chuyến đi khắp Việt Nam.
            </p>
            {/* DỮ KIỆN, không phải lời hứa. Bản trước có hai chip "Cập nhật
                hàng tuần" và "Nội dung chọn lọc" — không ai kiểm được, và cái
                đầu còn có thể sai bất cứ lúc nào. Ngày bài mới nhất thì luôn
                đúng vì nó đọc thẳng từ dữ liệu. */}
            {/* Hàng dữ kiện: nhãn nhỏ in hoa, SỐ về màu chữ chính — cùng cách
                `/diem-den` viết meta ("16 điểm đến"). Bỏ ba icon: ở cỡ chữ này
                chúng to ngang chữ và không thêm nghĩa nào. */}
            <div
              className={cn(
                MICRO,
                "mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground",
              )}
            >
              <Fact n={totalPublished} unit="bài viết" />
              <Fact n={liveTopics.length} unit="chủ đề" />
              {newestAt && (
                <span>
                  Mới nhất{" "}
                  <span className="tabular-nums text-foreground">
                    {dateFmt.format(newestAt)}
                  </span>
                </span>
              )}
            </div>
          </section>
        </div>

        <div className="mx-auto mt-9 grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[16rem_1fr] lg:gap-14">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className={cn(MICRO, "mb-3 text-muted-foreground")}>
                  Danh mục
                </h2>
                {/* Mục đang chọn tô MỰC (`foreground`), không phải xanh
                    `primary`: cả hệ thẻ ở ba trang danh sách chỉ dùng mực và
                    trắng, xanh để dành cho hành động. Bỏ icon từng mục — sáu
                    icon xếp dọc thành một cột hình vẽ chạy song song cột chữ,
                    trong khi tên mục đã đủ. */}
                <ul className="flex flex-col border-t border-border">
                  {CATEGORIES.map((c) => {
                    const active = category === c.value;
                    return (
                      <li key={c.value}>
                        <Link
                          href={buildHref({ category: c.value })}
                          className={cn(
                            "flex items-center gap-3 border-b border-border py-2.5 text-sm transition-colors",
                            active
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "h-4 w-0.5 shrink-0 transition-colors",
                              active ? "bg-foreground" : "bg-transparent",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {c.label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-xs tabular-nums",
                              active ? "text-foreground" : "text-muted-foreground/60",
                            )}
                          >
                            {countOf(c.value)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <BlogFilters
                destinations={destinations}
                topics={topics}
                selectedDest={dd}
                selectedTopics={tags}
                time={time}
              />
            </div>
          </aside>

          {/* Nội dung */}
          <div className="min-w-0">
            {/* Chủ đề nổi bật */}
            {liveTopics.length > 0 && (
              <section>
                <SectionHead title="Chủ đề nổi bật" />
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {liveTopics.map((c) => {
                    const cover = catCover.get(c.value);
                    return (
                      <Link
                        key={c.value}
                        href={buildHref({ category: c.value })}
                        // `min-w-44 flex-1` chứ không phải `w-44 shrink-0`:
                        // cột nội dung rộng thêm ~150px sau khi nới container,
                        // mà ba thẻ cố định 176px thì bỏ trống nửa hàng. Cho
                        // chúng giãn ra lấp hết chỗ, và chỉ khi nhiều chủ đề
                        // quá mới co về 176px rồi cuộn ngang.
                        className={cn(
                          SHOT,
                          "group relative aspect-[16/10] min-w-44 flex-1",
                        )}
                      >
                        {cover && (
                          <Image
                            src={coverUrl(cover.images, cover.slug, 360, 226)}
                            alt=""
                            fill
                            sizes="176px"
                            className="object-cover"
                          />
                        )}
                        <span aria-hidden className={SCRIM} />
                        <span aria-hidden className={RING} />
                        <span className="absolute inset-x-3.5 bottom-3">
                          <span className="block font-[family-name:var(--font-display)] text-sm font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
                            {c.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] tabular-nums text-white/75">
                            {countOf(c.value)} bài viết
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Bài viết nổi bật */}
            {lead && (
              <section className="mt-12">
                <SectionHead title="Bài viết nổi bật" />
                <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                  <Link
                    href={`/blog/${lead.slug}`}
                    className={cn(SHOT, "group relative block")}
                  >
                    <div className="relative aspect-[16/11]">
                      <Image
                        src={coverUrl(lead.images, lead.slug, 900, 620)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 44rem, 100vw"
                        className="object-cover"
                      />
                      <span aria-hidden className={SCRIM} />
                    </div>
                    <span aria-hidden className={RING} />
                    {/* Huy hiệu "Nổi bật" y hệt thẻ điểm đến: khối TRẮNG vuông,
                        chữ mực, ngôi sao cam đậm — thay cho viên cam bo tròn.
                        Trên một tấm ảnh, khối trắng đọc rõ hơn mà không giành
                        vai với chính tấm ảnh. */}
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 bg-white/95 py-1 pl-2 pr-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm">
                      <Star className="size-3 shrink-0 text-[#a34c00]" aria-hidden />
                      Nổi bật
                    </span>
                    <div className="absolute inset-x-5 bottom-5">
                      {lead.category && (
                        <span className={cn(MICRO, "text-white/85")}>
                          {label(POST_CATEGORY_LABELS, lead.category)}
                        </span>
                      )}
                      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-normal leading-[1.18] tracking-[-0.015em] text-white underline-offset-[6px] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] group-hover:underline sm:text-2xl">
                        {lead.title}
                      </h3>
                      {lead.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">
                          {lead.excerpt}
                        </p>
                      )}
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/75">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {dateFmt.format(lead.publishedAt ?? lead.createdAt)}
                      </p>
                    </div>
                  </Link>

                  <div className="flex flex-col gap-4">
                    {featRest.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/blog/${p.slug}`}
                        // `flex-1`: hai thẻ phụ chia đều chiều cao của cột, tức
                        // là bằng đúng chiều cao thẻ lead bên trái. Để chúng tự
                        // cao theo nội dung thì cột phải hụt gần 200px so với
                        // ảnh lớn bên cạnh, hở một mảng trống ở đáy.
                        className="group grid flex-1 grid-cols-[8rem_1fr] gap-4 overflow-hidden border border-border transition-colors duration-200 hover:border-foreground"
                      >
                        <div className="relative min-h-[6.5rem] overflow-hidden bg-muted">
                          <Image
                            src={coverUrl(p.images, p.slug, 320, 240)}
                            alt=""
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col justify-center pr-3">
                          {p.category && (
                            <span className={cn(MICRO, "mb-1.5 text-warm-ink")}>
                              {label(POST_CATEGORY_LABELS, p.category)}
                            </span>
                          )}
                          <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
                            {p.title}
                          </h3>
                          <DateMeta
                            date={p.publishedAt ?? p.createdAt}
                            className="mt-2"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Tất cả bài viết */}
            <section className="mt-12">
              <SectionHead title="Tất cả bài viết" right={<SortSelect value={sort} />} />

              {posts.length > 0 ? (
                <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((p, i) => (
                    <RiseInView key={p.slug} delay={Math.min(i, 5) * 0.05}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group flex flex-col"
                    >
                      <div className={cn(SHOT, "relative aspect-[3/2]")}>
                        <Image
                          src={coverUrl(p.images, p.slug, 640, 400)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 100vw"
                          className="object-cover"
                        />
                        <span aria-hidden className={RING_PLAIN} />
                      </div>
                      <div className="mt-4 flex min-w-0 flex-col">
                        {/* `warm-ink` chứ không `warm`: đây là CHỮ trên nền
                            sáng, và luật màu của dự án là nền/huy hiệu đặc dùng
                            `--warm`, chữ trên nền sáng dùng bản ink (4.87:1 thay
                            vì ~2:1). */}
                        {p.category && (
                          <span className={cn(MICRO, "mb-2 text-warm-ink")}>
                            {label(POST_CATEGORY_LABELS, p.category)}
                          </span>
                        )}
                        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {p.excerpt}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <DateMeta date={p.publishedAt ?? p.createdAt} />
                          <PostStats
                            likes={p._count.likes}
                            comments={p._count.comments}
                          />
                        </div>
                      </div>
                    </Link>
                    </RiseInView>
                  ))}
                </div>
              ) : (
                <div className="mt-8 border border-dashed border-border py-16 text-center">
                  <MapPin
                    className="mx-auto size-8 text-muted-foreground/60"
                    aria-hidden
                  />
                  <p className="mt-3 font-[family-name:var(--font-display)] font-semibold tracking-tight">
                    Không có bài viết phù hợp
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thử bỏ bớt bộ lọc để xem thêm bài viết.
                  </p>
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                hrefFor={(p) => buildHref({ page: p })}
              />
            </section>
          </div>
        </div>
      </main>

    </div>
  );
}

/**
 * Tiêu đề một mục — serif in hoa giãn chữ trên một đường kẻ mảnh, đúng khuôn
 * tiêu đề miền ở `/diem-den`. Bản trước ba tiêu đề này là nhãn `MICRO` xám, tức
 * cùng cỡ với chú thích bên dưới chúng: không có tầng nào cả.
 */
function SectionHead({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
      <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.125rem,2.2vw,1.5rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
        {title}
      </h2>
      {right}
    </div>
  );
}

function Fact({ n, unit }: { n: number; unit: string }) {
  return (
    <span>
      <span className="tabular-nums text-foreground">{n}</span> {unit}
    </span>
  );
}
