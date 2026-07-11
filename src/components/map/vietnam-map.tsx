"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Compass,
  Search,
  X,
  Star,
  Share2,
  Route as RouteIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { REGION_LABELS } from "@/lib/regions";
import { removeDiacritics } from "@/lib/slug";
import { getRoute } from "@/lib/map-actions";
import type { MapPlacePoint, ListingGeoPoint } from "@/lib/geo";
import type { LatLng } from "@/components/map/vietnam-map-inner";

const VietnamMapInner = dynamic(
  () => import("@/components/map/vietnam-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="grid size-full place-items-center bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
);

function shortRegion(label: string): string {
  if (label === "Miền Trung & Tây Nguyên") return "Trung";
  return label.replace(/^Miền\s+/, "");
}
const regionParam = (label: string) =>
  removeDiacritics(shortRegion(label)).toLowerCase();

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const km = (m: number) =>
  m >= 10000 ? `${Math.round(m / 1000)}` : (m / 1000).toFixed(1);

export function VietnamMap({
  points,
  listings,
  initialRegion,
  initialAt,
}: {
  points: MapPlacePoint[];
  listings: ListingGeoPoint[];
  initialRegion?: string;
  initialAt?: string;
}) {
  const regions = useMemo(
    () => REGION_LABELS.filter((r) => points.some((p) => p.region === r)),
    [points],
  );

  const [region, setRegion] = useState<string | null>(
    () => regions.find((r) => regionParam(r) === initialRegion) ?? null,
  );
  const [selected, setSelected] = useState<string | null>(
    () => (points.some((p) => p.slug === initialAt) ? initialAt! : null),
  );
  const [query, setQuery] = useState("");
  // Đến từ trang chi tiết (?at=slug) → bật sẵn lớp địa điểm để thấy spot bên trong.
  const [showListings, setShowListings] = useState(
    () => !!initialAt && points.some((p) => p.slug === initialAt),
  );
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [routeState, setRouteState] = useState<{
    for: string;
    coords: [number, number][];
    km: string;
    min: number;
  } | null>(null);
  const [routing, startRouting] = useTransition();

  // Đồng bộ URL (chia sẻ được) mà không tải lại trang.
  useEffect(() => {
    const params = new URLSearchParams();
    if (region) params.set("mien", regionParam(region));
    if (selected) params.set("at", selected);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [region, selected]);

  // Tuyến chỉ áp cho điểm đang chọn (đổi điểm → tự vô hiệu, không cần effect).
  const activeRoute =
    routeState && routeState.for === selected ? routeState : null;

  const q = removeDiacritics(query).toLowerCase().trim();
  const filtered = useMemo(() => {
    const list = points.filter(
      (p) =>
        (!region || p.region === region) &&
        (!featuredOnly || p.isFeatured) &&
        (!q || removeDiacritics(p.name).toLowerCase().includes(q)),
    );
    if (userLoc) {
      return [...list].sort(
        (a, b) => haversineKm(userLoc, a) - haversineKm(userLoc, b),
      );
    }
    return list;
  }, [points, region, featuredOnly, q, userLoc]);

  const selectedPoint = points.find((p) => p.slug === selected) ?? null;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết bản đồ");
    } catch {
      toast.error("Không sao chép được liên kết");
    }
  };

  const drawRoute = () => {
    if (!userLoc || !selectedPoint) return;
    startRouting(async () => {
      const r = await getRoute([
        userLoc,
        { lat: selectedPoint.lat, lng: selectedPoint.lng },
      ]);
      if (!r) {
        toast.error("Không tìm được đường đi");
        return;
      }
      setRouteState({
        for: selectedPoint.slug,
        coords: r.coords,
        km: km(r.distance),
        min: Math.round(r.duration / 60),
      });
    });
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Panel danh sách */}
      <aside className="order-2 flex min-h-0 flex-col border-t border-border/60 lg:order-1 lg:w-96 lg:border-r lg:border-t-0">
        <div className="space-y-2.5 border-b border-border/60 px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              <span className="tabular-nums">{filtered.length}</span> điểm đến
              {userLoc && " · gần bạn"}
            </p>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Share2 className="size-3.5" aria-hidden />
              Chia sẻ
            </button>
          </div>

          {/* Tìm kiếm */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm điểm đến…"
              aria-label="Tìm điểm đến"
              className="h-9 w-full rounded-full border border-transparent bg-muted pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary/40 focus:bg-background [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>

          {/* Lọc miền + nổi bật */}
          <div className="flex flex-wrap gap-1.5">
            {regions.length > 1 && (
              <>
                <Chip active={!region} onClick={() => setRegion(null)} label="Toàn quốc" />
                {regions.map((r) => (
                  <Chip
                    key={r}
                    active={region === r}
                    onClick={() => setRegion(r)}
                    label={shortRegion(r)}
                  />
                ))}
              </>
            )}
            {points.some((p) => p.isFeatured) && (
              <Chip
                active={featuredOnly}
                onClick={() => setFeaturedOnly((v) => !v)}
                label="Nổi bật"
                icon={<Star className="size-3" aria-hidden />}
                tone="warm"
              />
            )}
          </div>

          {/* Toggle lớp địa điểm chi tiết */}
          {listings.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 pt-0.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showListings}
                onChange={(e) => setShowListings(e.target.checked)}
                className="size-4 accent-primary"
              />
              Hiện địa điểm chi tiết ({listings.length})
            </label>
          )}
        </div>

        {/* Thanh điểm đang chọn + chỉ đường */}
        {selectedPoint && (
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {selectedPoint.name}
              </p>
              {activeRoute ? (
                <p className="text-xs text-primary">
                  Đường bộ {activeRoute.km} km · ~{activeRoute.min} phút
                </p>
              ) : userLoc ? (
                <p className="text-xs text-muted-foreground">
                  {km(haversineKm(userLoc, selectedPoint) * 1000)} km theo đường
                  chim bay
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Bấm định vị (◎) để chỉ đường
                </p>
              )}
            </div>
            {userLoc &&
              (activeRoute ? (
                <button
                  type="button"
                  onClick={() => setRouteState(null)}
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-background"
                >
                  Xóa tuyến
                </button>
              ) : (
                <button
                  type="button"
                  onClick={drawRoute}
                  disabled={routing}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {routing ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  ) : (
                    <RouteIcon className="size-3" aria-hidden />
                  )}
                  Chỉ đường
                </button>
              ))}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy điểm đến phù hợp.
            </p>
          ) : (
            filtered.map((p) => {
              const dist = userLoc ? haversineKm(userLoc, p) : null;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() =>
                    setSelected((cur) => (cur === p.slug ? null : p.slug))
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                    selected === p.slug
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center font-bold text-muted-foreground">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold tracking-tight">
                        {p.name}
                      </span>
                      {p.isFeatured && (
                        <Star className="size-3 shrink-0 text-warm" aria-hidden />
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      {p.provinceName ?? shortRegion(p.region)}
                      {dist != null && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="font-medium text-foreground/70">
                            {km(dist * 1000)} km
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Bản đồ — isolate: nhốt z-index cao của Leaflet trong 1 stacking context
          riêng, để không đè lên header (tooltip/search/dropdown ở z-50). */}
      <div className="relative isolate order-1 h-[46vh] shrink-0 lg:order-2 lg:h-full lg:flex-1">
        {points.length === 0 ? (
          <div className="grid size-full place-items-center px-6 text-center">
            <div>
              <Compass
                className="mx-auto size-8 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-3 font-medium">Chưa có điểm đến trên bản đồ</p>
            </div>
          </div>
        ) : (
          <VietnamMapInner
            points={filtered}
            listings={listings}
            selected={selected}
            showListings={showListings}
            userLoc={userLoc}
            route={activeRoute?.coords ?? null}
            onLocate={setUserLoc}
            onSelect={setSelected}
          />
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  icon,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  tone?: "warm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? tone === "warm"
            ? "bg-warm text-warm-foreground"
            : "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
