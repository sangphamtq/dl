const KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

export type BasemapStyle = "voyager" | "dark_all";

export function cartoTileUrl(style: BasemapStyle): string {
  const url = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png`;
  return KEY ? `${url}?key=${KEY}` : url;
}

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
