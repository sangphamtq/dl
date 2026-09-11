"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from "react-leaflet";
import type { TripItemKind } from "@/lib/trip-time";
import { CARTO_ATTRIBUTION, cartoTileUrl } from "@/lib/basemap";

export type TripMapPoint = {
  id: string;
  order: number;
  name: string;
  kind: TripItemKind;
  lat: number;
  lng: number;
};

let ghostIcon: L.DivIcon | null = null;
function makeGhostIcon(): L.DivIcon {
  ghostIcon ??= L.divIcon({
    html: '<div class="dl-trip-ghost"></div>',
    className: "dl-marker",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
  return ghostIcon;
}

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
  ghosts = [],
}: {
  points: TripMapPoint[];
  route: [number, number][] | null;
  ghosts?: { id: string; name: string; lat: number; lng: number }[];
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
        attribution={CARTO_ATTRIBUTION}
        url={cartoTileUrl(style)}
        subdomains="abcd"
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />
      <FitBounds points={points} />

      {route ? (
        <Polyline positions={route} pathOptions={{ color: "var(--primary)", weight: 4, opacity: 0.85 }} />
      ) : points.length >= 2 ? (
        <Polyline
          positions={points.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "var(--primary)", weight: 3, opacity: 0.5, dashArray: "6 8" }}
        />
      ) : null}

      {ghosts.map((g) => (
        <Marker key={`ghost-${g.id}`} position={[g.lat, g.lng]} icon={makeGhostIcon()}>
          <Popup>
            <span className="text-sm font-medium">{g.name}</span>
            <span className="block text-xs opacity-70">Chưa xếp ngày</span>
          </Popup>
        </Marker>
      ))}

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
