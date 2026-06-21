import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Star,
  MapPin,
  ImageOff,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { parseTicketTiers, tierPriceLabel } from "@/lib/tickets";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityAdminControls } from "../admin-controls";
import { ACTIVITY_CATEGORIES, labelOf } from "../constants";
import { SPOT_CATEGORIES } from "../../spots/constants";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      status: true,
      isFeatured: true,
      order: true,
      durationText: true,
      seasonText: true,
      operatorName: true,
      bookingUrl: true,
      phone: true,
      website: true,
      ticketFree: true,
      ticketTiers: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      spotLinks: {
        orderBy: { order: "asc" },
        select: {
          spot: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              category: true,
              images: {
                where: { isCover: true },
                take: 1,
                select: { url: true, isCover: true },
              },
            },
          },
        },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!activity) notFound();

  const published = activity.status === "published";
  const cover =
    activity.images.find((i) => i.isCover) ?? activity.images[0] ?? null;
  const gallery = activity.images.filter((i) => i.id !== cover?.id);
  const tiers = parseTicketTiers(activity.ticketTiers);
  const facts = [
    { label: "Loại", value: labelOf(ACTIVITY_CATEGORIES, activity.category) },
    { label: "Thời lượng", value: activity.durationText },
    { label: "Mùa", value: activity.seasonText },
    { label: "Đơn vị", value: activity.operatorName },
    { label: "Điện thoại", value: activity.phone },
  ].filter((f) => f.value);

  return (
    <div className="p-6 sm:p-8">
      {/* Breadcrumb + tiêu đề + hành động */}
      <Link
        href="/cms/activities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Hoạt động
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {activity.name}
            </h1>
            {activity.isFeatured && (
              <Star
                className="size-4 fill-primary text-primary"
                aria-label="Nổi bật"
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Hoạt động</Badge>
            {activity.category && (
              <Badge variant="outline">
                {labelOf(ACTIVITY_CATEGORIES, activity.category)}
              </Badge>
            )}
            <Badge variant={published ? "default" : "outline"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </Badge>
            <Link
              href={`/cms/places/${activity.place.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              {activity.place.name}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/hoat-dong/${activity.slug}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink className="size-4" />
            Xem web
          </Link>
          <Link
            href={`/cms/activities/${activity.id}/edit`}
            className={cn(buttonVariants())}
          >
            <Pencil className="size-4" />
            Sửa
          </Link>
        </div>
      </div>

      {/* Bố cục 2 cột: nội dung + sidebar meta */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Ảnh */}
          <section>
            {cover ? (
              <div className="flex max-w-2xl gap-3">
                <div className="relative aspect-[16/9] max-h-72 flex-1 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={cover.url}
                    alt={cover.alt ?? activity.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 32rem"
                    className="object-cover"
                    priority
                  />
                </div>
                {gallery.length > 0 && (
                  <div className="flex max-h-72 w-16 shrink-0 flex-col gap-2 overflow-y-auto sm:w-20">
                    {gallery.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square shrink-0 overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? activity.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-[16/9] max-h-72 max-w-xl flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
                <ImageOff className="size-7" aria-hidden />
                <p className="text-sm">Chưa có ảnh</p>
                <Link
                  href={`/cms/activities/${activity.id}/edit`}
                  className="text-sm text-primary hover:underline"
                >
                  Thêm ảnh
                </Link>
              </div>
            )}
          </section>

          {/* Mô tả */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Mô tả</h2>
            {activity.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {activity.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có mô tả.
              </p>
            )}
          </section>

          {/* Diễn ra ở đâu (Spot liên kết) */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              Diễn ra ở đâu ({activity.spotLinks.length})
            </h2>
            {activity.spotLinks.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {activity.spotLinks.map(({ spot: s }) => (
                  <Link
                    key={s.id}
                    href={`/cms/spots/${s.id}`}
                    className="group flex items-center gap-3 rounded-xl border p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={coverUrl(s.images, s.slug, 128, 128)}
                        alt={s.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{s.name}</span>
                        {s.status !== "published" && (
                          <Badge variant="outline" className="shrink-0">
                            Nháp
                          </Badge>
                        )}
                      </div>
                      {s.category && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {labelOf(SPOT_CATEGORIES, s.category)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa liên kết địa điểm nào.
                </p>
                <Link
                  href={`/cms/activities/${activity.id}/edit`}
                  className="mt-1 inline-block text-sm text-primary hover:underline"
                >
                  Thêm địa điểm
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar meta */}
        <aside className="space-y-4">
          <ActivityAdminControls
            id={activity.id}
            status={activity.status}
            isFeatured={activity.isFeatured}
            order={activity.order}
          />

          {(activity.ticketFree || tiers.length > 0) && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Giá vé</h3>
              {activity.ticketFree ? (
                <p className="mt-3 text-sm font-medium text-primary">Miễn phí</p>
              ) : (
                <dl className="mt-3 space-y-2 text-sm">
                  {tiers.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <dt className="text-muted-foreground">
                        {t.label}
                        {t.note && (
                          <span className="ml-1 text-xs">({t.note})</span>
                        )}
                      </dt>
                      <dd className="text-right font-medium tabular-nums">
                        {tierPriceLabel(t)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Thông tin</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <Meta label="Slug">
                <span className="font-mono text-xs">
                  /hoat-dong/{activity.slug}
                </span>
              </Meta>
              {facts.map((f) => (
                <Meta key={f.label} label={f.label}>
                  {f.value}
                </Meta>
              ))}
              <Meta label="Tạo lúc">{dateFmt.format(activity.createdAt)}</Meta>
              <Meta label="Cập nhật">{dateFmt.format(activity.updatedAt)}</Meta>
            </dl>
          </div>

          {(activity.bookingUrl || activity.website) && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Liên kết</h3>
              <div className="mt-3 space-y-2 text-sm">
                {activity.bookingUrl && (
                  <a
                    href={activity.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> Đặt chỗ
                  </a>
                )}
                {activity.website && (
                  <a
                    href={activity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> Website
                  </a>
                )}
              </div>
            </div>
          )}

          {activity.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activity.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
