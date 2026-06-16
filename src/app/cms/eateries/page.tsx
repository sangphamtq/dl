import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus, Search, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { searchIds } from "@/lib/cms-search";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { coverUrl } from "@/lib/place-image";
import { EateryRowActions } from "./row-actions";
import { EATERY_CATEGORIES, labelOf } from "./constants";
import { getPlaceFilterOptions, resolvePlaceIds } from "../place-filter";
import { PlaceFilterSelect } from "../place-filter-select";
import { ClearFilters } from "../clear-filters";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 20;

type SearchParams = {
  status?: string;
  category?: string;
  place?: string;
  q?: string;
  page?: string;
};
type Filters = {
  status: string;
  category: string;
  place: string;
  q: string;
  page: number;
};

const STATUS_FILTERS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

function buildHref(base: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged))
    if (v && v !== "all" && k !== "page") sp.set(k, v);
  const qs = sp.toString();
  return `/cms/eateries${qs ? `?${qs}` : ""}`;
}

export default async function EateriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const category =
    sp.category && EATERY_CATEGORIES.some((c) => c.value === sp.category)
      ? sp.category
      : "all";
  const place = sp.place ?? "all";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: Filters = { status, category, place, q, page };
  const hasFilters =
    status !== "all" || category !== "all" || place !== "all" || q !== "";
  const placeOptions = await getPlaceFilterOptions();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quán ăn</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quán ăn, nhà hàng, quán cà phê nên thử.
          </p>
        </div>
        <Link href="/cms/eateries/new" className={cn(buttonVariants())}>
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
            Mọi kiểu
          </Link>
          {EATERY_CATEGORIES.map((c) => (
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
          <form className="relative" action="/cms/eateries">
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
            <ClearFilters href="/cms/eateries" show={hasFilters} />
          </div>
        )}
      </div>

      <Suspense
        key={`${status}|${category}|${place}|${q}|${page}`}
        fallback={<EateriesSkeleton />}
      >
        <EateryList filters={filters} />
      </Suspense>
    </div>
  );
}

async function EateryList({ filters }: { filters: Filters }) {
  const { status, category, place, q, page } = filters;
  const placeIds = await resolvePlaceIds(place);
  const matchIds = q
    ? await searchIds("Eatery", ["name", "description"], q)
    : null;
  const where: Prisma.EateryWhereInput = {
    ...(status !== "all" && {
      status: status as Prisma.EateryWhereInput["status"],
    }),
    ...(category !== "all" && {
      category: category as Prisma.EateryWhereInput["category"],
    }),
    ...(placeIds && { placeId: { in: placeIds } }),
    ...(matchIds && { id: { in: matchIds } }),
  };

  const [eateries, total] = await Promise.all([
    prisma.eatery.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        status: true,
        isFeatured: true,
        place: { select: { name: true } },
        _count: { select: { specialties: true } },
        images: {
          where: { isCover: true },
          take: 1,
          select: { url: true, isCover: true },
        },
      },
    }),
    prisma.eatery.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PER_PAGE);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    if (place !== "all") params.set("place", place);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/cms/eateries${qs ? `?${qs}` : ""}`;
  };
  if (total > 0 && page > totalPages) redirect(pageHref(totalPages));

  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span> quán
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {eateries.map((e) => {
            const published = e.status === "published";
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={coverUrl(e.images, e.slug, 96, 96)}
                    alt={e.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cms/eateries/${e.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {e.name}
                    </Link>
                    {e.isFeatured && (
                      <Star
                        className="size-3.5 shrink-0 fill-primary text-primary"
                        aria-label="Nổi bật"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.place.name}
                    {e.category && ` · ${labelOf(EATERY_CATEGORIES, e.category)}`}
                    {` · ${e._count.specialties} đặc sản`}
                  </p>
                </div>
                <Badge
                  variant={published ? "default" : "outline"}
                  className="hidden sm:inline-flex"
                >
                  {published ? "Xuất bản" : "Nháp"}
                </Badge>
                <EateryRowActions
                  id={e.id}
                  name={e.name}
                  published={published}
                />
              </li>
            );
          })}
        </ul>

        {eateries.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {q || status !== "all" || category !== "all" || place !== "all"
                ? "Không tìm thấy quán nào khớp bộ lọc."
                : "Chưa có quán ăn nào."}
            </p>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </>
  );
}

function EateriesSkeleton() {
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
