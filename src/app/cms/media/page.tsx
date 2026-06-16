import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/pagination";
import { MediaCard, type MediaItem } from "./media-card";

const PER_PAGE = 60;

type SearchParams = { type?: string; page?: string };

// Loại chủ sở hữu (exclusive arc trên Image). fk = tên cột khóa ngoại.
const OWNER_TYPES = [
  { key: "place", label: "Địa điểm", fk: "placeId" },
  { key: "activity", label: "Hoạt động", fk: "activityId" },
  { key: "spot", label: "Địa điểm nhỏ", fk: "spotId" },
  { key: "specialty", label: "Đặc sản", fk: "specialtyId" },
  { key: "eatery", label: "Quán ăn", fk: "eateryId" },
  { key: "accommodation", label: "Lưu trú", fk: "accommodationId" },
  { key: "transport", label: "Di chuyển", fk: "transportId" },
  { key: "post", label: "Bài viết", fk: "postId" },
] as const;

const ALL_FK = OWNER_TYPES.map((t) => t.fk);

function buildHref(type: string) {
  return type === "all" ? "/cms/media" : `/cms/media?type=${type}`;
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const type =
    OWNER_TYPES.some((t) => t.key === sp.type) || sp.type === "none"
      ? sp.type!
      : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const filters = [
    { key: "all", label: "Tất cả" },
    ...OWNER_TYPES.map((t) => ({ key: t.key, label: t.label })),
    { key: "none", label: "Chưa gắn" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Ảnh / Media</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Thư viện ảnh toàn hệ thống, gom theo nơi gắn.
      </p>

      {/* Bộ lọc */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={buildHref(f.key)}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              type === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Suspense key={`${type}|${page}`} fallback={<MediaSkeleton />}>
        <MediaGrid type={type} page={page} />
      </Suspense>
    </div>
  );
}

async function MediaGrid({ type, page }: { type: string; page: number }) {
  const where: Prisma.ImageWhereInput =
    type === "all"
      ? {}
      : type === "none"
        ? Object.fromEntries(ALL_FK.map((fk) => [fk, null]))
        : { [OWNER_TYPES.find((t) => t.key === type)!.fk]: { not: null } };

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      select: {
        id: true,
        url: true,
        alt: true,
        caption: true,
        credit: true,
        isCover: true,
        place: { select: { id: true, name: true } },
        activity: { select: { name: true } },
        spot: { select: { name: true } },
        specialty: { select: { name: true } },
        eatery: { select: { name: true } },
        accommodation: { select: { name: true } },
        transport: { select: { name: true } },
        post: { select: { title: true } },
      },
    }),
    prisma.image.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PER_PAGE);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/cms/media${qs ? `?${qs}` : ""}`;
  };
  if (total > 0 && page > totalPages) redirect(pageHref(totalPages));

  const items: MediaItem[] = images.map((img) => ({
    id: img.id,
    url: img.url,
    alt: img.alt,
    caption: img.caption,
    credit: img.credit,
    isCover: img.isCover,
    owner: ownerOf(img),
  }));

  if (items.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
        <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">
          Chưa có ảnh nào{type !== "all" ? " trong nhóm này" : ""}.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span> ảnh
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </>
  );
}

type ImageWithOwners = {
  place: { id: string; name: string } | null;
  activity: { name: string } | null;
  spot: { name: string } | null;
  specialty: { name: string } | null;
  eatery: { name: string } | null;
  accommodation: { name: string } | null;
  transport: { name: string } | null;
  post: { title: string } | null;
};

// Xác định chủ sở hữu của ảnh (exclusive arc — đúng 1 quan hệ được set).
function ownerOf(img: ImageWithOwners): MediaItem["owner"] {
  if (img.place)
    return {
      label: "Địa điểm",
      name: img.place.name,
      href: `/cms/places/${img.place.id}`,
    };
  if (img.activity)
    return { label: "Hoạt động", name: img.activity.name, href: null };
  if (img.spot)
    return { label: "Địa điểm nhỏ", name: img.spot.name, href: null };
  if (img.specialty)
    return { label: "Đặc sản", name: img.specialty.name, href: null };
  if (img.eatery)
    return { label: "Quán ăn", name: img.eatery.name, href: null };
  if (img.accommodation)
    return { label: "Lưu trú", name: img.accommodation.name, href: null };
  if (img.transport)
    return { label: "Di chuyển", name: img.transport.name, href: null };
  if (img.post)
    return { label: "Bài viết", name: img.post.title, href: null };
  return null;
}

function MediaSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-square" />
          <div className="space-y-2 p-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
