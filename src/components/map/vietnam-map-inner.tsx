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
import { coverUrl } from "@/lib/place-image";
import type { MapPlacePoint } from "@/lib/geo";

export type LatLng = { lat: number; lng: number };

/**
 * Chỗ bản đồ phải đưa mắt người xem tới. Do PANEL quyết định (nó biết người
 * dùng vừa làm gì), bản đồ chỉ thi hành — nên chỉ có MỘT effect canh khung, và
 * bản đồ không bao giờ tự nhảy khi người dùng đang kéo xem.
 * `token` tăng mỗi lần cần canh lại; cùng token = không đụng vào khung nhìn.
 */
export type MapFocus =
  | { kind: "points"; points: LatLng[]; token: number }
  | { kind: "country"; token: number };

// Khung Việt Nam (đất liền) để mở bản đồ khớp màn hình.
const VN_BOUNDS = L.latLngBounds([8.4, 102.1], [23.5, 109.8]);
const FIT_OPTS: L.FitBoundsOptions = { padding: [16, 16] };
function fitVietnam(map: L.Map) {
  map.fitBounds(VN_BOUNDS, FIT_OPTS);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// ─── Pin điểm đến (ảnh) ──────────────────────────────────────
const iconCache = new Map<string, L.DivIcon>();
/**
 * Trạng thái (đang là mốc / ngoài ngưỡng) NƯỚNG THẲNG vào icon, không gắn class
 * vào DOM sau khi dựng: markercluster tự tạo lại phần tử marker mỗi lần gom/tách
 * cụm (tức mỗi lần đổi zoom), nên class gắn sau sẽ biến mất mà không effect nào
 * chạy lại. Dựng lại 22 marker rẻ hơn nhiều so với việc đi rình vòng đời của nó.
 */
function placeIcon(p: MapPlacePoint, dim: boolean, active: boolean): L.DivIcon {
  // Nơi chưa có ảnh bìa vẫn lấy ẢNH (cùng hàm `coverUrl` và CÙNG kích thước với
  // hàng trong panel) → pin và hàng của một điểm đến là một tấm ảnh giống hệt.
  const url = p.coverUrl ?? coverUrl([], p.slug, 240, 160);
  const cls = cn(
    "dl-place-pin",
    dim && "dl-place-pin--far",
    active && "dl-place-pin--active",
  );
  const key = `${url}|${cls}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    html: `<div class="${cls}"><img src="${esc(url)}" alt="" loading="lazy"/></div>`,
    className: "dl-marker",
    // Khớp .dl-place-pin trong globals.css (52×36 + viền 2px).
    iconSize: [56, 40],
    iconAnchor: [28, 20],
    popupAnchor: [0, -22],
  });
  iconCache.set(key, icon);
  return icon;
}

// Pin ĐÁNH SỐ cho chặng của lộ trình đang đo — cùng `.dl-trip-pin` với bản đồ
// lịch trình (`trip-map-inner.tsx`), vì nói đúng một chuyện: thứ tự đi.
const numberCache = new Map<number, L.DivIcon>();
function numberIcon(n: number): L.DivIcon {
  const cached = numberCache.get(n);
  if (cached) return cached;
  const icon = L.divIcon({
    html: `<div class="dl-trip-pin">${n}</div>`,
    className: "dl-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
  numberCache.set(n, icon);
  return icon;
}

// Popup điểm đến = THẺ Ở TRANG DANH SÁCH thu nhỏ: ảnh làm chủ, lớp phủ tối,
// tên đặt trên ảnh, hàng dữ kiện ngăn bằng gạch mảnh. Chữ nghĩa nằm trong
// globals.css (`.dl-pop*`) chứ không viết bằng class Tailwind trong chuỗi —
// popup dựng bằng innerHTML, để lớp quét class của Tailwind phải đi tìm chúng
// trong một template string là tự chuốc lấy rủi ro mất style.
function placePopupHtml(p: MapPlacePoint): string {
  const url = p.coverUrl ?? coverUrl([], p.slug, 480, 320);
  const featured = p.isFeatured ? `<span class="dl-pop-badge">Nổi bật</span>` : "";
  const eyebrow = p.kind === "province" ? "Tỉnh" : (p.provinceName ?? p.region);
  const tagline = p.tagline
    ? `<span class="dl-pop-tagline">${esc(p.tagline)}</span>`
    : "";
  const facts = [
    p.spotCount ? [p.spotCount, "địa điểm"] : null,
    p.eateryCount ? [p.eateryCount, "quán ăn"] : null,
    p.stayCount ? [p.stayCount, "chỗ ở"] : null,
  ]
    .filter(Boolean)
    .map(
      (f) =>
        `<span class="dl-pop-fact"><b>${f![0]}</b> ${esc(String(f![1]))}</span>`,
    )
    .join("");
  const factsHtml = facts ? `<span class="dl-pop-facts">${facts}</span>` : "";
  return `<a class="dl-pop" href="/diem-den/${esc(p.slug)}">
    <span class="dl-pop-media"><img src="${esc(url)}" alt="" loading="lazy"/><span class="dl-pop-scrim"></span>${featured}
      <span class="dl-pop-body">
        <span class="dl-pop-eyebrow">${esc(eyebrow)}</span>
        <span class="dl-pop-title">${esc(p.name)}</span>
        ${tagline}
      </span>
    </span>
    ${factsHtml}
    <span class="dl-pop-cta">Xem điểm đến <span aria-hidden="true">→</span></span>
  </a>`;
}

const meIcon = L.divIcon({
  html: `<div class="dl-me"></div>`,
  className: "dl-marker",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// ─── Lớp điểm đến: cluster + pin đánh số cho chặng ───────────
function DestinationCluster({
  points,
  active,
  stopOrder,
  dimmed,
  onSelect,
}: {
  points: MapPlacePoint[];
  /** Nơi đang làm MỐC (chế độ Quanh đây) — pin sáng lên. */
  active: string | null;
  /** slug → số thứ tự chặng (1-based). Rỗng khi không đo chuyến. */
  stopOrder: Record<string, number>;
  dimmed: Set<string>;
  onSelect: (slug: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<div class="dl-cluster">${cluster.getChildCount()}</div>`,
          className: "dl-marker",
          iconSize: [42, 34],
        }),
    });
    // Chặng của lộ trình nằm NGOÀI cluster. Gom cụm chúng thì đúng thứ người
    // dùng vừa chọn lại là thứ biến mất sau một bong bóng "2" — trong khi thứ
    // tự nó là nội dung của chế độ này.
    const stopLayer = L.layerGroup();
    for (const p of points) {
      const n = stopOrder[p.slug];
      const m = L.marker([p.lat, p.lng], {
        icon: n ? numberIcon(n) : placeIcon(p, dimmed.has(p.slug), p.slug === active),
        zIndexOffset: n ? 1000 : 0,
      });
      m.bindPopup(placePopupHtml(p), { minWidth: 208 });
      m.on("click", () => onSelect(p.slug));
      (n ? stopLayer : group).addLayer(m);
    }
    group.addTo(map);
    stopLayer.addTo(map);
    return () => {
      group.remove();
      stopLayer.remove();
    };
  }, [points, stopOrder, dimmed, active, map, onSelect]);

  return null;
}

// ─── Canh khung nhìn theo yêu cầu của panel ──────────────────
function FocusView({ focus }: { focus: MapFocus }) {
  const map = useMap();
  const last = useRef<number>(-1);
  useEffect(() => {
    if (focus.token === last.current) return;
    last.current = focus.token;
    if (focus.kind === "country") {
      fitVietnam(map);
      return;
    }
    if (focus.points.length === 0) return;
    if (focus.points.length === 1) {
      map.flyTo([focus.points[0].lat, focus.points[0].lng], Math.max(map.getZoom(), 9), {
        duration: 0.6,
      });
      return;
    }
    map.fitBounds(
      L.latLngBounds(focus.points.map((p) => [p.lat, p.lng])),
      { padding: [48, 48], maxZoom: 11 },
    );
  }, [focus, map]);
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
        onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const btn =
    "grid size-10 place-items-center border border-border bg-background text-foreground shadow-[0_2px_10px_-4px_rgba(0,0,0,0.35)] transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:opacity-60";
  return (
    <div ref={ref} className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5">
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
  active,
  stopOrder,
  dimmed,
  route,
  focus,
  userLoc,
  onLocate,
  onSelect,
}: {
  points: MapPlacePoint[];
  active: string | null;
  stopOrder: Record<string, number>;
  /** Nơi nằm ngoài ngưỡng giờ lái — pin mờ đi, không biến mất. */
  dimmed: Set<string>;
  route: [number, number][] | null;
  focus: MapFocus;
  userLoc: LatLng | null;
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
      <FocusView focus={focus} />
      {route && route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ className: "dl-route", weight: 4, opacity: 0.85 }}
        />
      )}
      {clusterReady && (
        <DestinationCluster
          points={points}
          active={active}
          stopOrder={stopOrder}
          dimmed={dimmed}
          onSelect={onSelect}
        />
      )}
      {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={meIcon} />}
    </MapContainer>
  );
}
