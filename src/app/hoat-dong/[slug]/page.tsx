import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Gauge,
  Clock,
  CalendarDays,
  Banknote,
  Building2,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import {
  ACTIVITY_CATEGORY_LABELS,
  SPOT_CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { isStaffViewer } from "@/lib/preview";
import { CrossLinkCard } from "@/components/site/cross-link-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pub = { status: "published" as const };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await prisma.activity.findUnique({
    where: { slug },
    select: { name: true, description: true, status: true },
  });
  if (!a || a.status !== "published") return {};
  return { title: a.name, description: a.description ?? undefined };
}

export default async function ActivityPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const activity = await prisma.activity.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      status: true,
      difficulty: true,
      durationText: true,
      seasonText: true,
      operatorName: true,
      bookingUrl: true,
      website: true,
      priceRange: true,
      tags: true,
      place: { select: { slug: true, name: true } },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          category: true,
          images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
        },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  const staff = await isStaffViewer();
  if (!activity || (activity.status !== "published" && !staff)) notFound();

  const heroUrl = coverUrl(activity.images, activity.slug, 1800, 1000);
  const gallery = activity.images.filter((i) => i.url !== heroUrl);
  const facts = [
    { icon: Gauge, label: "Độ khó", value: label(DIFFICULTY_LABELS, activity.difficulty) },
    { icon: Clock, label: "Thời lượng", value: activity.durationText },
    { icon: CalendarDays, label: "Mùa / thời điểm", value: activity.seasonText },
    { icon: Banknote, label: "Mức giá", value: label(PRICE_LABELS, activity.priceRange) },
    { icon: Building2, label: "Đơn vị", value: activity.operatorName },
  ].filter((f) => f.value);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="activity" id={activity.id} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[340px] w-full sm:h-[420px]">
          <Image
            src={heroUrl}
            alt={activity.images[0]?.alt ?? activity.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-10 text-white sm:px-6 sm:pb-12">
              <nav className="flex flex-wrap items-center gap-1 text-sm text-white/80">
                <Link href="/" className="hover:text-white">
                  Trang chủ
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <Link href="/diem-den" className="hover:text-white">
                  Điểm đến
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <Link
                  href={`/diem-den/${activity.place.slug}`}
                  className="hover:text-white"
                >
                  {activity.place.name}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <span className="text-white">{activity.name}</span>
              </nav>
              {activity.category && (
                <p className="mt-4 text-sm font-medium text-white/80">
                  {label(ACTIVITY_CATEGORY_LABELS, activity.category)}
                </p>
              )}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {activity.name}
              </h1>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="space-y-10 lg:col-span-2">
              {activity.description && (
                <section>
                  <p className="whitespace-pre-line text-base leading-7 text-foreground/90">
                    {activity.description}
                  </p>
                </section>
              )}

              {gallery.length > 0 && (
                <section>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.slice(0, 6).map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? activity.name}
                          fill
                          sizes="(min-width: 640px) 33vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Diễn ra ở đâu */}
              {activity.spots.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Diễn ra ở đâu
                  </h2>
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {activity.spots.map((s) => (
                      <CrossLinkCard
                        key={s.slug}
                        href={`/dia-diem/${s.slug}`}
                        name={s.name}
                        slug={s.slug}
                        images={s.images}
                        subtitle={label(SPOT_CATEGORY_LABELS, s.category)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {facts.length > 0 && (
                <div className="rounded-2xl border p-5">
                  <h2 className="text-sm font-semibold">Thông tin</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    {facts.map((f) => (
                      <div key={f.label} className="flex gap-2.5">
                        <f.icon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {f.label}
                          </dt>
                          <dd>{f.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {activity.bookingUrl && (
                <a
                  href={activity.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "w-full")}
                >
                  Đặt chỗ ngay
                  <ExternalLink className="size-4" />
                </a>
              )}
              {activity.website && (
                <a
                  href={activity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Website <ExternalLink className="size-3.5" />
                </a>
              )}

              {activity.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activity.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
        <RelatedPosts type="activity" id={activity.id} />
      </main>

      <SiteFooter />
    </div>
  );
}
