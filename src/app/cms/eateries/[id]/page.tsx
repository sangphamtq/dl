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
  TriangleAlert,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EateryAdminControls } from "../admin-controls";
import { EATERY_CATEGORIES, MEALS, PRICE_RANGES, labelOf } from "../constants";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function EateryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const eatery = await prisma.eatery.findUnique({
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
      website: true,
      bookingUrl: true,
      mapUrl: true,
      priceRange: true,
      meals: true,
      notice: true,
      tags: true,
      provinceName: true,
      districtName: true,
      wardName: true,
      createdAt: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      specialties: {
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          kind: true,
          images: {
            where: { isCover: true },
            take: 1,
            select: { url: true, isCover: true },
          },
        },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!eatery) notFound();

  const published = eatery.status === "published";
  const cover = eatery.images.find((i) => i.isCover) ?? eatery.images[0] ?? null;
  const gallery = eatery.images.filter((i) => i.id !== cover?.id);
  const mealLabels = eatery.meals
    .map((m) => labelOf(MEALS, m))
    .filter(Boolean) as string[];
  const facts = [
    { label: "Giá", value: labelOf(PRICE_RANGES, eatery.priceRange) },
    { label: "Giờ mở cửa", value: eatery.openingHours },
    { label: "Bữa", value: mealLabels.join(", ") || null },
    { label: "Địa chỉ", value: eatery.address },
    {
      label: "Khu vực",
      value:
        [eatery.wardName, eatery.districtName, eatery.provinceName]
          .filter(Boolean)
          .join(", ") || null,
    },
    {
      label: "Toạ độ",
      value:
        eatery.lat != null && eatery.lng != null
          ? `${eatery.lat}, ${eatery.lng}`
          : null,
    },
  ].filter((f) => f.value);

  const hasMap = eatery.lat != null && eatery.lng != null;

  return (
    <div className="p-6 sm:p-8">
      {/* Breadcrumb + tiêu đề + hành động */}
      <Link
        href="/cms/eateries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quán ăn
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {eatery.name}
            </h1>
            {eatery.isFeatured && (
              <Star
                className="size-4 fill-primary text-primary"
                aria-label="Nổi bật"
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Quán ăn</Badge>
            {eatery.category && (
              <Badge variant="outline">
                {labelOf(EATERY_CATEGORIES, eatery.category)}
              </Badge>
            )}
            <Badge variant={published ? "default" : "outline"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </Badge>
            <Link
              href={`/cms/places/${eatery.place.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              {eatery.place.name}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/quan-an/${eatery.slug}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink className="size-4" />
            Xem web
          </Link>
          <Link
            href={`/cms/eateries/${eatery.id}/edit`}
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
                    alt={cover.alt ?? eatery.name}
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
                          alt={img.alt ?? eatery.name}
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
                  href={`/cms/eateries/${eatery.id}/edit`}
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
            {eatery.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {eatery.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có mô tả.
              </p>
            )}
          </section>

          {/* Đặc sản tại đây (read-only) */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              Đặc sản tại đây ({eatery.specialties.length})
            </h2>
            {eatery.specialties.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {eatery.specialties.map((s) => (
                  <Link
                    key={s.id}
                    href={`/cms/specialties/${s.id}`}
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
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.kind === "product" ? "Sản vật / quà" : "Món ăn"}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa có đặc sản nào liên kết.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Liên kết được quản lý ở phần Đặc sản.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar meta */}
        <aside className="space-y-4">
          <EateryAdminControls
            id={eatery.id}
            status={eatery.status}
            isFeatured={eatery.isFeatured}
            order={eatery.order}
          />

          {eatery.notice && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span>{eatery.notice}</span>
            </div>
          )}

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Thông tin</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <Meta label="Slug">
                <span className="font-mono text-xs">/quan-an/{eatery.slug}</span>
              </Meta>
              {facts.map((f) => (
                <Meta key={f.label} label={f.label}>
                  {f.value}
                </Meta>
              ))}
              {eatery.mapUrl && (
                <Meta label="Bản đồ">
                  <a
                    href={eatery.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Mở bản đồ
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </Meta>
              )}
              <Meta label="Tạo lúc">{dateFmt.format(eatery.createdAt)}</Meta>
              <Meta label="Cập nhật">{dateFmt.format(eatery.updatedAt)}</Meta>
            </dl>
          </div>

          {(eatery.bookingUrl || eatery.website) && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Liên kết</h3>
              <div className="mt-3 space-y-2 text-sm">
                {eatery.bookingUrl && (
                  <a
                    href={eatery.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> Đặt bàn
                  </a>
                )}
                {eatery.website && (
                  <a
                    href={eatery.website}
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

          {hasMap && (
            <div className="overflow-hidden rounded-xl border">
              <iframe
                title={`Bản đồ ${eatery.name}`}
                className="aspect-video w-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${eatery.lng! - 0.01}%2C${eatery.lat! - 0.01}%2C${eatery.lng! + 0.01}%2C${eatery.lat! + 0.01}&layer=mapnik&marker=${eatery.lat}%2C${eatery.lng}`}
              />
            </div>
          )}

          {eatery.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {eatery.tags.map((t) => (
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
