import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Star,
  MapPin,
  Compass,
  ImageOff,
  TriangleAlert,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { parseTicketTiers, tierPriceLabel } from "@/lib/tickets";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotAdminControls } from "../admin-controls";
import { SPOT_CATEGORIES, labelOf } from "../constants";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const spot = await prisma.spot.findUnique({
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
      address: true,
      lat: true,
      lng: true,
      openingHours: true,
      phone: true,
      website: true,
      bookingUrl: true,
      mapUrl: true,
      bestTime: true,
      ticketFree: true,
      ticketTiers: true,
      ticketInfo: true,
      notice: true,
      tags: true,
      provinceName: true,
      districtName: true,
      wardName: true,
      createdAt: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      activityLinks: {
        orderBy: { order: "asc" },
        select: {
          blurb: true,
          activity: { select: { id: true, name: true, status: true, kind: true } },
        },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!spot) notFound();

  const published = spot.status === "published";
  const cover = spot.images.find((i) => i.isCover) ?? spot.images[0] ?? null;
  const gallery = spot.images.filter((i) => i.id !== cover?.id);
  const tiers = parseTicketTiers(spot.ticketTiers);
  const hasMap = spot.lat != null && spot.lng != null;
  const facts = [
    { label: "Loại", value: labelOf(SPOT_CATEGORIES, spot.category) },
    { label: "Giờ mở cửa", value: spot.openingHours },
    { label: "Thời điểm đẹp", value: spot.bestTime },
    { label: "Địa chỉ", value: spot.address },
    {
      label: "Khu vực",
      value:
        [spot.wardName, spot.districtName, spot.provinceName]
          .filter(Boolean)
          .join(", ") || null,
    },
    {
      label: "Toạ độ",
      value:
        spot.lat != null && spot.lng != null
          ? `${spot.lat}, ${spot.lng}`
          : null,
    },
  ].filter((f) => f.value);

  return (
    <div className="p-6 sm:p-8">
      {/* Breadcrumb + tiêu đề + hành động */}
      <Link
        href="/cms/spots"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Địa điểm nhỏ
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {spot.name}
            </h1>
            {spot.isFeatured && (
              <Star
                className="size-4 fill-primary text-primary"
                aria-label="Nổi bật"
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Địa điểm nhỏ</Badge>
            {spot.category && (
              <Badge variant="outline">
                {labelOf(SPOT_CATEGORIES, spot.category)}
              </Badge>
            )}
            <Badge variant={published ? "default" : "outline"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </Badge>
            <Link
              href={`/cms/places/${spot.place.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              {spot.place.name}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dia-diem/${spot.slug}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink className="size-4" />
            Xem web
          </Link>
          <Link
            href={`/cms/spots/${spot.id}/edit`}
            className={cn(buttonVariants())}
          >
            <Pencil className="size-4" />
            Sửa
          </Link>
        </div>
      </div>

      {/* Cảnh báo */}
      {spot.notice && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-amber-600"
            aria-hidden
          />
          <span>{spot.notice}</span>
        </div>
      )}

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
                    alt={cover.alt ?? spot.name}
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
                          alt={img.alt ?? spot.name}
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
                  href={`/cms/spots/${spot.id}/edit`}
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
            {spot.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {spot.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có mô tả.
              </p>
            )}
          </section>

          {/* Hoạt động liên kết (read-only) */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Hoạt động tại đây ({spot.activityLinks.length})
              </h2>
            </div>
            {spot.activityLinks.length > 0 ? (
              <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
                {spot.activityLinks.map(({ activity: a, blurb }) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <Compass className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">
                      <span className="font-medium">{a.name}</span>
                      {blurb && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          · có mô tả riêng
                        </span>
                      )}
                    </span>
                    <Badge
                      variant={a.status === "published" ? "default" : "outline"}
                    >
                      {a.status === "published" ? "Xuất bản" : "Nháp"}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có hoạt động nào liên kết. Liên kết được quản lý ở phần
                Hoạt động.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar meta */}
        <aside className="space-y-4">
          <SpotAdminControls
            id={spot.id}
            status={spot.status}
            isFeatured={spot.isFeatured}
            order={spot.order}
          />

          {(spot.ticketFree || tiers.length > 0 || spot.ticketInfo) && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Vé vào cửa</h3>
              {spot.ticketFree ? (
                <p className="mt-3 text-sm font-medium text-primary">Miễn phí</p>
              ) : tiers.length > 0 ? (
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
              ) : null}
              {spot.ticketInfo && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {spot.ticketInfo}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Thông tin</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <Meta label="Slug">
                <span className="font-mono text-xs">/dia-diem/{spot.slug}</span>
              </Meta>
              {facts.map((f) => (
                <Meta key={f.label} label={f.label}>
                  {f.value}
                </Meta>
              ))}
              {spot.mapUrl && (
                <Meta label="Bản đồ">
                  <a
                    href={spot.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Mở bản đồ
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </Meta>
              )}
              <Meta label="Tạo lúc">{dateFmt.format(spot.createdAt)}</Meta>
              <Meta label="Cập nhật">{dateFmt.format(spot.updatedAt)}</Meta>
            </dl>
          </div>

          {hasMap && (
            <div className="overflow-hidden rounded-xl border">
              <iframe
                title={`Bản đồ ${spot.name}`}
                className="aspect-video w-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng! - 0.01}%2C${spot.lat! - 0.01}%2C${spot.lng! + 0.01}%2C${spot.lat! + 0.01}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`}
              />
            </div>
          )}

          {spot.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {spot.tags.map((t) => (
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
