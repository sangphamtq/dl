import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Star,
  MapPin,
  Mountain,
  ImageOff,
  ImagePlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityAdminControls } from "../admin-controls";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_DIFFICULTIES,
  PRICE_RANGES,
  labelOf,
} from "../constants";

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
      difficulty: true,
      durationText: true,
      seasonText: true,
      operatorName: true,
      bookingUrl: true,
      phone: true,
      website: true,
      priceRange: true,
      tags: true,
      updatedAt: true,
      place: { select: { id: true, name: true } },
      spots: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
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
  const facts = [
    { label: "Loại", value: labelOf(ACTIVITY_CATEGORIES, activity.category) },
    { label: "Độ khó", value: labelOf(ACTIVITY_DIFFICULTIES, activity.difficulty) },
    { label: "Thời lượng", value: activity.durationText },
    { label: "Mùa", value: activity.seasonText },
    { label: "Giá", value: labelOf(PRICE_RANGES, activity.priceRange) },
    { label: "Đơn vị", value: activity.operatorName },
    { label: "Điện thoại", value: activity.phone },
  ].filter((f) => f.value);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/cms/activities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Hoạt động
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-56">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? activity.name}
                fill
                sizes="(max-width: 640px) 100vw, 14rem"
                className="object-cover"
                priority
              />
            ) : (
              <Link
                href={`/cms/activities/${activity.id}/edit`}
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
                <Badge variant="secondary">Hoạt động</Badge>
                {activity.category && (
                  <Badge variant="outline">
                    {labelOf(ACTIVITY_CATEGORIES, activity.category)}
                  </Badge>
                )}
                <Badge variant={published ? "default" : "outline"}>
                  {published ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
                {activity.isFeatured && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current" aria-hidden />
                    Nổi bật
                  </Badge>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Link
                  href={`/hoat-dong/${activity.slug}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <ExternalLink className="size-4" />
                  Xem web
                </Link>
                <Link
                  href={`/cms/activities/${activity.id}/edit`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Pencil className="size-4" />
                  Sửa
                </Link>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {activity.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <Link
                href={`/cms/places/${activity.place.id}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <MapPin className="size-3.5" aria-hidden />
                {activity.place.name}
              </Link>
              <span>{activity.spots.length} địa điểm liên kết</span>
            </div>

            <div className="mt-4 flex items-center gap-2 sm:hidden">
              <Link
                href={`/cms/activities/${activity.id}/edit`}
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                <Pencil className="size-4" />
                Sửa
              </Link>
              <Link
                href={`/hoat-dong/${activity.slug}`}
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
            {activity.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {activity.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có mô tả.</p>
            )}
          </section>

          {activity.images.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Thư viện ảnh
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {activity.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? activity.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Diễn ra ở đâu (Spot liên kết) */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Diễn ra ở đâu
              </h2>
              <span className="text-sm text-muted-foreground">
                {activity.spots.length} địa điểm
              </span>
            </div>
            {activity.spots.length > 0 ? (
              <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
                {activity.spots.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/cms/spots/${s.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <Mountain className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">
                        {s.name}
                      </span>
                      <Badge
                        variant={s.status === "published" ? "default" : "outline"}
                      >
                        {s.status === "published" ? "Xuất bản" : "Nháp"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa liên kết địa điểm nào. Thêm ở trang sửa.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <ActivityAdminControls
            id={activity.id}
            status={activity.status}
            isFeatured={activity.isFeatured}
            order={activity.order}
          />

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
                  /hoat-dong/{activity.slug}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cập nhật</dt>
                <dd className="text-right">{dateFmt.format(activity.updatedAt)}</dd>
              </div>
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

          <Link
            href={`/cms/activities/${activity.id}/edit`}
            className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ImagePlus className="size-4" aria-hidden />
            Quản lý ảnh ({activity.images.length})
          </Link>
        </aside>
      </div>
    </div>
  );
}
