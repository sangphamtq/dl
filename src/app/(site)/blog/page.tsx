import Link from "next/link";
import Image from "next/image";
import {
  BedDouble,
  BookOpen,
  Bus,
  CalendarDays,
  Compass,
  LayoutGrid,
  MapPin,
  Newspaper,
  Sparkles,
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

export const metadata = {
  title: "Cẩm nang du lịch · Halivivu",
  description: "Kinh nghiệm, lịch trình gợi ý và review điểm đến khắp Việt Nam.",
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Nhãn nhỏ đầu khối — MỘT khuôn cho cả trang (danh mục, chủ đề, bài nổi bật,
// tất cả bài viết). Trước đây mỗi nhãn tự khai lại cỡ chữ và giãn ký tự riêng.
const MICRO = "text-[0.7rem] font-semibold uppercase tracking-[0.14em]";

// Bo góc ảnh dùng chung, cùng ngôn ngữ với thẻ ở các trang khác của site.
const SHOT = "overflow-hidden rounded-2xl bg-muted";
// Vành mực nhạt vẽ bên trong mép ảnh: ảnh trời sáng đặt trên nền be nhạt thì
// cạnh trên gần như biến mất nếu không có nó.
const RING =
  "pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10";
// Lớp phủ đáy cho ảnh có chữ đè lên: đậm ở đáy rồi TẮT HẲN ở 72% chiều cao,
// nên phần trên của ảnh không bị đụng tới. Cùng công thức với thẻ điểm đến.
const SCRIM =
  "absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.72)_18%,rgba(0,0,0,0.4)_38%,rgba(0,0,0,0.12)_56%,rgba(0,0,0,0)_74%)]";

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
    // Nền be rất nhạt để trang đọc ra như một ấn phẩm tách khỏi phần tra cứu.
    // `muted/40` chứ không phải một mã màu viết cứng — cùng sắc với nền phụ của
    // cả site, và dark mode tự đúng.
    // Nền be chuyển xuống <main>: nó từng nằm trên khối bọc cả header, mà
    // header đã ra layout dùng chung nên khối này chỉ còn bọc phần nội dung.
    <div className="flex flex-1 flex-col">

      <main className="flex-1 bg-muted/40">
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
            <h1 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.6vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
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
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <Fact Icon={Newspaper} text={`${totalPublished} bài viết`} />
              <Fact Icon={LayoutGrid} text={`${liveTopics.length} chủ đề`} />
              {newestAt && (
                <Fact
                  Icon={CalendarDays}
                  text={`Mới nhất ${dateFmt.format(newestAt)}`}
                />
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
                <ul className="flex flex-col">
                  {CATEGORIES.map((c) => {
                    const active = category === c.value;
                    const Icon = c.Icon;
                    return (
                      <li key={c.value}>
                        <Link
                          href={buildHref({ category: c.value })}
                          className={cn(
                            "flex items-center gap-2.5 border-l-2 py-2 pl-3 text-sm transition-colors",
                            active
                              ? "border-primary font-semibold text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">
                            {c.label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-xs tabular-nums",
                              active ? "text-primary/70" : "text-muted-foreground/60",
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
                <h2 className={cn(MICRO, "text-muted-foreground")}>
                  Chủ đề nổi bật
                </h2>
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
                          <span className="block font-[family-name:var(--font-display)] text-sm font-semibold text-white">
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
                <h2 className={cn(MICRO, "text-muted-foreground")}>
                  Bài viết nổi bật
                </h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                  <Link
                    href={`/blog/${lead.slug}`}
                    className={cn(SHOT, "group relative block rounded-3xl")}
                  >
                    <div className="relative aspect-[16/11]">
                      <Image
                        src={coverUrl(lead.images, lead.slug, 900, 620)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 44rem, 100vw"
                        className="object-cover"
                      />
                      <span aria-hidden className={cn(SCRIM, "rounded-3xl")} />
                    </div>
                    <span aria-hidden className={cn(RING, "rounded-3xl")} />
                    {/* Huy hiệu: viên bo tròn màu cam của theme, cùng hình dạng
                        với huy hiệu ở các thẻ khác trong site — bản cũ là một ô
                        vuông màu #ff8800 viết cứng. */}
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-warm px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-warm-foreground">
                      <Sparkles className="size-3.5" aria-hidden />
                      Nổi bật
                    </span>
                    <div className="absolute inset-x-5 bottom-5">
                      {lead.category && (
                        <span className={cn(MICRO, "text-warm-bright")}>
                          {label(POST_CATEGORY_LABELS, lead.category)}
                        </span>
                      )}
                      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
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
                        className="group grid flex-1 grid-cols-[8rem_1fr] gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:border-transparent hover:shadow-lg hover:shadow-black/5"
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
                            <span className={cn(MICRO, "mb-1.5 text-warm")}>
                              {label(POST_CATEGORY_LABELS, p.category)}
                            </span>
                          )}
                          <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <h2 className={cn(MICRO, "text-muted-foreground")}>
                  Tất cả bài viết
                </h2>
                <SortSelect value={sort} />
              </div>

              {posts.length > 0 ? (
                <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className="group flex flex-col"
                    >
                      <div className={cn(SHOT, "relative aspect-[16/10]")}>
                        <Image
                          src={coverUrl(p.images, p.slug, 640, 400)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 100vw"
                          className="object-cover"
                        />
                        <span aria-hidden className={RING} />
                      </div>
                      <div className="mt-4 flex min-w-0 flex-col">
                        {p.category && (
                          <span className={cn(MICRO, "mb-2 text-warm")}>
                            {label(POST_CATEGORY_LABELS, p.category)}
                          </span>
                        )}
                        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
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
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
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

function Fact({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      {text}
    </span>
  );
}
