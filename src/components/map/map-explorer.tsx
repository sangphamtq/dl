"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  Mountain,
  Utensils,
  BedDouble,
  Loader2,
  ChevronLeft,
  Map as MapIcon,
  List as ListIcon,
  ArrowRight,
  Navigation,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { getRoute, getDistances, type RouteResult } from "@/lib/map-actions";
import type { GeoPoint, GeoType } from "@/lib/geo";
import {
  SPOT_CATEGORY_LABELS,
  EATERY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";

const DestinationMapInner = dynamic(
  () => import("@/components/map/destination-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
);

const TYPE_META: Record<
  GeoType,
  { label: string; icon: typeof Mountain; color: string; dot: string }
> = {
  spot: { label: "Địa điểm", icon: Mountain, color: "text-primary", dot: "var(--primary)" },
  eatery: { label: "Quán ăn", icon: Utensils, color: "text-warm", dot: "var(--warm)" },
  accommodation: { label: "Lưu trú", icon: BedDouble, color: "text-slate-600 dark:text-slate-400", dot: "#64748b" },
};
const FILTER_ORDER: GeoType[] = ["spot", "eatery", "accommodation"];

const CATEGORY_LABELS: Record<GeoType, Record<string, string>> = {
  spot: SPOT_CATEGORY_LABELS,
  eatery: EATERY_CATEGORY_LABELS,
  accommodation: ACCOMMODATION_CATEGORY_LABELS,
};

export function MapExplorer({
  points,
  placeName,
  placeSlug,
}: {
  points: GeoPoint[];
  placeName: string;
  placeSlug: string;
}) {
  const present = useMemo(() => {
    const s = new Set<GeoType>();
    for (const p of points) s.add(p.type);
    return s;
  }, [points]);
  const [active, setActive] = useState<Set<GeoType>>(present);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  // Yêu cầu bay tới pin — CHỈ đặt khi click card (không phải click pin).
  const [flyRequest, setFlyRequest] = useState<{ id: string; token: number } | null>(null);
  const flyToken = useRef(0);

  // ── Chỉ đường ──────────────────────────────────────────────────
  // 2 chế độ: "itinerary" = lộ trình nhiều điểm (gồm cả A→B);
  //           "nearby"    = khoảng cách từ 1 điểm tới các điểm khác.
  const [dirOpen, setDirOpen] = useState(false);
  const [dirMode, setDirMode] = useState<"itinerary" | "nearby">("itinerary");
  // itinerary
  const [stops, setStops] = useState<GeoPoint[]>([]);
  const [adding, setAdding] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  // nearby
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [distances, setDistances] = useState<Record<
    string,
    { distance: number; duration: number }
  > | null>(null);
  const [distLoading, setDistLoading] = useState(false);

  // refs cho click từ pin (event handler leaflet có thể giữ closure cũ)
  const modeRef = useRef(dirMode);
  const addingRef = useRef(adding);
  const pickingOriginRef = useRef(pickingOrigin);
  useEffect(() => {
    modeRef.current = dirMode;
  }, [dirMode]);
  useEffect(() => {
    addingRef.current = adding;
  }, [adding]);
  useEffect(() => {
    pickingOriginRef.current = pickingOrigin;
  }, [pickingOrigin]);

  const counts = useMemo(() => {
    const c: Record<GeoType, number> = { spot: 0, eatery: 0, accommodation: 0 };
    for (const p of points) c[p.type]++;
    return c;
  }, [points]);

  const visible = useMemo(
    () => points.filter((p) => active.has(p.type)),
    [points, active],
  );

  // Ở chế độ "khoảng cách": đưa điểm gốc lên đầu, còn lại sắp theo gần nhất.
  const listPoints = useMemo(() => {
    if (dirOpen && dirMode === "nearby" && origin && distances) {
      return [...visible].sort((a, b) => {
        if (a.id === origin.id) return -1;
        if (b.id === origin.id) return 1;
        const da = distances[a.id]?.distance ?? Infinity;
        const db = distances[b.id]?.distance ?? Infinity;
        return da - db;
      });
    }
    return visible;
  }, [visible, dirOpen, dirMode, origin, distances]);

  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // Lấy tuyến lộ trình khi có ≥2 điểm dừng.
  useEffect(() => {
    if (stops.length < 2) return;
    let cancelled = false;
    const run = async () => {
      setRouteLoading(true);
      const r = await getRoute(stops.map((s) => ({ lat: s.lat, lng: s.lng })));
      if (cancelled) return;
      setRoute(r);
      setRouteLoading(false);
      setMobileView("map");
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  // Tính khoảng cách từ điểm gốc tới các điểm đang hiển thị.
  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    const targets = visible.filter((p) => p.id !== origin.id);
    const run = async () => {
      setDistLoading(true);
      const arr = await getDistances(
        { lat: origin.lat, lng: origin.lng },
        targets.map((t) => ({ lat: t.lat, lng: t.lng })),
      );
      if (cancelled) return;
      const map: Record<string, { distance: number; duration: number }> = {};
      targets.forEach((t, i) => {
        const d = arr[i];
        if (d) map[t.id] = d;
      });
      setDistances(map);
      setDistLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [origin, visible]);

  // Chọn một điểm: tô chọn + phát yêu cầu bay (chỉ bay khi nút "bám pin" bật).
  const selectPoint = (id: string) => {
    setSelectedId(id);
    flyToken.current += 1;
    setFlyRequest({ id, token: flyToken.current });
  };

  const addStop = (p: GeoPoint) =>
    setStops((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]));
  const removeStop = (id: string) =>
    setStops((s) => s.filter((x) => x.id !== id));
  const moveStop = (i: number, dir: -1 | 1) =>
    setStops((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const resetDirections = () => {
    setStops([]);
    setRoute(null);
    setAdding(false);
    setOrigin(null);
    setDistances(null);
    setPickingOrigin(false);
  };

  // Click pin/card khi đang ở chế độ chỉ đường → gán điểm; ngược lại → chọn.
  const handlePick = (id: string) => {
    if (dirOpen) {
      const p = points.find((x) => x.id === id);
      if (p && modeRef.current === "itinerary" && addingRef.current) {
        addStop(p);
        return;
      }
      if (p && modeRef.current === "nearby" && pickingOriginRef.current) {
        setOrigin(p);
        setPickingOrigin(false);
        setSelectedId(p.id);
        return;
      }
    }
    selectPoint(id);
  };

  // Khi chọn (kể cả từ pin trên map) → cuộn card tương ứng vào tầm nhìn.
  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const toggle = (t: GeoType) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next.size === 0 ? present : next;
    });

  const filters = FILTER_ORDER.filter((t) => present.has(t)).map((t) => ({
    type: t,
    ...TYPE_META[t],
  }));

  return (
    <div className="grid h-full grid-rows-[auto_1fr] lg:grid-cols-[clamp(23rem,32vw,29rem)_1fr] lg:grid-rows-1">
      {/* ── Cột trái: danh sách ───────────────────────────────── */}
      <div
        className={cn(
          "flex min-h-0 flex-col border-border/60 lg:border-r",
          mobileView === "map" && "hidden lg:flex",
        )}
      >
        {/* Đầu cột: breadcrumb + chip lọc */}
        <div className="border-b border-border/60 p-4">
          <Link
            href={`/diem-den/${placeSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {placeName}
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight">
            Bản đồ {placeName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {visible.length} địa điểm trên bản đồ
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map((f) => {
              const on = active.has(f.type);
              const Icon = f.icon;
              return (
                <button
                  key={f.type}
                  type="button"
                  onClick={() => toggle(f.type)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    on
                      ? "border-transparent bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className={cn("size-4", on ? f.color : "text-current")} aria-hidden />
                  {f.label}
                  <span className="tabular-nums text-muted-foreground">{counts[f.type]}</span>
                </button>
              );
            })}
          </div>

          {/* Chỉ đường — mở thẻ nổi trên bản đồ */}
          {!dirOpen && (
            <button
              type="button"
              onClick={() => {
                setDirOpen(true);
                setDirMode("itinerary");
                setAdding(true);
                setMobileView("map");
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Navigation className="size-4" aria-hidden />
              Chỉ đường
            </button>
          )}
        </div>

        {/* Danh sách — card gọn, ảnh nổi, quét nhanh */}
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {listPoints.map((p) => {
            const meta = TYPE_META[p.type];
            const cat = label(CATEGORY_LABELS[p.type], p.category);
            const price = label(PRICE_LABELS, p.priceRange);
            const on = p.id === selectedId;
            const sub = [meta.label, cat].filter(Boolean).join(" · ");
            // chỉ đường: số thứ tự trong lộ trình / khoảng cách từ điểm gốc
            const stopIdx =
              dirOpen && dirMode === "itinerary"
                ? stops.findIndex((s) => s.id === p.id)
                : -1;
            const dist =
              dirOpen && dirMode === "nearby" ? distances?.[p.id] : undefined;
            const isOrigin = dirMode === "nearby" && origin?.id === p.id;
            return (
              <li
                key={`${p.type}-${p.id}`}
                ref={(el) => {
                  if (el) cardRefs.current.set(p.id, el);
                  else cardRefs.current.delete(p.id);
                }}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId((h) => (h === p.id ? null : h))}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (dirOpen && dirMode === "itinerary" && adding) {
                      addStop(p);
                      return;
                    }
                    if (dirOpen && dirMode === "nearby" && pickingOrigin) {
                      setOrigin(p);
                      setPickingOrigin(false);
                      setSelectedId(p.id);
                      return;
                    }
                    selectPoint(p.id);
                    setMobileView("map");
                  }}
                  className={cn(
                    "group flex w-full gap-3 rounded-2xl p-2 text-left transition-colors",
                    on || isOrigin
                      ? "bg-primary/[0.07] ring-1 ring-inset ring-primary/20"
                      : "hover:bg-muted/60",
                  )}
                >
                  {/* Ảnh — nổi, tỉ lệ 4:3 */}
                  <span className="relative aspect-[4/3] w-[7.5rem] shrink-0 overflow-hidden rounded-xl bg-muted">
                    {p.coverUrl && (
                      <Image
                        src={p.coverUrl}
                        alt={p.coverAlt ?? p.name}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    )}
                    {stopIdx >= 0 && (
                      <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-md">
                        {stopIdx + 1}
                      </span>
                    )}
                  </span>

                  {/* Nội dung — tối giản */}
                  <span className="flex min-w-0 flex-1 flex-col py-0.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.dot }}
                        aria-hidden
                      />
                      <span className="truncate">{sub}</span>
                      {price && (
                        <span className="ml-auto shrink-0 font-medium text-foreground/70">
                          {price}
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                      {p.name}
                    </span>

                    {isOrigin ? (
                      <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        Điểm gốc
                      </span>
                    ) : dist ? (
                      <span className="mt-0.5 text-sm">
                        <span className="font-semibold text-primary">
                          {(dist.distance / 1000).toFixed(1)} km
                        </span>{" "}
                        <span className="text-muted-foreground">
                          · {Math.round(dist.duration / 60)} phút
                        </span>
                      </span>
                    ) : p.description ? (
                      <span className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                        {p.description}
                      </span>
                    ) : null}

                    <Link
                      href={p.href}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "mt-auto inline-flex w-fit items-center gap-1 pt-1 text-xs font-medium text-primary transition-opacity hover:underline",
                        on
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      Xem chi tiết
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Cột phải: bản đồ ──────────────────────────────────── */}
      <div className={cn("relative min-h-0", mobileView === "list" && "hidden lg:block")}>
        <DestinationMapInner
          points={visible}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handlePick}
          flyRequest={flyRequest}
          route={
            dirOpen && dirMode === "itinerary" && stops.length >= 2
              ? route?.coords
              : null
          }
          scrollZoom
        />

        {/* Thẻ chỉ đường nổi trên bản đồ (kiểu app bản đồ) */}
        {dirOpen && (
          <div className="absolute left-3 top-3 z-[1000] flex max-h-[calc(100%-1.5rem)] w-[min(21rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-xl shadow-black/10 backdrop-blur">
            {/* Đầu thẻ: tiêu đề + đóng */}
            <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Navigation className="size-4 text-primary" aria-hidden />
                Chỉ đường
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDirOpen(false);
                  resetDirections();
                }}
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Đóng chỉ đường"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {/* Tab chế độ — gạch chân */}
            <div className="mt-2 flex gap-5 border-b border-border/60 px-4">
              {(
                [
                  ["itinerary", "Lộ trình"],
                  ["nearby", "Khoảng cách"],
                ] as const
              ).map(([m, lbl]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setDirMode(m);
                    setAdding(m === "itinerary");
                    setPickingOrigin(m === "nearby" && !origin);
                  }}
                  className={cn(
                    "relative -mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
                    dirMode === m
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {/* ── Lộ trình nhiều điểm ── */}
              {dirMode === "itinerary" && (
                <div>
                  {stops.length > 0 ? (
                    <ol className="relative before:absolute before:bottom-4 before:left-[11px] before:top-4 before:w-px before:bg-border">
                      {stops.map((s, i) => {
                        // chặng từ điểm i → i+1 (chỉ khi route khớp số điểm hiện tại)
                        const leg =
                          route && route.legs.length === stops.length - 1
                            ? route.legs[i]
                            : undefined;
                        return (
                          <li key={s.id} className="group">
                            <div className="flex items-center gap-3">
                              <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-4 ring-background">
                                {i + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {s.name}
                              </span>
                              <span className="flex shrink-0 items-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => moveStop(i, -1)}
                                  disabled={i === 0}
                                  className="grid size-6 place-items-center rounded hover:bg-muted disabled:opacity-30"
                                  aria-label="Lên"
                                >
                                  <ChevronUp className="size-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveStop(i, 1)}
                                  disabled={i === stops.length - 1}
                                  className="grid size-6 place-items-center rounded hover:bg-muted disabled:opacity-30"
                                  aria-label="Xuống"
                                >
                                  <ChevronDown className="size-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeStop(s.id)}
                                  className="grid size-6 place-items-center rounded hover:bg-muted"
                                  aria-label="Xoá"
                                >
                                  <X className="size-3.5" aria-hidden />
                                </button>
                              </span>
                            </div>
                            {/* chặng tới điểm kế tiếp */}
                            {i < stops.length - 1 && (
                              <div className="flex h-7 items-center pl-[2.25rem] text-xs text-muted-foreground">
                                {leg
                                  ? `${(leg.distance / 1000).toFixed(1)} km · ${Math.round(leg.duration / 60)} phút`
                                  : routeLoading
                                    ? "…"
                                    : ""}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chưa có điểm nào trong lộ trình.
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdding((a) => !a)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        adding
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-muted/70",
                      )}
                    >
                      <Plus className="size-4" aria-hidden />
                      {adding ? "Đang chọn điểm…" : "Thêm điểm"}
                    </button>
                    {stops.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStops([]);
                          setRoute(null);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Xoá hết
                      </button>
                    )}
                  </div>

                  {adding && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Bấm địa điểm trong danh sách hoặc pin trên bản đồ để thêm vào lộ trình theo thứ tự.
                    </p>
                  )}
                  {routeLoading && (
                    <p className="mt-3 text-sm text-muted-foreground">Đang tìm tuyến…</p>
                  )}
                  {stops.length >= 2 && route && !routeLoading && (
                    <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2.5">
                      <span className="text-lg font-bold tracking-tight text-primary">
                        {(route.distance / 1000).toFixed(1)} km
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {Math.round(route.duration / 60)} phút lái xe · {stops.length} điểm
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Khoảng cách từ 1 điểm ── */}
              {dirMode === "nearby" && (
                <div>
                  <RouteSlot
                    label="Từ"
                    point={origin}
                    active={pickingOrigin}
                    onClick={() => setPickingOrigin(true)}
                  />
                  {pickingOrigin && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Bấm địa điểm hoặc pin làm điểm gốc — danh sách bên trái sẽ hiện khoảng cách tới từng nơi.
                    </p>
                  )}
                  {distLoading && (
                    <p className="mt-3 text-sm text-muted-foreground">Đang tính khoảng cách…</p>
                  )}
                  {origin && distances && !distLoading && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Khoảng cách từ{" "}
                      <span className="font-medium text-foreground">{origin.name}</span>{" "}
                      tới các nơi (danh sách đã sắp theo gần nhất).
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nút chuyển List ⇄ Map (chỉ mobile) */}
      <button
        type="button"
        onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
        className="fixed bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg lg:hidden"
      >
        {mobileView === "list" ? (
          <span className="inline-flex items-center gap-1.5">
            <MapIcon className="size-4" aria-hidden /> Bản đồ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <ListIcon className="size-4" aria-hidden /> Danh sách
          </span>
        )}
      </button>
    </div>
  );
}

// Ô chọn điểm đi/điểm đến cho chỉ đường.
function RouteSlot({
  label,
  point,
  active,
  onClick,
}: {
  label: string;
  point: GeoPoint | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors",
        active
          ? "border-primary ring-1 ring-primary"
          : "border-border/60 hover:bg-muted",
      )}
    >
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={cn("truncate", point ? "font-medium" : "text-muted-foreground")}>
        {point ? point.name : "Chọn điểm…"}
      </span>
    </button>
  );
}
