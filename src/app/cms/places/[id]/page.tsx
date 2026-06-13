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
  Mountain,
  Sparkles,
  UtensilsCrossed,
  BedDouble,
  Bus,
  ImageOff,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const LISTING_TYPES = [
  { key: "activities", label: "Hoạt động", icon: Compass },
  { key: "spots", label: "Địa điểm nhỏ", icon: Mountain },
  { key: "specialties", label: "Đặc sản", icon: Sparkles },
  { key: "eateries", label: "Quán ăn", icon: UtensilsCrossed },
  { key: "accommodations", label: "Lưu trú", icon: BedDouble },
  { key: "transports", label: "Di chuyển", icon: Bus },
] as const;

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const place = await prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      tagline: true,
      description: true,
      tags: true,
      status: true,
      isFeatured: true,
      order: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      parent: { select: { id: true, name: true } },
      children: {
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, status: true },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
      _count: {
        select: {
          children: true,
          activities: true,
          spots: true,
          specialties: true,
          eateries: true,
          accommodations: true,
          transports: true,
        },
      },
    },
  });

  if (!place) notFound();

  const isProvince = place.kind === "province";
  const published = place.status === "published";
  const cover = place.images.find((i) => i.isCover) ?? place.images[0] ?? null;
  const gallery = place.images.filter((i) => i.id !== cover?.id);

  return (
    <div className="p-6 sm:p-8">
      {/* Breadcrumb + tiêu đề + hành động */}
      <Link
        href="/cms/places"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tỉnh & Điểm đến
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {place.name}
            </h1>
            {place.isFeatured && (
              <Star
                className="size-4 fill-primary text-primary"
                aria-label="Nổi bật"
              />
            )}
          </div>
          {place.tagline && (
            <p className="mt-1 text-sm text-muted-foreground">
              {place.tagline}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={isProvince ? "secondary" : "outline"}>
              {isProvince ? "Tỉnh" : "Điểm đến"}
            </Badge>
            <Badge variant={published ? "default" : "outline"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </Badge>
            {place.parent && (
              <Link
                href={`/cms/places/${place.parent.id}`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <MapPin className="size-3.5" />
                {place.parent.name}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/diem-den/${place.slug}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink className="size-4" />
            Xem web
          </Link>
          <Link
            href={`/cms/places/${place.id}/edit`}
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
                    alt={cover.alt ?? place.name}
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
                          alt={img.alt ?? place.name}
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
                  href={`/cms/places/${place.id}/edit`}
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
            {place.description ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-foreground/90">
                {place.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có mô tả.
              </p>
            )}
          </section>

          {/* Điểm đến con (chỉ tỉnh) */}
          {isProvince && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Điểm đến lớn ({place._count.children})
              </h2>
              {place.children.length > 0 ? (
                <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
                  {place.children.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cms/places/${c.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <Compass className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate font-medium">
                          {c.name}
                        </span>
                        <Badge
                          variant={
                            c.status === "published" ? "default" : "outline"
                          }
                        >
                          {c.status === "published" ? "Xuất bản" : "Nháp"}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa có điểm đến lớn nào thuộc tỉnh này.
                </p>
              )}
            </section>
          )}

          {/* Listing gắn trực tiếp */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              Listing gắn trực tiếp
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LISTING_TYPES.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-xl font-semibold tracking-tight">
                      {place._count[key]}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar meta */}
        <aside className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Thông tin</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <Meta label="Slug">
                <span className="font-mono text-xs">/diem-den/{place.slug}</span>
              </Meta>
              <Meta label="Thứ tự">{place.order ?? "—"}</Meta>
              <Meta label="Lượt xem">
                {place.viewCount.toLocaleString("vi-VN")}
              </Meta>
              <Meta label="Tạo lúc">{dateFmt.format(place.createdAt)}</Meta>
              <Meta label="Cập nhật">{dateFmt.format(place.updatedAt)}</Meta>
            </dl>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Tags</h3>
            {place.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {place.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có tag.</p>
            )}
          </div>
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
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
