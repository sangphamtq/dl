import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Star, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { coverUrl } from "@/lib/place-image";
import { ActivityRowActions } from "./row-actions";
import { ACTIVITY_CATEGORIES, labelOf } from "./constants";
import { getPlaceFilterOptions, resolvePlaceIds } from "../place-filter";
import { PlaceFilterSelect } from "../place-filter-select";
import { ClearFilters } from "../clear-filters";

type SearchParams = {
  status?: string;
  category?: string;
  place?: string;
  q?: string;
};
type Filters = { status: string; category: string; place: string; q: string };

const STATUS_FILTERS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

function buildHref(base: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v && v !== "all") sp.set(k, v);
  const qs = sp.toString();
  return `/cms/activities${qs ? `?${qs}` : ""}`;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const category =
    sp.category && ACTIVITY_CATEGORIES.some((c) => c.value === sp.category)
      ? sp.category
      : "all";
  const place = sp.place ?? "all";
  const q = sp.q?.trim() ?? "";
  const filters: Filters = { status, category, place, q };
  const hasFilters =
    status !== "all" || category !== "all" || place !== "all" || q !== "";
  const placeOptions = await getPlaceFilterOptions();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoạt động</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loại trải nghiệm dùng lại, liên kết tới các địa điểm.
          </p>
        </div>
        <Link href="/cms/activities/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Tạo mới
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildHref(sp, { status: f.value })}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                status === f.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <Link
            href={buildHref(sp, { category: "all" })}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              category === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            Mọi loại
          </Link>
          {ACTIVITY_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={buildHref(sp, { category: c.value })}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                category === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {c.label}
            </Link>
          ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PlaceFilterSelect options={placeOptions} value={place} />
          <form className="relative" action="/cms/activities">
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            {category !== "all" && (
              <input type="hidden" name="category" value={category} />
            )}
            {place !== "all" && (
              <input type="hidden" name="place" value={place} />
            )}
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên…"
              className="w-full pl-9 sm:w-64"
            />
          </form>
        </div>

        {hasFilters && (
          <div>
            <ClearFilters href="/cms/activities" show={hasFilters} />
          </div>
        )}
      </div>

      <Suspense
        key={`${status}|${category}|${place}|${q}`}
        fallback={<ActivitiesSkeleton />}
      >
        <ActivityList filters={filters} />
      </Suspense>
    </div>
  );
}

async function ActivityList({ filters }: { filters: Filters }) {
  const { status, category, place, q } = filters;
  const placeIds = await resolvePlaceIds(place);
  const where: Prisma.ActivityWhereInput = {
    ...(status !== "all" && {
      status: status as Prisma.ActivityWhereInput["status"],
    }),
    ...(category !== "all" && {
      category: category as Prisma.ActivityWhereInput["category"],
    }),
    ...(placeIds && { placeId: { in: placeIds } }),
    ...(q && { name: { contains: q, mode: "insensitive" } }),
  };

  const activities = await prisma.activity.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      status: true,
      isFeatured: true,
      place: { select: { name: true } },
      _count: { select: { spots: true } },
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
    },
  });

  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{activities.length}</span>{" "}
        hoạt động
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {activities.map((a) => {
            const published = a.status === "published";
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={coverUrl(a.images, a.slug, 96, 96)}
                    alt={a.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cms/activities/${a.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    {a.isFeatured && (
                      <Star
                        className="size-3.5 shrink-0 fill-primary text-primary"
                        aria-label="Nổi bật"
                      />
                    )}
                  </div>
                  <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {a.place.name}
                    </span>
                    {a.category && <span>· {labelOf(ACTIVITY_CATEGORIES, a.category)}</span>}
                    <span>· {a._count.spots} địa điểm</span>
                  </p>
                </div>
                <Badge
                  variant={published ? "default" : "outline"}
                  className="hidden sm:inline-flex"
                >
                  {published ? "Xuất bản" : "Nháp"}
                </Badge>
                <ActivityRowActions
                  id={a.id}
                  name={a.name}
                  published={published}
                />
              </li>
            );
          })}
        </ul>

        {activities.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {q || status !== "all" || category !== "all" || place !== "all"
                ? "Không tìm thấy hoạt động nào khớp bộ lọc."
                : "Chưa có hoạt động nào."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function ActivitiesSkeleton() {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border">
      <ul className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="size-8 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
