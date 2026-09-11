import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { Ic } from "@/components/icon";
import { SectionHeading } from "@/components/site/section-heading";
import { CtaButton } from "@/components/site/cta-button";
import { HomeHero, type HeroTitle } from "@/components/site/home-hero";

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

const STEPS = [
  {
    icon: "compass",
    title: "Chọn nơi",
    body: "Duyệt theo miền, hoặc mở bản đồ xem chỗ nào gần chỗ mình.",
  },
  {
    icon: "map-pinned",
    title: "Đọc một lượt",
    body: "Từng chỗ ghi giờ mở cửa, giá và mùa đẹp. Quán nào hay hết sớm cũng có ghi.",
  },
  {
    icon: "calendar-days",
    title: "Xếp ngày",
    body: "Thấy chỗ nào ưng thì bỏ vào túi, xong kéo thả chia ra từng ngày.",
  },
];

const TITLES: HeroTitle[] = [
  { a: "Đi một chuyến,", b: "khỏi mở mười tab", mark: "mười tab" },
  { a: "Mỗi điểm đến", b: "có một trang riêng", mark: "một trang riêng" },
  { a: "Bớt hỏi trong group,", b: "mở một trang là đủ", mark: "là đủ" },
];

const ASKS: { q: string; a: string }[] = [
  {
    q: "Cuối tuần này đi đâu được?",
    a: "Mỗi điểm đến một trang đầy đủ, xem xong là chốt được nơi.",
  },
  {
    q: "Ba ngày ở đó thì đi những đâu?",
    a: "Lịch trình mẫu xếp sẵn theo ngày, kéo thả sửa lại thành của mình.",
  },
  {
    q: "Mùa này lên đó có gì đẹp?",
    a: "Từng địa điểm ghi rõ mùa và giờ đẹp nhất để đi.",
  },
];

export default async function Home() {
  const [session, featured, trips, posts, counts] = await Promise.all([
      auth(),
      prisma.place.findMany({
        where: { ...pub, kind: "destination" },
        orderBy: [
          { isFeatured: "desc" },
          { order: "asc" },
          { popularity: "desc" },
          { name: "asc" },
        ],
        take: 16,
        select: {
          slug: true,
          name: true,
          tagline: true,
          images: cover,
          lat: true,
          lng: true,
          parent: { select: { name: true } },
        },
      }),
      prisma.trip.findMany({
        where: {
          isTemplate: true,
          ...pub,
          slug: { not: null },
          days: { some: { items: { some: {} } } },
        },
        orderBy: [
          { isFeatured: "desc" },
          { order: "asc" },
          { publishedAt: "desc" },
        ],
        take: 3,
        select: {
          slug: true,
          title: true,
          summary: true,
          images: cover,
          place: { select: { name: true, parent: { select: { name: true } } } },
          _count: { select: { days: true } },
        },
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
          images: cover,
        },
      }),
      Promise.all([
        prisma.place.count({ where: { ...pub, kind: "destination" } }),
        prisma.spot.count({ where: pub }),
        prisma.eatery.count({ where: pub }),
        prisma.activity.count({ where: pub }),
        prisma.accommodation.count({ where: pub }),
      ]),
    ]);

  const user = session?.user;
  const [destCount, spotCount, eateryCount, activityCount, stayCount] =
    counts;
  // ẢNH HERO — bốn nơi nổi bật nhất, chỉ lấy làm KHÔNG KHÍ (tên nơi ghi ở cụm
  // điều khiển). Hero không hứa hẹn gì về nơi trong ảnh, nó chỉ ghi tên và cho
  // một lối bấm vào.
  const shots = featured.slice(0, 4).map((p) => ({
    slug: p.slug,
    name: p.name,
    province: p.parent?.name ?? null,
    url: coverUrl(p.images, p.slug, 1920, 1080),
    lat: p.lat,
    lng: p.lng,
  }));

  // Các nơi hiện ở thân trang KHÔNG lặp lại bốn nơi vừa chạy trên hero — trừ
  // khi trong DB chưa đủ điểm đến để tách hai nhóm.
  const rest = featured.slice(shots.length);
  const pool = rest.length >= 5 ? rest : featured;

  const lead = pool[0] ?? null;
  const gridPlaces = pool.slice(1, 5);
  const thumbs = pool.slice(5, 8);
  const collage = (pool.length >= 11 ? pool.slice(8, 11) : featured).slice(0, 3);
  const usedAbove = new Set(
    [lead, ...gridPlaces, ...thumbs, ...collage].map((x) => x?.slug),
  );
  const closing = pool.find((p) => !usedAbove.has(p.slug)) ?? lead;

  const inside: { n: number; unit: string; note: string }[] = [
    { n: spotCount, unit: "địa điểm", note: "đã lên bản đồ" },
    { n: activityCount, unit: "trải nghiệm", note: "có mùa & thời lượng" },
    { n: eateryCount, unit: "quán ăn & quán nước", note: "gồm cả quán view" },
    { n: stayCount, unit: "nơi lưu trú", note: "phần lớn đã xác minh" },
  ];

  return (
    <main className="flex-1">
      <HomeHero
        shots={shots}
        titles={TITLES}
        greeting={user?.name ?? null}
        footer={
          <ul className="hero-rise grid gap-x-10 gap-y-6 [animation-delay:520ms] sm:grid-cols-3 sm:divide-x sm:divide-white/15">
            {ASKS.map((item, i) => (
              <li
                key={item.q}
                className={cn(
                  "border-white/15",
                  i > 0 && "border-t pt-6 sm:border-t-0 sm:pl-10 sm:pt-0",
                )}
              >
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">
                  <span
                    aria-hidden
                    className="mr-1 font-bold text-warm-bright"
                  >
                    “
                  </span>
                  {item.q}
                  <span aria-hidden className="text-white/40">
                    ”
                  </span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#f7e7d6]/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        }
      >
        <p className="hero-rise mt-5 max-w-lg text-pretty leading-relaxed text-[#f8ece0]/75 [animation-delay:300ms] [text-shadow:0_1px_12px_rgba(0,0,0,0.75)] sm:text-lg">
          Mỗi điểm đến ở đây có một trang riêng:{" "}
          <strong className="font-semibold text-white">chỗ ghé</strong>,{" "}
          <strong className="font-semibold text-white">chỗ ăn</strong>,{" "}
          <strong className="font-semibold text-white">chỗ ở</strong>,{" "}
          <strong className="font-semibold text-white">đường đi</strong> — biên
          tập tay, không phải sàn đặt phòng, cũng không phải blog kể chuyện.
        </p>

        <div className="hero-rise mt-8 flex flex-wrap items-center gap-3 [animation-delay:400ms]">
          <CtaButton href="/diem-den" tone="photo">
            Khám phá điểm đến
          </CtaButton>
          <CtaButton href="/lich-trinh" tone="glass" arrow={false}>
            Xem lịch trình mẫu
          </CtaButton>
        </div>
      </HomeHero>

      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_85%_at_0%_0%,rgba(255,154,31,0.07),transparent_62%)]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className={cn(MICRO, "text-warm-ink")}>Nội dung đang có</p>

            <h2 className="mt-4 text-balance font-[family-name:var(--font-display)] text-[clamp(1.6rem,3vw,2.15rem)] font-semibold leading-[1.15] tracking-tight">
              {/* CỐ Ý KHÔNG đếm số tỉnh: đích đến là phủ đủ 34 tỉnh, mà một con
                  số "18/34" đọc ra như thanh tiến trình còn dang dở. */}
              <Big>{destCount}</Big>
              <span className="text-muted-foreground">
                điểm đến, mỗi nơi một trang riêng
              </span>
            </h2>

            {/* Câu này CỐ Ý không nhắc lại "chỗ ghé / chỗ ăn / chỗ ở / đường
                đi" — hero ngay phía trên đã liệt kê rồi, nhắc lần hai là đọc
                thành một trang tự quảng cáo. Nó nói thứ chưa ai nói: nội dung
                dày mỏng KHÔNG ĐỀU, và thừa nhận điều đó. */}
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Nơi nào đã làm thì làm kỹ. Nơi mới thêm còn mỏng, đang bù dần.
            </p>

            <ul className="mt-8 grid grid-cols-2 gap-3">
              {inside.map((item) => (
                <li
                  key={item.unit}
                  className={cn(R_CARD, "border border-border px-4 py-4")}
                >
                  <p className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,2.4vw,1.9rem)] font-bold leading-none tabular-nums text-warm-ink">
                    {item.n}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-snug">
                    {item.unit}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {collage.length >= 3 && <Collage items={collage} />}
        </div>
      </section>

      {lead && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-balance text-center font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
            Điểm đến nổi bật
          </h2>

          <div className="mt-12 grid gap-5 lg:grid-cols-2 lg:gap-6">
            {gridPlaces.length > 0 && (
              <ul className="grid grid-cols-2 gap-5 lg:gap-6">
                {gridPlaces.map((p) => (
                  <li key={p.slug}>
                    <PlaceTile p={p} />
                  </li>
                ))}
              </ul>
            )}

            <LeadTile p={lead} thumbs={thumbs} />
          </div>

          <div className="mt-10 flex justify-center">
            <CtaButton href="/diem-den" tone="surface">
              Xem tất cả {destCount} điểm đến
            </CtaButton>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden border-y border-border/60 bg-muted/30">
        <FlightPath />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
              Ba bước, không cần đăng nhập
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
              Chỉ khi muốn lưu lịch trình của mình thì mới cần tài khoản.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={cn(R_CARD, "border border-border bg-card p-6 text-center sm:p-7")}
              >
                <span className={cn(R_CARD, "mx-auto grid size-14 place-items-center border border-border text-primary-ink")}>
                  <Ic icon={s.icon} className="size-6" />
                </span>
                <p className={cn(MICRO, "mt-5 text-muted-foreground")}>
                  Bước {i + 1}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── LỊCH TRÌNH MẪU ─────────────────────────────────────────────────
          Tương đương khối "gói tour" của các site bán chuyến — nhưng ở đây
          KHÔNG có giá, vì không bán gì. Huy hiệu góc ảnh ghi SỐ NGÀY: đó mới là
          thứ khách cân nhắc khi chọn một lịch trình mẫu để sửa lại thành của
          mình. */}
      {trips.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            serif
            title="Lịch trình mẫu"
            href="/lich-trinh"
            count={trips.length}
            unit="lịch trình"
          />
          <ul
            className={cn(
              "mt-9 grid gap-5 sm:grid-cols-2 lg:gap-6",
              trips.length >= 3 && "lg:grid-cols-4",
            )}
          >
            {trips.map((t, i) => {
              const wide = trips.length >= 3 && i === 0;
              return (
                <li key={t.slug} className={cn(wide && "lg:col-span-2")}>
                  <TripTile t={t} wide={wide || trips.length <= 2} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-8">
          <SectionHeading serif title="Mới trong Cẩm nang" href="/blog" />
          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <PostTile p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {closing && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="relative isolate overflow-hidden">
            <Image
              src={coverUrl(closing.images, closing.slug, 1600, 700)}
              alt=""
              width={1600}
              height={700}
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,22,15,0.88)_0%,rgba(8,22,15,0.72)_45%,rgba(8,22,15,0.25)_100%)]"
            />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl p-7 sm:p-10 lg:p-14">
                <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2.125rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] text-white sm:tracking-[0.14em]">
                  Chọn một nơi rồi tính tiếp
                </h2>
                <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-[#f7e7d6] sm:text-base">
                  Đọc hết một trang là biết nơi đó có đáng đi không. Đáng thì
                  xếp luôn thành lịch.
                </p>
                <div className="mt-7">
                  <CtaButton href="/diem-den" tone="photo">
                    Khám phá điểm đến
                  </CtaButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return (
    <strong className="me-2 align-baseline font-[family-name:var(--font-display)] text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[0.85] tracking-[-0.04em] tabular-nums text-brand">
      {children}
    </strong>
  );
}

type Tile = {
  slug: string;
  name: string;
  tagline: string | null;
  images: { url: string; isCover: boolean }[];
  parent: { name: string } | null;
};

function Collage({ items }: { items: Tile[] }) {
  const [a, b, c] = items;
  const cell =
    "relative block overflow-hidden bg-muted ring-1 ring-black/5";
  const frame =
    "bg-card p-1.5 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.45)]";

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(60%_60%_at_70%_30%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%)]"
      />

      <div className="grid grid-cols-5 items-center gap-3 sm:gap-4">
        <div className={cn(frame, "col-span-3")}>
          <Shot p={a} ratio="aspect-[4/3]" className={cell} sizes="30vw" />
        </div>
        <div className={cn(frame, "col-span-2 -translate-y-4 sm:-translate-y-6")}>
          <Shot p={b} ratio="aspect-[3/4]" className={cell} sizes="20vw" />
        </div>
        {c && (
          <div className={cn(frame, "col-span-5 -translate-y-8 sm:-translate-y-12")}>
            <Shot p={c} ratio="aspect-[21/9]" className={cell} sizes="50vw" />
          </div>
        )}
      </div>
    </div>
  );
}

function Shot({
  p,
  ratio,
  className,
  sizes,
}: {
  p: Tile;
  ratio: string;
  className: string;
  sizes: string;
}) {
  return (
    <span className={cn(className, ratio)}>
      <Image
        src={coverUrl(p.images, p.slug, 720, 720)}
        alt=""
        fill
        sizes={`(min-width: 1024px) ${sizes}, 45vw`}
        className="object-cover"
      />
    </span>
  );
}

function FlightPath() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-44 w-full -translate-y-1/2 text-primary/25 sm:block"
    >
      <path
        d="M40 170 C 260 40, 420 40, 600 110 S 940 180, 1160 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="7 9"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function PlaceTile({ p }: { p: Tile }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className={cn(R_CARD, "group flex h-full flex-col border border-border bg-card p-2 transition-colors duration-200 hover:border-foreground")}
    >
      <span className={cn(R_BADGE, "relative block aspect-[4/3] overflow-hidden bg-muted")}>
        <Image
          src={coverUrl(p.images, p.slug, 560, 420)}
          alt=""
          fill
          sizes="(min-width: 1024px) 22vw, 45vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col px-2 pb-1.5 pt-3">
        {p.parent?.name && (
          <span className={cn(MICRO, "mb-1.5 truncate text-warm-ink")}>
            {p.parent.name}
          </span>
        )}
        <span className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight underline-offset-4 group-hover:underline">
          {p.name}
        </span>
        {p.tagline && (
          <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {p.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}

function LeadTile({ p, thumbs }: { p: Tile; thumbs: Tile[] }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className={cn(R_CARD, "group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden bg-muted p-6 sm:min-h-[26rem] sm:p-8 lg:min-h-full")}
    >
      <Image
        src={coverUrl(p.images, p.slug, 1200, 900)}
        alt=""
        fill
        sizes="(min-width: 1024px) 46vw, 92vw"
        className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,22,15,0.9)_0%,rgba(8,22,15,0.55)_38%,rgba(8,22,15,0.05)_72%)]"
      />

      {thumbs.length > 0 && (
        <span
          aria-hidden
          className="absolute right-5 top-5 hidden gap-2 sm:flex"
        >
          {thumbs.map((t) => (
            <span
              key={t.slug}
              className={cn(R_BADGE, "relative block size-14 overflow-hidden bg-card/20 ring-2 ring-white/70")}
            >
              <Image
                src={coverUrl(t.images, t.slug, 160, 160)}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
          ))}
        </span>
      )}

      <span className="relative max-w-md">
        {p.parent?.name && (
          <span className={cn(MICRO, "block text-[#f6c98a]")}>
            {p.parent.name}
          </span>
        )}
        <span className="mt-2 block font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.6vw,2rem)] font-semibold leading-tight tracking-tight text-white">
          {p.name}
        </span>
        {p.tagline && (
          <span className="mt-2.5 line-clamp-2 block text-sm leading-relaxed text-[#f7e7d6]">
            {p.tagline}
          </span>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          Mở trang điểm đến
          <Ic
            icon="arrow-right"
            className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
          />
        </span>
      </span>
    </Link>
  );
}

type TripRow = {
  slug: string | null;
  title: string;
  summary: string | null;
  images: { url: string; isCover: boolean }[];
  place: { name: string; parent: { name: string } | null } | null;
  _count: { days: number };
};

function TripTile({ t, wide }: { t: TripRow; wide?: boolean }) {
  const nights = Math.max(0, t._count.days - 1);
  return (
    <Link
      href={`/lich-trinh/${t.slug}`}
      className={cn(
        "group relative isolate flex flex-col justify-end overflow-hidden bg-muted p-5",
        wide ? "min-h-[18rem] sm:min-h-[20rem]" : "min-h-[18rem]",
      )}
    >
      <Image
        src={coverUrl(t.images, t.slug ?? t.title, 900, 700)}
        alt=""
        fill
        sizes={wide ? "(min-width: 1024px) 46vw, 92vw" : "(min-width: 1024px) 23vw, 46vw"}
        className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,22,15,0.88)_0%,rgba(8,22,15,0.45)_45%,rgba(8,22,15,0.05)_78%)]"
      />

      <span className="absolute right-4 top-4 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] tabular-nums text-neutral-900 shadow-sm">
        {t._count.days} ngày{nights > 0 && ` ${nights} đêm`}
      </span>

      <span className="relative">
        {t.place?.name && (
          <span className={cn(MICRO, "block text-[#f6c98a]")}>
            {t.place.name}
          </span>
        )}
        <span className="mt-1.5 line-clamp-2 block font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight text-white">
          {t.title}
        </span>
        {wide && t.summary && (
          <span className="mt-2 line-clamp-2 block max-w-md text-sm leading-relaxed text-[#f7e7d6]">
            {t.summary}
          </span>
        )}
      </span>
    </Link>
  );
}

type PostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  images: { url: string; isCover: boolean }[];
};

function PostTile({ p }: { p: PostRow }) {
  return (
    <Link href={`/blog/${p.slug}`} className="group flex flex-col">
      <span className={cn(R_CARD, "relative block aspect-[16/10] overflow-hidden bg-muted")}>
        <Image
          src={coverUrl(p.images, p.slug, 640, 400)}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10"
        />
      </span>
      <span className="mt-4 flex min-w-0 flex-col">
        {p.category && (
          <span className={cn(MICRO, "mb-2 text-warm-ink")}>
            {label(POST_CATEGORY_LABELS, p.category)}
          </span>
        )}
        <span className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
          {p.title}
        </span>
        {p.excerpt && (
          <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {p.excerpt}
          </span>
        )}
        <span className="mt-3 text-xs text-muted-foreground">
          {dateFmt.format(p.publishedAt ?? p.createdAt)}
        </span>
      </span>
    </Link>
  );
}
