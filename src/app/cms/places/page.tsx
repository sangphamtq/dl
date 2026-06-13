import { Suspense } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Compass, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkPending } from "@/components/cms/link-pending";
import { PlaceRowActions } from "./row-actions";

type SearchParams = {
  kind?: string;
  status?: string;
  q?: string;
};
type Filters = { kind: string; status: string; q: string };

const KIND_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "province", label: "Tỉnh" },
  { value: "destination", label: "Điểm đến" },
];
const STATUS_FILTERS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

function buildHref(base: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && v !== "all") sp.set(k, v);
  }
  const qs = sp.toString();
  return `/cms/places${qs ? `?${qs}` : ""}`;
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const kind = sp.kind === "province" || sp.kind === "destination" ? sp.kind : "all";
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const q = sp.q?.trim() ?? "";
  const filters: Filters = { kind, status, q };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tỉnh & Điểm đến
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý tỉnh và điểm đến lớn.
          </p>
        </div>
        <Link href="/cms/places/new" className={cn(buttonVariants())}>
          <LinkPending fallback={<Plus className="size-4" />} />
          Tạo mới
        </Link>
      </div>

      {/* Bộ lọc */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
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
        </div>

        {/* Tìm kiếm (GET form) */}
        <form className="relative" action="/cms/places">
          {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
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

      {/* Danh sách — Suspense theo bộ lọc để hiện skeleton mỗi lần lọc/tìm */}
      <Suspense
        key={`${kind}|${status}|${q}`}
        fallback={<PlacesListSkeleton />}
      >
        <PlacesList filters={filters} />
      </Suspense>
    </div>
  );
}

async function PlacesList({ filters }: { filters: Filters }) {
  const { kind, status, q } = filters;

  const where: Prisma.PlaceWhereInput = {
    ...(kind !== "all" && { kind: kind as Prisma.PlaceWhereInput["kind"] }),
    ...(status !== "all" && {
      status: status as Prisma.PlaceWhereInput["status"],
    }),
    ...(q && { name: { contains: q, mode: "insensitive" } }),
  };

  const places = await prisma.place.findMany({
    where,
    orderBy: [{ kind: "asc" }, { isFeatured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      status: true,
      isFeatured: true,
      parent: { select: { name: true } },
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

  return (
    <div className="mt-4 overflow-hidden rounded-xl border">
      <ListHeader />

      <ul className="divide-y">
        {places.map((p) => {
          const isProvince = p.kind === "province";
          const listingCount =
            p._count.activities +
            p._count.spots +
            p._count.specialties +
            p._count.eateries +
            p._count.accommodations +
            p._count.transports;
          const published = p.status === "published";
          return (
            <li
              key={p.id}
              className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:gap-4"
            >
              {/* Tên + slug + cha */}
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isProvince
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isProvince ? (
                    <MapPin className="size-4" />
                  ) : (
                    <Compass className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cms/places/${p.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.isFeatured && (
                      <Star
                        className="size-3.5 shrink-0 fill-primary text-primary"
                        aria-label="Nổi bật"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.parent && (
                      <span className="text-muted-foreground/80">
                        {p.parent.name} ·{" "}
                      </span>
                    )}
                    <span className="font-mono">/diem-den/{p.slug}</span>
                  </p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between gap-4 pl-11 md:pl-0">
                <div className="md:w-24">
                  <Badge variant={isProvince ? "secondary" : "outline"}>
                    {isProvince ? "Tỉnh" : "Điểm đến"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground md:w-36">
                  {isProvince && `${p._count.children} điểm đến · `}
                  {listingCount} listing
                </span>
                <div className="md:w-28">
                  <Badge variant={published ? "default" : "outline"}>
                    {published ? "Xuất bản" : "Nháp"}
                  </Badge>
                </div>
                <PlaceRowActions
                  id={p.id}
                  name={p.name}
                  published={published}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {places.length === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {q || kind !== "all" || status !== "all"
              ? "Không tìm thấy mục nào khớp bộ lọc."
              : "Chưa có tỉnh hay điểm đến nào."}
          </p>
          {!q && kind === "all" && status === "all" && (
            <Button asChild className="mt-4">
              <Link href="/cms/places/new">
                <Plus className="size-4" />
                Tạo mục đầu tiên
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ListHeader() {
  return (
    <div className="hidden items-center gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:flex">
      <span className="flex-1">Tên</span>
      <span className="w-24">Loại</span>
      <span className="w-36">Nội dung</span>
      <span className="w-28">Trạng thái</span>
      <span className="w-10" />
    </div>
  );
}

function PlacesListSkeleton() {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border">
      <ListHeader />
      <ul className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 px-4 py-3.5 md:gap-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <Skeleton className="hidden h-6 w-16 rounded-full md:block md:w-24" />
            <Skeleton className="hidden h-4 w-32 md:block md:w-36" />
            <Skeleton className="h-6 w-20 rounded-full md:w-28" />
            <Skeleton className="size-8 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
