// Tách kinh độ/vĩ độ từ link hoặc chuỗi Google Maps. Trả null nếu không thấy.
// Hỗ trợ các dạng: !3d<lat>!4d<lng> (ghim địa điểm), @<lat>,<lng> (tâm bản đồ),
// ?q=/query=/ll=/center=/destination=<lat>,<lng>, và "lat,lng" thuần.
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

// Link rút gọn của Google (chia sẻ từ app) — không chứa toạ độ, phải giải ở server.
export function isShortMapUrl(u: string): boolean {
  return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(
    u.trim(),
  );
}

// Mức zoom trong link Google Maps (phần ",17z" sau @lat,lng). Null nếu không có.
export function parseZoom(url: string): number | null {
  const m = url.match(/@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,(\d+(?:\.\d+)?)z/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

// Src nhúng (iframe) Google Maps theo toạ độ — không cần API key (output=embed).
export function googleEmbedSrc(lat: number, lng: number, zoom = 16): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=vi&output=embed`;
}
