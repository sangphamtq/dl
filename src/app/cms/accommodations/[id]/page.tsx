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
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccommodationAdminControls } from "../admin-controls";
import { ACCOMMODATION_CATEGORIES, PRICE_RANGES, labelOf } from "../constants";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const acc = await prisma.accommodation.findUnique({
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
      website: true,
      bookingUrl: true,
      priceRange: true,
      tags: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!acc) notFound();

  const published = acc.status === "published";
  const cover = acc.images.find((i) => i.isCover) ?? acc.images[0] ?? null;
  const facts = [
    { label: "Loại hình", value: labelOf(ACCOMMODATION_CATEGORIES, acc.category) },
    { label: "Giá", value: labelOf(PRICE_RANGES, acc.priceRange) },
    { label: "Địa chỉ", value: acc.address },
    {
      label: "Toạ độ",
      value: acc.lat != null && acc.lng != null ? `${acc.lat}, ${acc.lng}` : null,
    },
  ].filter((f) => f.value);
  const hasMap = acc.lat != null && acc.lng != null;

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/cms/accommodations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Lưu trú
      </Link>

      <div className="rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-56">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? acc.name}
                fill
                sizes="(max-width: 640px) 100vw, 14rem"
                className="object-cover"
                priority
              />
            ) : (
              <Link
                href={`/cms/accommodations/${acc.id}/edit`}
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
                <Badge variant="secondary">Lưu trú</Badge>
                {acc.category && (
                  <Badge variant="outline">
                    {labelOf(ACCOMMODATION_CATEGORIES, acc.category)}
                  </Badge>
                )}
                <Badge variant={published ? "default" : "outline"}>
                  {published ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
                {acc.isFeatured && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current" aria-hidden />
                    Nổi bật
                  </Badge>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Link
                  href={`/luu-tru/${acc.slug}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <ExternalLink className="size-4" />
                  Xem web
                </Link>
                <Link
                  href={`/cms/accommodations/${acc.id}/edit`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Pencil className="size-4" />
                  Sửa
                </Link>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {acc.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <Link
                href={`/cms/places/${acc.place.id}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <MapPin className="size-3.5" aria-hidden />
                {acc.place.name}
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-2 sm:hidden">
              <Link
                href={`/cms/accommodations/${acc.id}/edit`}
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                <Pencil className="size-4" />
                Sửa
              </Link>
              <Link
                href={`/luu-tru/${acc.slug}`}
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Mô tả</h2>
            {acc.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {acc.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có mô tả.</p>
            )}
          </section>

          {acc.images.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Thư viện ảnh
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {acc.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? acc.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <AccommodationAdminControls
            id={acc.id}
            status={acc.status}
            isFeatured={acc.isFeatured}
            order={acc.order}
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
                    /luu-tru/{acc.slug}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Cập nhật</dt>
                  <dd className="text-right">{dateFmt.format(acc.updatedAt)}</dd>
                </div>
              </dl>
              {acc.bookingUrl && (
                <a
                  href={acc.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Đặt phòng <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}

          {hasMap && (
            <div className="overflow-hidden rounded-xl border">
              <iframe
                title={`Bản đồ ${acc.name}`}
                className="aspect-video w-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${acc.lng! - 0.01}%2C${acc.lat! - 0.01}%2C${acc.lng! + 0.01}%2C${acc.lat! + 0.01}&layer=mapnik&marker=${acc.lat}%2C${acc.lng}`}
              />
            </div>
          )}

          {acc.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {acc.tags.map((t) => (
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
