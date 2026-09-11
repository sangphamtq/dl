export function parseLatLng(
  input: string,
): { lat: number; lng: number } | null {
  if (!input) return null;
  const ok = (la: number, ln: number) =>
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    Math.abs(la) <= 90 &&
    Math.abs(ln) <= 180
      ? { lat: la, lng: ln }
      : null;

  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // ghim địa điểm (chính xác nhất)
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // tâm bản đồ
    /[?&](?:q|query|ll|sll|center|destination|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/, // "lat, lng" thuần
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) {
      const r = ok(parseFloat(m[1]), parseFloat(m[2]));
      if (r) return r;
    }
  }
  return null;
}

export function isShortMapUrl(u: string): boolean {
  return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(
    u.trim(),
  );
}

export function parseZoom(url: string): number | null {
  const m = url.match(/@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,(\d+(?:\.\d+)?)z/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

export function googleEmbedSrc(lat: number, lng: number, zoom = 16): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=vi&output=embed`;
}
