import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { coverUrl } from "@/lib/place-image";
import { SpecialtyRowActions } from "./row-actions";
import { getPlaceFilterOptions, resolvePlaceIds } from "../place-filter";
import { PlaceFilterSelect } from "../place-filter-select";
import { ClearFilters } from "../clear-filters";

type SearchParams = {
  status?: string;
  kind?: string;
  place?: string;
  q?: string;
};
type Filters = { status: string; kind: string; place: string; q: string };

const STATUS_FILTERS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

const KIND_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "dish", label: "Món ăn" },
  { value: "product", label: "Sản vật / quà" },
];

function buildHref(base: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v && v !== "all") sp.set(k, v);
  const qs = sp.toString();
  return `/cms/specialties${qs ? `?${qs}` : ""}`;
}

export default async function SpecialtiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const kind = sp.kind === "dish" || sp.kind === "product" ? sp.kind : "all";
  const place = sp.place ?? "all";
  const q = sp.q?.trim() ?? "";
  const filters: Filters = { status, kind, place, q };
  const hasFilters =
    status !== "all" || kind !== "all" || place !== "all" || q !== "";
  const placeOptions = await getPlaceFilterOptions();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đặc sản</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Món ăn & sản vật đặc trưng theo vùng.
          </p>
        </div>
        <Link href="/cms/specialties/new" className={cn(buttonVariants())}>
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
          {KIND_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildHref(sp, { kind: f.value })}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                kind === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </Link>
          ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PlaceFilterSelect options={placeOptions} value={place} />
          <form className="relative" action="/cms/specialties">
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
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
            <ClearFilters href="/cms/specialties" show={hasFilters} />
          </div>
        )}
      </div>

      <Suspense
        key={`${status}|${kind}|${place}|${q}`}
        fallback={<SpecialtiesSkeleton />}
      >
        <SpecialtyList filters={filters} />
      </Suspense>
    </div>
  );
}

async function SpecialtyList({ filters }: { filters: Filters }) {
  const { status, kind, place, q } = filters;
  const placeIds = await resolvePlaceIds(place);
  const where: Prisma.SpecialtyWhereInput = {
    ...(status !== "all" && {
      status: status as Prisma.SpecialtyWhereInput["status"],
    }),
    ...(kind !== "all" && {
      kind: kind as Prisma.SpecialtyWhereInput["kind"],
    }),
    ...(placeIds && { placeId: { in: placeIds } }),
    ...(q && { name: { contains: q, mode: "insensitive" } }),
  };

  const specialties = await prisma.specialty.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      status: true,
      isFeatured: true,
      place: { select: { name: true } },
      _count: { select: { eateries: true } },
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
        <span className="font-medium text-foreground">{specialties.length}</span>{" "}
        đặc sản
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {specialties.map((s) => {
            const published = s.status === "published";
            const isProduct = s.kind === "product";
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={coverUrl(s.images, s.slug, 96, 96)}
                    alt={s.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cms/specialties/${s.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.isFeatured && (
                      <Star
                        className="size-3.5 shrink-0 fill-primary text-primary"
                        aria-label="Nổi bật"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.place.name} · {isProduct ? "Sản vật" : "Món ăn"}
                    {!isProduct && ` · ${s._count.eateries} quán`}
                  </p>
                </div>
                <Badge
                  variant={published ? "default" : "outline"}
                  className="hidden sm:inline-flex"
                >
                  {published ? "Xuất bản" : "Nháp"}
                </Badge>
                <SpecialtyRowActions
                  id={s.id}
                  name={s.name}
                  published={published}
                />
              </li>
            );
          })}
        </ul>

        {specialties.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {q || status !== "all" || kind !== "all" || place !== "all"
                ? "Không tìm thấy đặc sản nào khớp bộ lọc."
                : "Chưa có đặc sản nào."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function SpecialtiesSkeleton() {
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
