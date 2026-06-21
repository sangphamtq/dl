"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { Layers, Map as MapIcon, Maximize, Crosshair, ArrowRight } from "lucide-react";
import type { GeoPoint, GeoType } from "@/lib/geo";
import {
  SPOT_CATEGORY_LABELS,
  EATERY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";

// Màu pin theo loại. spot dùng token primary (theme); eatery/accommodation dùng
// màu accent của riêng bản đồ (không có token warm trong theme).
const TYPE_COLOR: Record<GeoType, string> = {
  spot: "var(--primary)",
  eatery: "#ea580c",
  accommodation: "#475569",
};

const CATEGORY_LABELS: Record<GeoType, Record<string, string>> = {
  spot: SPOT_CATEGORY_LABELS,
  eatery: EATERY_CATEGORY_LABELS,
  accommodation: ACCOMMODATION_CATEGORY_LABELS,
};

// divIcon pin trơn (chấm trắng giữa). Một icon cố định / loại — KHÔNG đổi theo
// active (đổi icon = setIcon thay DOM = nháy). Active xử lý bằng class CSS.
const iconCache = new Map<GeoType, L.DivIcon>();
function pinIcon(type: GeoType): L.DivIcon {
  const cached = iconCache.get(type);
  if (cached) return cached;
  const color = TYPE_COLOR[type];
  const icon = L.divIcon({
    html: `<div class="dl-pin" style="--pin:${color}"><span class="dl-pin__dot"></span></div>`,
    className: "dl-marker",
    iconSize: [26, 26],
    iconAnchor: [13, 25],
    popupAnchor: [0, -24],
  });
  iconCache.set(type, icon);
  return icon;
}

// Ôm khung theo các điểm. 1 điểm → setView; nhiều điểm → fitBounds.
function fitToPoints(map: L.Map, points: GeoPoint[]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], 14);
    return;
  }
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
  map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
}

// Tự ôm khung khi tập điểm đổi (lọc chip…).
function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    fitToPoints(map, points);
  }, [points, map]);
  return null;
}

// Lớp tile theo nền đang chọn (đường phố / vệ tinh).
function BaseTiles({ basemap }: { basemap: "streets" | "satellite" }) {
  if (basemap === "satellite") {
    return (
      <TileLayer
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
    );
  }
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}

// Nút điều khiển nổi trên bản đồ: đổi nền vệ tinh + về vị trí ban đầu +
// (chỉ chế độ explorer) toggle focus khi chọn pin.
function MapControls({
  points,
  basemap,
  onToggleBasemap,
  focusOnSelect,
  onToggleFocus,
  showHint,
}: {
  points: GeoPoint[];
  basemap: "streets" | "satellite";
  onToggleBasemap: () => void;
  focusOnSelect?: boolean;
  onToggleFocus?: () => void;
  showHint?: boolean;
}) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  // Chặn click/scroll trên cụm nút khỏi lan xuống bản đồ.
  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  const btn =
    "grid size-10 place-items-center rounded-xl border border-border/60 bg-background text-foreground shadow-lg shadow-black/10 transition-colors hover:bg-muted";
  // Tooltip hover (nhãn ngắn) bên trái nút.
  const tip =
    "pointer-events-none absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2 z-10 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100";

  const basemapLabel =
    basemap === "satellite" ? "Bản đồ đường phố" : "Bản đồ vệ tinh";
  const focusLabel = focusOnSelect ? "Tắt bám pin khi chọn" : "Bám pin khi chọn";

  return (
    <div ref={ref} className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <div className="group relative">
        <button type="button" onClick={onToggleBasemap} className={btn} aria-label={basemapLabel}>
          {basemap === "satellite" ? (
            <MapIcon className="size-5" aria-hidden />
          ) : (
            <Layers className="size-5" aria-hidden />
          )}
        </button>
        <span className={tip}>{basemapLabel}</span>
      </div>

      <div className="group relative">
        <button
          type="button"
          onClick={() => fitToPoints(map, points)}
          className={btn}
          aria-label="Về vị trí ban đầu"
        >
          <Maximize className="size-5" aria-hidden />
        </button>
        <span className={tip}>Về vị trí ban đầu</span>
      </div>

      {onToggleFocus && (
        <div className="group relative">
          <button
            type="button"
            onClick={onToggleFocus}
            aria-pressed={focusOnSelect}
            className={
              focusOnSelect
                ? "grid size-10 place-items-center rounded-xl border border-primary bg-primary text-primary-foreground shadow-lg shadow-black/10 transition-colors"
                : btn
            }
            aria-label={focusLabel}
          >
            <Crosshair className="size-5" aria-hidden />
          </button>
          {/* Lần chọn đầu tiên: bong bóng giới thiệu (đè tooltip hover) */}
          {showHint ? (
            <span className="pointer-events-none absolute right-[calc(100%+0.5rem)] top-1/2 z-10 w-52 -translate-y-1/2 rounded-lg bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-lg">
              Bật nút này để bản đồ <strong>tự động bám</strong> theo địa điểm
              bạn chọn.
            </span>
          ) : (
            <span className={tip}>{focusLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Lần chọn địa điểm ĐẦU TIÊN: chỉ hiện gợi ý giới thiệu nút bám pin, KHÔNG focus
// (giữ đúng mặc định tắt). Chỉ chạy một lần (lưu cờ trong localStorage).
function FirstSelectHint({
  selectedId,
  onTrigger,
}: {
  selectedId?: string | null;
  onTrigger: () => void;
}) {
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current || !selectedId) return;
    doneRef.current = true;
    if (localStorage.getItem("map-focus-hint-seen")) return;
    localStorage.setItem("map-focus-hint-seen", "1");
    onTrigger();
  }, [selectedId, onTrigger]);
  return null;
}

export type FlyRequest = { id: string; token: number };

// Bay tới điểm khi có yêu cầu (click card bên trái). Tắt focus → không bay.
// Click pin KHÔNG tạo yêu cầu này → click pin sẽ không di chuyển bản đồ.
function FlyToSelected({
  points,
  flyRequest,
  enabled,
}: {
  points: GeoPoint[];
  flyRequest?: FlyRequest | null;
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !flyRequest) return;
    const p = points.find((x) => x.id === flyRequest.id);
    if (!p) return;
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [flyRequest, enabled, points, map]);
  return null;
}

const TOOLTIP_OPTS: L.TooltipOptions = {
  direction: "top",
  offset: [0, -22],
  opacity: 1,
};

// Điều khiển trạng thái marker bằng tay (không remount, không đổi icon → không
// nháy): toggle class active + zIndex; pin active dùng tooltip permanent (tên
// luôn hiện kể cả khi rời chuột), pin thường dùng tooltip hover.
function MarkerStates({
  points,
  hoveredId,
  selectedId,
  markerRefs,
}: {
  points: GeoPoint[];
  hoveredId?: string | null;
  selectedId?: string | null;
  markerRefs: React.RefObject<Map<string, L.Marker>>;
}) {
  useEffect(() => {
    for (const p of points) {
      const m = markerRefs.current.get(p.id);
      if (!m) continue;
      const active = p.id === selectedId || p.id === hoveredId;
      m.setZIndexOffset(active ? 1000 : 0);
      const wantPermanent = active;
      const tt = m.getTooltip();
      if (!tt || tt.options.permanent !== wantPermanent) {
        m.unbindTooltip();
        m.bindTooltip(p.name, { ...TOOLTIP_OPTS, permanent: wantPermanent });
      }
      if (active) m.openTooltip();
    }
  }, [points, hoveredId, selectedId, markerRefs]);
  return null;
}

// Khi có tuyến đường → ôm khung vừa tuyến.
function FitRoute({ route }: { route?: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || route.length < 2) return;
    map.fitBounds(L.latLngBounds(route), { padding: [60, 60] });
  }, [route, map]);
  return null;
}

export default function DestinationMapInner({
  points,
  selectedId,
  hoveredId,
  onSelect,
  flyRequest,
  route,
  scrollZoom = false,
}: {
  points: GeoPoint[];
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  flyRequest?: FlyRequest | null;
  route?: [number, number][] | null;
  scrollZoom?: boolean;
}) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const [basemap, setBasemap] = useState<"streets" | "satellite">("streets");
  // Mặc định KHÔNG bám pin; khôi phục lựa chọn đã lưu.
  const [focusOnSelect, setFocusOnSelect] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("map-auto-focus") === "1",
  );
  const [showHint, setShowHint] = useState(false);

  // Lưu trạng thái nút bám pin mỗi khi đổi.
  useEffect(() => {
    localStorage.setItem("map-auto-focus", focusOnSelect ? "1" : "0");
  }, [focusOnSelect]);

  // Hiện gợi ý vài giây rồi tự ẩn.
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, [showHint]);
  // Tâm tạm thời (sẽ bị FitBounds ghi đè ngay) — Việt Nam.
  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : [16.0, 107.5];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={scrollZoom}
      zoomControl={false}
      className="h-full w-full"
    >
      <ZoomControl position="bottomleft" />
      <BaseTiles basemap={basemap} />
      <MapControls
        points={points}
        basemap={basemap}
        onToggleBasemap={() =>
          setBasemap((b) => (b === "streets" ? "satellite" : "streets"))
        }
        focusOnSelect={onSelect ? focusOnSelect : undefined}
        onToggleFocus={onSelect ? () => setFocusOnSelect((f) => !f) : undefined}
        showHint={showHint}
      />
      {onSelect && (
        <FirstSelectHint
          selectedId={selectedId}
          onTrigger={() => setShowHint(true)}
        />
      )}
      <FitBounds points={points} />
      <FlyToSelected
        points={points}
        flyRequest={flyRequest}
        enabled={focusOnSelect}
      />
      <MarkerStates
        points={points}
        hoveredId={hoveredId}
        selectedId={selectedId}
        markerRefs={markerRefs}
      />
      {route && route.length > 1 && (
        <>
          <FitRoute route={route} />
          {/* casing trắng dưới + tuyến primary trên cho dễ nhìn */}
          <Polyline positions={route} pathOptions={{ color: "#fff", weight: 8, opacity: 0.9 }} />
          <Polyline
            positions={route}
            pathOptions={{ className: "dl-route", weight: 5, opacity: 0.95 }}
          />
        </>
      )}
      {points.map((p) => {
        const cat = label(CATEGORY_LABELS[p.type], p.category);
        const price = label(PRICE_LABELS, p.priceRange);
        return (
          <Marker
            key={`${p.type}-${p.id}`}
            position={[p.lat, p.lng]}
            icon={pinIcon(p.type)}
            eventHandlers={onSelect ? { click: () => onSelect(p.id) } : undefined}
            ref={(m) => {
              if (m) {
                markerRefs.current.set(p.id, m);
                if (!m.getTooltip()) m.bindTooltip(p.name, TOOLTIP_OPTS);
              } else {
                markerRefs.current.delete(p.id);
              }
            }}
          >
            {/* Popup chỉ ở chế độ section (không có list): explorer click pin → cuộn list, không popup */}
            {!onSelect && (
              <Popup>
                <Link href={p.href} className="block p-3 no-underline">
                  <span className="block text-sm font-semibold leading-snug tracking-tight text-foreground">
                    {p.name}
                  </span>
                  {(cat || price) && (
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {cat && <span>{cat}</span>}
                      {price && <span className="font-medium text-primary">{price}</span>}
                    </span>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Xem chi tiết
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                </Link>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
