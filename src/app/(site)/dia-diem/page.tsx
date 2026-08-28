import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";
import { SPOT_CATEGORY_LABELS } from "@/lib/listing-labels";
import { Curtain, Rise, RiseInView } from "@/components/site/reveal";
import { SpotControls } from "@/components/site/spot-controls";
import { SORTS, type SortKey } from "@/lib/spot-sort";
import { SpotCard, type SpotItem } from "@/components/site/spot-card";
import type { Prisma } from "@/generated/prisma/client";
import { SpotCategory } from "@/generated/prisma/enums";

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

const pub = { status: "published" as const };

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";
const PAGE_SIZE = 24;

export const metadata = {
  title: "Địa điểm · Halivivu",
  description:
    "Duyệt mọi địa điểm tham quan trên khắp Việt Nam theo loại hình — biển, núi, thác, hang động, đền chùa…",
};

const ORDER: Record<SortKey, Prisma.SpotOrderByWithRelationInput[]> = {
  "noi-bat": [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
  "pho-bien": [{ popularity: "desc" }, { name: "asc" }],
  "a-z": [{ name: "asc" }],
};

export default async function DiaDiemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || "";
  };

  // Loại hình đến từ URL nên phải KIỂM lại với enum thật: `?loai=<gì đó>` là
  // thứ ai cũng gõ được, mà nhét thẳng vào `where` là Prisma ném lỗi và trang
  // trắng. Giá trị lạ thì coi như không lọc.
  const catRaw = one("loai");
  const cat =
    catRaw && catRaw in SpotCategory ? (catRaw as SpotCategory) : null;
  const q = one("q");
  const sortRaw = one("sap-xep") as SortKey;
  const sort: SortKey = SORTS.some((s) => s.key === sortRaw)
    ? sortRaw
    : "noi-bat";
  const page = Math.max(1, Number(one("trang")) || 1);

  // Tìm kiếm KHÔNG DẤU phải đi qua SQL thô: `contains` của Prisma chỉ bỏ qua
  // hoa/thường, nên gõ "mui ne" sẽ không ra "Mũi Né" — đúng thứ người Việt gõ
  // nhiều nhất. `unaccent` là extension đã có sẵn trong DB này (xem
  // `lib/search.ts`).
  //
  // Chạy riêng một truy vấn lấy slug rồi mới lọc, thay vì viết cả câu SQL cho
  // trang: phần còn lại (lọc loại hình, sắp xếp, phân trang, lấy ảnh bìa) để
  // Prisma lo thì vẫn type-safe.
  let slugs: string[] | null = null;
  if (q) {
    const like = `%${q}%`;
    const rows = await prisma.$queryRaw<{ slug: string }[]>`
      SELECT s.slug
      FROM "Spot" s
      LEFT JOIN "Place" p ON p.id = s."placeId"
      WHERE s.status::text = 'published'
        AND (
          unaccent(s.name) ILIKE unaccent(${like})
          OR unaccent(coalesce(s.tagline, '')) ILIKE unaccent(${like})
          OR unaccent(coalesce(p.name, '')) ILIKE unaccent(${like})
        )
    `;
    slugs = rows.map((r) => r.slug);
  }

  const where: Prisma.SpotWhereInput = {
    ...pub,
    ...(cat ? { category: cat } : {}),
    ...(slugs ? { slug: { in: slugs } } : {}),
  };

  const [spots, total, destCount, catRows] = await Promise.all([
    prisma.spot.findMany({
      where,
      orderBy: ORDER[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        slug: true,
        name: true,
        tagline: true,
        category: true,
        isFeatured: true,
        images: {
          where: { isCover: true },
          take: 1,
          select: { url: true, isCover: true },
        },
        place: { select: { name: true } },
      },
    }),
    prisma.spot.count({ where }),
    prisma.place.count({ where: { kind: "destination", ...pub } }),
    // Số lượng theo loại hình đếm trên TOÀN BỘ danh sách đã xuất bản, không
    // theo bộ lọc đang bật: hàng chip phải nói "chọn cái này thì được bao
    // nhiêu", mà đếm trong phạm vi đang lọc thì mọi chip khác đều ra 0.
    prisma.spot.groupBy({
      by: ["category"],
      where: pub,
      _count: { _all: true },
    }),
  ]);

  const categories = catRows
    .filter((r) => r.category)
    .map((r) => ({
      value: r.category as string,
      label: SPOT_CATEGORY_LABELS[r.category as string] ?? (r.category as string),
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));

  const items: SpotItem[] = spots.map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    categoryLabel: s.category
      ? (SPOT_CATEGORY_LABELS[s.category] ?? s.category)
      : null,
    placeName: s.place?.name ?? null,
    isFeatured: s.isFeatured,
    images: s.images,
  }));

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (cat) next.set("loai", cat);
    if (q) next.set("q", q);
    if (sort !== "noi-bat") next.set("sap-xep", sort);
    if (p > 1) next.set("trang", String(p));
    const qs = next.toString();
    return qs ? `/dia-diem?${qs}` : "/dia-diem";
  };

  return (
    <div className={cn("flex flex-1 flex-col", serif.variable)}>
      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <Image
            src="/halong1.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_42%]"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_84%_92%_at_50%_50%,rgba(8,22,15,0.5)_0%,rgba(8,22,15,0.4)_46%,rgba(8,22,15,0.2)_76%,rgba(8,22,15,0.05)_100%)]"
          />

          <div className="relative mx-auto flex min-h-[clamp(15rem,22vw,18.5rem)] max-w-7xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:min-h-[clamp(19rem,26vw,22.5rem)] lg:pb-12 lg:pt-[7rem]">
            <Curtain>
              <h1 className="font-[family-name:var(--font-serif)] text-[clamp(2.5rem,7.5vw,5.5rem)] font-normal uppercase leading-[1.15] tracking-[0.12em] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.62)] sm:tracking-[0.18em]">
                Địa điểm
              </h1>
            </Curtain>

            <Rise delay={0.18} className="mt-5 sm:mt-6">
              <p className="max-w-[40rem] text-[clamp(1.0625rem,2vw,1.5rem)] font-normal leading-snug text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.72)]">
                Những chỗ đáng dừng chân trên đường đi.
              </p>
            </Rise>

            <Rise delay={0.32} className="mt-8 sm:mt-10">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <HeroLink href="/diem-den" label={`Xem ${destCount} điểm đến`} />
                <HeroLink href="/ban-do" label="Mở bản đồ du lịch" />
              </div>
            </Rise>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
          <SpotControls categories={categories} cat={cat} q={q} sort={sort} />

          {total === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <span className="grid size-12 place-items-center border border-border text-muted-foreground">
                <Ic icon="search" className="size-5" aria-hidden />
              </span>
              <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                Không tìm thấy địa điểm nào
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thử một tên khác, hoặc tên nơi chứa địa điểm đó.
              </p>
              <Link
                href="/dia-diem"
                className="mt-5 inline-flex h-9 items-center border border-border px-4 text-sm font-medium transition-colors hover:border-foreground"
              >
                Xóa bộ lọc
              </Link>
            </div>
          ) : (
            <>
              <p className={cn(MICRO, "mt-8 text-muted-foreground")}>
                <span className="text-foreground tabular-nums">{total}</span>{" "}
                địa điểm
                {lastPage > 1 && (
                  <span className="tabular-nums">
                    {" "}
                    · trang {page}/{lastPage}
                  </span>
                )}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s, i) => (
                  <RiseInView key={s.slug} delay={Math.min(i, 5) * 0.05}>
                    <SpotCard s={s} />
                  </RiseInView>
                ))}
              </div>

              {lastPage > 1 && (
                <nav
                  aria-label="Phân trang"
                  className="mt-12 flex items-center justify-center gap-2"
                >
                  <PageLink href={hrefFor(page - 1)} disabled={page === 1}>
                    Trước
                  </PageLink>
                  {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={hrefFor(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={cn(
                        MICRO,
                        "grid h-9 min-w-9 place-items-center px-2 tabular-nums transition-colors",
                        p === page
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                      )}
                    >
                      {p}
                    </Link>
                  ))}
                  <PageLink
                    href={hrefFor(page + 1)}
                    disabled={page === lastPage}
                  >
                    Sau
                  </PageLink>
                </nav>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled)
    return (
      <span
        aria-disabled
        className={cn(
          MICRO,
          "grid h-9 place-items-center border border-border/50 px-3 text-muted-foreground/40",
        )}
      >
        {children}
      </span>
    );
  return (
    <Link
      href={href}
      className={cn(
        MICRO,
        "grid h-9 place-items-center border border-border px-3 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function HeroLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative inline-flex h-12 items-center px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_-10px_rgba(8,22,15,0.75)] backdrop-blur-[2px] backdrop-saturate-[1.3] [text-shadow:0_1px_3px_rgba(8,22,15,0.6),0_2px_16px_rgba(8,22,15,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[0.8125rem]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.22] via-white/[0.07] to-white/[0.02] transition-colors duration-200 group-hover:from-white/40 group-hover:via-white/20 group-hover:to-white/10 motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(255,255,255,0.18)] ring-1 ring-inset ring-white/40 transition-shadow duration-200 group-hover:ring-white/75 motion-reduce:transition-none"
      />
      <span className="relative">{label}</span>
    </Link>
  );
}
