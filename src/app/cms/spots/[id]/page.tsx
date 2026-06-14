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
  ImagePlus,
  TriangleAlert,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotAdminControls } from "../admin-controls";
import { SPOT_CATEGORIES, PRICE_RANGES, labelOf } from "../constants";

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
      priceRange: true,
      bestTime: true,
      ticketInfo: true,
      notice: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      activities: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
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
  const facts = [
    { label: "Loại", value: labelOf(SPOT_CATEGORIES, spot.category) },
    { label: "Giá", value: labelOf(PRICE_RANGES, spot.priceRange) },
    { label: "Vé", value: spot.ticketInfo },
    { label: "Giờ mở cửa", value: spot.openingHours },
    { label: "Thời điểm đẹp", value: spot.bestTime },
    { label: "Địa chỉ", value: spot.address },
    {
      label: "Toạ độ",
      value: spot.lat != null && spot.lng != null ? `${spot.lat}, ${spot.lng}` : null,
    },
  ].filter((f) => f.value);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/cms/spots"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Địa điểm nhỏ
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-56">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? spot.name}
                fill
                sizes="(max-width: 640px) 100vw, 14rem"
                className="object-cover"
                priority
              />
            ) : (
              <Link
                href={`/cms/spots/${spot.id}/edit`}
                className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ImageOff className="size-6" aria-hidden />
                <span className="text-xs">Chưa có ảnh</span>
              </Link>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Địa điểm nhỏ</Badge>
                {spot.category && (
                  <Badge variant="outline">
                    {labelOf(SPOT_CATEGORIES, spot.category)}
                  </Badge>
                )}
                <Badge variant={published ? "default" : "outline"}>
                  {published ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
                {spot.isFeatured && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current" aria-hidden />
                    Nổi bật
                  </Badge>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Link
                  href={`/dia-diem/${spot.slug}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <ExternalLink className="size-4" />
                  Xem web
                </Link>
                <Link
                  href={`/cms/spots/${spot.id}/edit`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Pencil className="size-4" />
                  Sửa
                </Link>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {spot.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <Link
                href={`/cms/places/${spot.place.id}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <MapPin className="size-3.5" aria-hidden />
                {spot.place.name}
              </Link>
              {spot.address && (
                <span className="truncate">{spot.address}</span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 sm:hidden">
              <Link
                href={`/cms/spots/${spot.id}/edit`}
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                <Pencil className="size-4" />
                Sửa
              </Link>
              <Link
                href={`/dia-diem/${spot.slug}`}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1",
                )}
              >
                <ExternalLink className="size-4" />
                Xem web
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo */}
      {spot.notice && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-amber-600"
            aria-hidden
          />
          <span>{spot.notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Mô tả</h2>
            {spot.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {spot.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có mô tả.</p>
            )}
          </section>

          {spot.images.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Thư viện ảnh
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {spot.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? spot.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hoạt động liên kết (read-only) */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Hoạt động tại đây
              </h2>
              <span className="text-sm text-muted-foreground">
                {spot.activities.length} mục
              </span>
            </div>
            {spot.activities.length > 0 ? (
              <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
                {spot.activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <Compass className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{a.name}</span>
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
                Chưa có hoạt động nào liên kết. Liên kết được quản lý ở phần Hoạt
                động.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <SpotAdminControls
            id={spot.id}
            status={spot.status}
            isFeatured={spot.isFeatured}
            order={spot.order}
          />

          {facts.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Thông tin</h3>
              <dl className="mt-3 space-y-3 text-sm">
                {facts.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="text-right">{f.value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd className="text-right font-mono text-xs">
                    /dia-diem/{spot.slug}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Cập nhật</dt>
                  <dd className="text-right">{dateFmt.format(spot.updatedAt)}</dd>
                </div>
              </dl>
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

          <Link
            href={`/cms/spots/${spot.id}/edit`}
            className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ImagePlus className="size-4" aria-hidden />
            Quản lý ảnh ({spot.images.length})
          </Link>
        </aside>
      </div>
    </div>
  );
}
