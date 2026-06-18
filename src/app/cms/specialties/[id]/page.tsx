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
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpecialtyAdminControls } from "../admin-controls";
import { labelOf } from "../constants";
import { EATERY_CATEGORIES } from "../../eateries/constants";

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
      status: true,
      isFeatured: true,
      order: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      eateries: {
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
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
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!specialty) notFound();

  const published = specialty.status === "published";
  const cover =
    specialty.images.find((i) => i.isCover) ?? specialty.images[0] ?? null;
  const gallery = specialty.images.filter((i) => i.id !== cover?.id);

  return (
    <div className="p-6 sm:p-8">
      {/* Breadcrumb + tiêu đề + hành động */}
      <Link
        href="/cms/specialties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Đặc sản
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {specialty.name}
            </h1>
            {specialty.isFeatured && (
              <Star
                className="size-4 fill-primary text-primary"
                aria-label="Nổi bật"
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Đặc sản</Badge>
            <Badge variant={published ? "default" : "outline"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </Badge>
            <Link
              href={`/cms/places/${specialty.place.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              {specialty.place.name}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dac-san/${specialty.slug}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink className="size-4" />
            Xem web
          </Link>
          <Link
            href={`/cms/specialties/${specialty.id}/edit`}
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
                    alt={cover.alt ?? specialty.name}
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
                          alt={img.alt ?? specialty.name}
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
                  href={`/cms/specialties/${specialty.id}/edit`}
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
            {specialty.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {specialty.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có mô tả.
              </p>
            )}
          </section>

          {/* Ăn ở đâu */}
          <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Ăn ở đâu ({specialty.eateries.length})
              </h2>
              {specialty.eateries.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {specialty.eateries.map((e) => (
                    <Link
                      key={e.id}
                      href={`/cms/eateries/${e.id}`}
                      className="group flex items-center gap-3 rounded-xl border p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={coverUrl(e.images, e.slug, 128, 128)}
                          alt={e.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{e.name}</span>
                          {e.status !== "published" && (
                            <Badge variant="outline" className="shrink-0">
                              Nháp
                            </Badge>
                          )}
                        </div>
                        {e.category && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {labelOf(EATERY_CATEGORIES, e.category)}
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
                    Chưa liên kết quán nào.
                  </p>
                  <Link
                    href={`/cms/specialties/${specialty.id}/edit`}
                    className="mt-1 inline-block text-sm text-primary hover:underline"
                  >
                    Thêm quán
                  </Link>
                </div>
              )}
          </section>
        </div>

        {/* Sidebar meta */}
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
              <Meta label="Slug">
                <span className="font-mono text-xs">
                  /dac-san/{specialty.slug}
                </span>
              </Meta>
              <Meta label="Tạo lúc">{dateFmt.format(specialty.createdAt)}</Meta>
              <Meta label="Cập nhật">
                {dateFmt.format(specialty.updatedAt)}
              </Meta>
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
