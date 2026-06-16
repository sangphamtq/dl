import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, PlaneLanding, Navigation } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { searchIds } from "@/lib/cms-search";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TransportRowActions } from "./row-actions";
import { TRANSPORT_DIRECTIONS, TRANSPORT_MODES, labelOf } from "./constants";
import { getPlaceFilterOptions, resolvePlaceIds } from "../place-filter";
import { PlaceFilterSelect } from "../place-filter-select";
import { ClearFilters } from "../clear-filters";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 20;

type SearchParams = {
  status?: string;
  direction?: string;
  place?: string;
  q?: string;
  page?: string;
};
type Filters = {
  status: string;
  direction: string;
  place: string;
  q: string;
  page: number;
};

const STATUS_FILTERS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

const DIRECTION_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "getTo", label: "Đến nơi" },
  { value: "getAround", label: "Tại chỗ" },
];

function buildHref(base: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged))
    if (v && v !== "all" && k !== "page") sp.set(k, v);
  const qs = sp.toString();
  return `/cms/transport${qs ? `?${qs}` : ""}`;
}

export default async function TransportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const direction =
    sp.direction === "getTo" || sp.direction === "getAround"
      ? sp.direction
      : "all";
  const place = sp.place ?? "all";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: Filters = { status, direction, place, q, page };
  const hasFilters =
    status !== "all" || direction !== "all" || place !== "all" || q !== "";
  const placeOptions = await getPlaceFilterOptions();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Di chuyển</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cách đến nơi & đi lại tại chỗ (hiển thị inline trên trang điểm đến).
          </p>
        </div>
        <Link href="/cms/transport/new" className={cn(buttonVariants())}>
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
          {DIRECTION_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildHref(sp, { direction: f.value })}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                direction === f.value
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
          <form className="relative" action="/cms/transport">
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            {direction !== "all" && (
              <input type="hidden" name="direction" value={direction} />
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
            <ClearFilters href="/cms/transport" show={hasFilters} />
          </div>
        )}
      </div>

      <Suspense
        key={`${status}|${direction}|${place}|${q}|${page}`}
        fallback={<TransportSkeleton />}
      >
        <TransportList filters={filters} />
      </Suspense>
    </div>
  );
}

async function TransportList({ filters }: { filters: Filters }) {
  const { status, direction, place, q, page } = filters;
  const placeIds = await resolvePlaceIds(place);
  const matchIds = q
    ? await searchIds("Transport", ["name", "description"], q)
    : null;
  const where: Prisma.TransportWhereInput = {
    ...(status !== "all" && {
      status: status as Prisma.TransportWhereInput["status"],
    }),
    ...(direction !== "all" && {
      direction: direction as Prisma.TransportWhereInput["direction"],
    }),
    ...(placeIds && { placeId: { in: placeIds } }),
    ...(matchIds && { id: { in: matchIds } }),
  };

  const [rows, total] = await Promise.all([
    prisma.transport.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      select: {
        id: true,
        name: true,
        direction: true,
        mode: true,
        fromName: true,
        duration: true,
        status: true,
        place: { select: { name: true } },
      },
    }),
    prisma.transport.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PER_PAGE);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (direction !== "all") params.set("direction", direction);
    if (place !== "all") params.set("place", place);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/cms/transport${qs ? `?${qs}` : ""}`;
  };
  if (total > 0 && page > totalPages) redirect(pageHref(totalPages));

  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span> cách di
        chuyển
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {rows.map((t) => {
            const published = t.status === "published";
            const isGetTo = t.direction === "getTo";
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {isGetTo ? (
                    <PlaneLanding className="size-4" />
                  ) : (
                    <Navigation className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/cms/transport/${t.id}/edit`}
                    className="block truncate font-medium hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.place.name} · {labelOf(TRANSPORT_MODES, t.mode)}
                    {t.duration ? ` · ${t.duration}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {labelOf(TRANSPORT_DIRECTIONS, t.direction) === null
                    ? t.direction
                    : isGetTo
                      ? "Đến nơi"
                      : "Tại chỗ"}
                </Badge>
                <Badge
                  variant={published ? "default" : "outline"}
                  className="hidden sm:inline-flex"
                >
                  {published ? "Xuất bản" : "Nháp"}
                </Badge>
                <TransportRowActions
                  id={t.id}
                  name={t.name}
                  published={published}
                />
              </li>
            );
          })}
        </ul>

        {rows.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {q || status !== "all" || direction !== "all" || place !== "all"
                ? "Không tìm thấy cách di chuyển nào khớp bộ lọc."
                : "Chưa có cách di chuyển nào."}
            </p>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </>
  );
}

function TransportSkeleton() {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border">
      <ul className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="size-8 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
