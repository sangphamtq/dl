"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export default function PlaceMiniMapInner({
  lat,
  lng,
  name,
  coverUrl,
}: {
  lat: number;
  lng: number;
  name: string;
  coverUrl: string | null;
}) {
  const icon = L.divIcon({
    html: coverUrl
      ? `<div class="dl-place-pin"><img src="${esc(coverUrl)}" alt=""/></div>`
      : `<div class="dl-place-pin dl-place-pin--fallback"><span>${esc(name.charAt(0).toUpperCase())}</span></div>`,
    className: "dl-marker",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={9}
      zoomControl={false}
      scrollWheelZoom={false}
      attributionControl={false}
      className="size-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        subdomains="abcd"
        maxZoom={18}
      />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}
