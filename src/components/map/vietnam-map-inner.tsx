"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import { Layers, Map as MapIcon, Globe, Crosshair } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { MapPlacePoint, ListingGeoPoint, GeoType } from "@/lib/geo";

export type LatLng = { lat: number; lng: number };

// Khung Việt Nam (đất liền) để mở bản đồ khớp màn hình.
const VN_BOUNDS = L.latLngBounds([8.4, 102.1], [23.5, 109.8]);
const FIT_OPTS: L.FitBoundsOptions = { padding: [16, 16] };
function fitVietnam(map: L.Map) {
  map.fitBounds(VN_BOUNDS, FIT_OPTS);
}

const LISTING_COLOR: Record<GeoType, string> = {
  spot: "var(--primary)",
  eatery: "var(--warm)",
  accommodation: "#64748b",
};
const LISTING_LABEL: Record<GeoType, string> = {
  spot: "Địa điểm",
  eatery: "Quán ăn",
  accommodation: "Lưu trú",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// ─── Pin điểm đến (ảnh tròn) ─────────────────────────────────
const iconCache = new Map<string, L.DivIcon>();
function placeIcon(p: MapPlacePoint): L.DivIcon {
  const key = p.coverUrl ?? `f:${p.name.charAt(0)}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const inner = p.coverUrl
    ? `<img src="${esc(p.coverUrl)}" alt="" loading="lazy"/>`
    : `<span>${esc(p.name.charAt(0).toUpperCase())}</span>`;
  const cls = p.coverUrl ? "dl-place-pin" : "dl-place-pin dl-place-pin--fallback";
  const icon = L.divIcon({
    html: `<div class="${cls}">${inner}</div>`,
    className: "dl-marker",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -24],
  });
  iconCache.set(key, icon);
  return icon;
}

function placePopupHtml(p: MapPlacePoint): string {
  const cover = p.coverUrl
    ? `<img src="${esc(p.coverUrl)}" alt="" class="block h-24 w-full object-cover"/>`
    : "";
  const featured = p.isFeatured
    ? `<span class="ml-1 inline-flex items-center rounded-full bg-warm/15 px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold text-warm">Nổi bật</span>`
    : "";
  const tagline = p.tagline
    ? `<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">${esc(p.tagline)}</p>`
    : "";
  const counts = [
    p.spotCount ? `${p.spotCount} địa điểm` : "",
    p.eateryCount ? `${p.eateryCount} quán ăn` : "",
    p.stayCount ? `${p.stayCount} lưu trú` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const countsHtml = counts
    ? `<p class="mt-1.5 text-xs font-medium text-muted-foreground">${esc(counts)}</p>`
    : "";
  return `<div>${cover}<div class="p-3">
    <p class="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">${esc(p.region)}</p>
    <h3 class="mt-0.5 text-base font-bold leading-tight tracking-tight text-foreground">${esc(p.name)}${featured}</h3>
    ${tagline}${countsHtml}
    <a href="/diem-den/${esc(p.slug)}" class="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-primary">Xem điểm đến →</a>
  </div></div>`;
}

function listingIcon(type: GeoType): L.DivIcon {
  return L.divIcon({
    html: `<div class="dl-pin" style="--pin:${LISTING_COLOR[type]}"></div>`,
    className: "dl-marker",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

const meIcon = L.divIcon({
  html: `<div class="dl-me"></div>`,
  className: "dl-marker",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// ─── Lớp điểm đến: cluster + chọn/active/bay tới ─────────────
function DestinationCluster({
  points,
  selected,
  onSelect,
}: {
  points: MapPlacePoint[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const lastFlown = useRef<string | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<div class="dl-cluster">${cluster.getChildCount()}</div>`,
          className: "dl-marker",
          iconSize: [40, 40],
        }),
    });
    const map2 = markers.current;
    for (const key of Object.keys(map2)) delete map2[key];
    for (const p of points) {
      const m = L.marker([p.lat, p.lng], { icon: placeIcon(p) });
      m.bindPopup(placePopupHtml(p), { minWidth: 208 });
      m.on("click", () => onSelect(p.slug));
      map2[p.slug] = m;
      group.addLayer(m);
    }
    group.addTo(map);
    groupRef.current = group;
    return () => {
      group.remove();
    };
  }, [points, map, onSelect]);

  useEffect(() => {
    const setActive = () => {
      for (const [slug, m] of Object.entries(markers.current)) {
        m.getElement()
          ?.querySelector(".dl-place-pin")
          ?.classList.toggle("dl-place-pin--active", slug === selected);
      }
    };
    setActive();
    if (!selected) {
      // Vừa bỏ chọn (trước đó có bay tới điểm) → đưa bản đồ về khung toàn quốc.
      if (lastFlown.current) fitVietnam(map);
      lastFlown.current = null;
      return;
    }
    // Chỉ bay tới khi ĐỔI điểm chọn; đổi lọc miền (points đổi) thì giữ nguyên khung.
    if (selected === lastFlown.current) return;
    const m = markers.current[selected];
    const p = points.find((x) => x.slug === selected);
    if (!m || !p) return;
    lastFlown.current = selected;
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 10), { duration: 0.7 });
    groupRef.current?.zoomToShowLayer(m, () => {
      m.openPopup();
      setActive();
    });
  }, [selected, points, map]);

  return null;
}

// ─── Lớp listing chi tiết (bật/tắt) ─────────────────────────
function ListingsLayer({
  listings,
  show,
}: {
  listings: ListingGeoPoint[];
  show: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!show || listings.length === 0) return;
    const group = L.layerGroup();
    for (const g of listings) {
      const m = L.marker([g.lat, g.lng], { icon: listingIcon(g.type) });
      m.bindPopup(
        `<div class="p-2.5"><p class="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">${LISTING_LABEL[g.type]}</p><h4 class="mt-0.5 text-sm font-bold tracking-tight text-foreground">${esc(g.name)}</h4><a href="${esc(g.href)}" class="mt-1.5 inline-block text-sm font-semibold text-primary">Xem chi tiết →</a></div>`,
        { minWidth: 160 },
      );
      group.addLayer(m);
    }
    group.addTo(map);
    return () => {
      group.remove();
    };
  }, [listings, show, map]);
  return null;
}

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function BaseTiles({
  basemap,
  dark,
}: {
  basemap: "streets" | "satellite";
  dark: boolean;
}) {
  if (basemap === "satellite") {
    return (
      <TileLayer
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
    );
  }
  const style = dark ? "dark_all" : "voyager";
  return (
    <TileLayer
      key={style}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url={`https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png`}
      subdomains="abcd"
      maxZoom={20}
    />
  );
}

function Controls({
  basemap,
  onToggleBasemap,
  onLocate,
}: {
  basemap: "streets" | "satellite";
  onToggleBasemap: () => void;
  onLocate: (loc: LatLng) => void;
}) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocate(loc);
        map.flyTo([loc.lat, loc.lng], 10, { duration: 0.7 });
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const btn =
    "grid size-10 place-items-center rounded-xl border border-border/60 bg-background text-foreground shadow-lg shadow-black/10 transition-colors hover:bg-muted disabled:opacity-60";
  return (
    <div ref={ref} className="absolute left-3 top-3 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className={btn}
        aria-label="Vị trí của tôi"
      >
        <Crosshair
          className={cn("size-5", locating && "animate-pulse text-primary")}
          aria-hidden
        />
      </button>
      <button
        type="button"
        onClick={() => fitVietnam(map)}
        className={btn}
        aria-label="Xem toàn Việt Nam"
      >
        <Globe className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToggleBasemap}
        className={btn}
        aria-label={basemap === "satellite" ? "Bản đồ đường phố" : "Bản đồ vệ tinh"}
      >
        {basemap === "satellite" ? (
          <MapIcon className="size-5" aria-hidden />
        ) : (
          <Layers className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
}

export default function VietnamMapInner({
  points,
  listings,
  selected,
  showListings,
  userLoc,
  route,
  onLocate,
  onSelect,
}: {
  points: MapPlacePoint[];
  listings: ListingGeoPoint[];
  selected: string | null;
  showListings: boolean;
  userLoc: LatLng | null;
  route: [number, number][] | null;
  onLocate: (loc: LatLng) => void;
  onSelect: (slug: string) => void;
}) {
  const dark = useIsDark();
  const [basemap, setBasemap] = useState<"streets" | "satellite">("streets");
  // Plugin markercluster cần global L → set rồi nạp động (tránh lỗi "L is not
  // defined" do Leaflet ESM không tự gán window.L).
  const [clusterReady, setClusterReady] = useState(false);
  useEffect(() => {
    (window as unknown as { L: typeof L }).L = L;
    let alive = true;
    import("leaflet.markercluster").then(() => {
      if (alive) setClusterReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <MapContainer
      bounds={VN_BOUNDS}
      boundsOptions={FIT_OPTS}
      minZoom={4}
      maxBounds={VN_BOUNDS.pad(0.5)}
      zoomControl={false}
      scrollWheelZoom
      className="size-full"
    >
      <BaseTiles basemap={basemap} dark={dark} />
      <ZoomControl position="bottomright" />
      <Controls
        basemap={basemap}
        onToggleBasemap={() =>
          setBasemap((b) => (b === "streets" ? "satellite" : "streets"))
        }
        onLocate={onLocate}
      />
      {clusterReady && (
        <DestinationCluster
          points={points}
          selected={selected}
          onSelect={onSelect}
        />
      )}
      <ListingsLayer listings={listings} show={showListings} />
      {route && route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ className: "dl-route", weight: 4, opacity: 0.85 }}
        />
      )}
      {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={meIcon} />}
    </MapContainer>
  );
}
