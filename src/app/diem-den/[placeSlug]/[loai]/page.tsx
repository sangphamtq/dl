import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CrossLinkCard } from "@/components/site/cross-link-card";

// Map token [loai] → model + tiêu đề + tiền tố URL chi tiết.
const LOAI = {
  "hoat-dong": { title: "Hoạt động & trải nghiệm", model: "activity" },
  "dia-diem": { title: "Địa điểm tham quan", model: "spot" },
  "dac-san": { title: "Đặc sản", model: "specialty" },
  "quan-an": { title: "Quán ăn", model: "eatery" },
  "luu-tru": { title: "Nơi lưu trú", model: "accommodation" },
} as const;

type Loai = keyof typeof LOAI;

type ListingItem = {
  slug: string;
  name: string;
  description: string | null;
  images: { url: string; isCover: boolean }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const cfg = LOAI[loai as Loai];
  if (!cfg) return {};
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true },
  });
  if (!place) return {};
  return { title: `${cfg.title} ở ${place.name}` };
}

export default async function PlaceListingPage({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const cfg = LOAI[loai as Loai];
  if (!cfg) notFound();

  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { id: true, slug: true, name: true, status: true },
  });
  if (!place || place.status !== "published") notFound();

  // Truy vấn động theo model (tên trùng key model).
  const delegate = prisma[cfg.model] as unknown as {
    findMany: (args: unknown) => Promise<ListingItem[]>;
  };
  const items = await delegate.findMany({
    where: { placeId: place.id, status: "published" },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      description: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/diem-den" className="hover:text-foreground">
              Điểm đến
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link
              href={`/diem-den/${place.slug}`}
              className="hover:text-foreground"
            >
              {place.name}
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="text-foreground">{cfg.title}</span>
          </nav>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {cfg.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tại {place.name} · {items.length} mục
          </p>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((it) => (
                <CrossLinkCard
                  key={it.slug}
                  href={`/${loai}/${it.slug}`}
                  name={it.name}
                  slug={it.slug}
                  images={it.images}
                  subtitle={it.description}
                />
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-muted-foreground">
              Chưa có nội dung trong mục này.
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
