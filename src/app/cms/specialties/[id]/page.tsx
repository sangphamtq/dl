import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Star,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  ImageOff,
  ImagePlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpecialtyAdminControls } from "../admin-controls";
import { PRICE_RANGES, labelOf } from "../constants";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function SpecialtyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const specialty = await prisma.specialty.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      kind: true,
      whereToBuy: true,
      priceRange: true,
      status: true,
      isFeatured: true,
      order: true,
      tags: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      eateries: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!specialty) notFound();

  const published = specialty.status === "published";
  const isProduct = specialty.kind === "product";
  const cover =
    specialty.images.find((i) => i.isCover) ?? specialty.images[0] ?? null;

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/cms/specialties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Đặc sản
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-56">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? specialty.name}
                fill
                sizes="(max-width: 640px) 100vw, 14rem"
                className="object-cover"
                priority
              />
            ) : (
              <Link
                href={`/cms/specialties/${specialty.id}/edit`}
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
                <Badge variant="secondary">Đặc sản</Badge>
                <Badge variant="outline" className="gap-1">
                  {isProduct ? (
                    <>
                      <ShoppingBag className="size-3" aria-hidden /> Sản vật
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="size-3" aria-hidden /> Món ăn
                    </>
                  )}
                </Badge>
                <Badge variant={published ? "default" : "outline"}>
                  {published ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
                {specialty.isFeatured && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current" aria-hidden />
                    Nổi bật
                  </Badge>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Link
                  href={`/dac-san/${specialty.slug}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <ExternalLink className="size-4" />
                  Xem web
                </Link>
                <Link
                  href={`/cms/specialties/${specialty.id}/edit`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Pencil className="size-4" />
                  Sửa
                </Link>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {specialty.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <Link
                href={`/cms/places/${specialty.place.id}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <MapPin className="size-3.5" aria-hidden />
                {specialty.place.name}
              </Link>
              {specialty.priceRange && (
                <span>{labelOf(PRICE_RANGES, specialty.priceRange)}</span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 sm:hidden">
              <Link
                href={`/cms/specialties/${specialty.id}/edit`}
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                <Pencil className="size-4" />
                Sửa
              </Link>
              <Link
                href={`/dac-san/${specialty.slug}`}
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
            {specialty.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {specialty.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có mô tả.</p>
            )}
          </section>

          {specialty.images.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Thư viện ảnh
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {specialty.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? specialty.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Mua ở đâu (product) / Ăn ở đâu (dish) */}
          {isProduct ? (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">Mua ở đâu</h2>
              {specialty.whereToBuy ? (
                <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                  {specialty.whereToBuy}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa ghi nơi mua.
                </p>
              )}
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight">
                  Ăn ở đâu
                </h2>
                <span className="text-sm text-muted-foreground">
                  {specialty.eateries.length} quán
                </span>
              </div>
              {specialty.eateries.length > 0 ? (
                <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
                  {specialty.eateries.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/cms/eateries/${e.id}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <UtensilsCrossed className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate font-medium">
                          {e.name}
                        </span>
                        <Badge
                          variant={
                            e.status === "published" ? "default" : "outline"
                          }
                        >
                          {e.status === "published" ? "Xuất bản" : "Nháp"}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa liên kết quán nào. Thêm ở trang sửa.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <SpecialtyAdminControls
            id={specialty.id}
            status={specialty.status}
            isFeatured={specialty.isFeatured}
            order={specialty.order}
          />

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Thông tin</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Loại</dt>
                <dd className="text-right">
                  {isProduct ? "Sản vật / quà" : "Món ăn"}
                </dd>
              </div>
              {specialty.priceRange && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Giá</dt>
                  <dd className="text-right">
                    {labelOf(PRICE_RANGES, specialty.priceRange)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="text-right font-mono text-xs">
                  /dac-san/{specialty.slug}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cập nhật</dt>
                <dd className="text-right">
                  {dateFmt.format(specialty.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {specialty.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {specialty.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/cms/specialties/${specialty.id}/edit`}
            className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ImagePlus className="size-4" aria-hidden />
            Quản lý ảnh ({specialty.images.length})
          </Link>
        </aside>
      </div>
    </div>
  );
}
