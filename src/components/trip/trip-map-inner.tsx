"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from "react-leaflet";
import type { TripItemKind } from "@/lib/trip-time";

// Bản đồ một ngày trong lịch trình. Khác DestinationMapInner ở một điểm cốt
// lõi: pin ở đây ĐÁNH SỐ THEO THỨ TỰ, vì thứ tự chính là nội dung của lịch
// trình. Vì vậy không tái dùng được component kia (pin ở đó phân theo LOẠI).

export type TripMapPoint = {
  id: string;
  order: number; // 1-based, hiện trong pin
  name: string;
  kind: TripItemKind;
  lat: number;
  lng: number;
};

// Pin tròn số thứ tự. Cache theo số để khỏi dựng lại DOM mỗi lần render.
const iconCache = new Map<number, L.DivIcon>();
function numberIcon(n: number): L.DivIcon {
  const cached = iconCache.get(n);
  if (cached) return cached;
  const icon = L.divIcon({
    html: `<div class="dl-trip-pin">${n}</div>`,
    className: "dl-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
  iconCache.set(n, icon);
  return icon;
}

function FitBounds({ points }: { points: TripMapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng])),
      { padding: [48, 48], maxZoom: 15 },
    );
  }, [points, map]);
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

export default function TripMapInner({
  points,
  route,
}: {
  points: TripMapPoint[];
  route: [number, number][] | null;
}) {
  const dark = useIsDark();
  const style = dark ? "dark_all" : "voyager";
  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : [16.0, 107.5];

  return (
    <MapContainer
      center={center}
      zoom={12}
      zoomControl={false}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        key={style}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png`}
        subdomains="abcd"
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />
      <FitBounds points={points} />

      {/* Tuyến thật khi OSRM trả lời; không thì nối thẳng để vẫn thấy hướng đi. */}
      {route ? (
        <Polyline positions={route} pathOptions={{ color: "var(--primary)", weight: 4, opacity: 0.85 }} />
      ) : points.length >= 2 ? (
        <Polyline
          positions={points.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "var(--primary)", weight: 3, opacity: 0.5, dashArray: "6 8" }}
        />
      ) : null}

      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={numberIcon(p.order)}>
          <Popup>
            <span className="text-sm font-medium">{p.name}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
