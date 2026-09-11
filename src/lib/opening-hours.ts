export type Interval = { start: number; end: number };

export type OpeningStatus =
  | { kind: "open"; closesAt: number }
  | { kind: "closingSoon"; closesAt: number }
  | { kind: "opensLater"; opensAt: number }
  | { kind: "closed" };

const SEPARATOR = /\s*(?:–|—|-|~|đến)\s*/;

function toMinutes(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2})\s*[:h.]\s*(\d{1,2})?$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function parseOpeningHours(text: string | null): Interval[] | null {
  if (!text) return null;
  const parts = text.split(/[,;]|(?:\s+và\s+)/);
  const out: Interval[] = [];
  for (const part of parts) {
    const seg = part.split(SEPARATOR);
    if (seg.length !== 2) continue;
    const start = toMinutes(seg[0]);
    const end = toMinutes(seg[1]);
    if (start == null || end == null) continue;
    out.push({ start, end: end <= start ? end + 1440 : end });
  }
  return out.length > 0 ? out : null;
}

export function formatMinutes(m: number): string {
  const t = ((m % 1440) + 1440) % 1440;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export function vietnamMinutesNow(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return (h % 24) * 60 + m;
}

const CLOSING_SOON = 60;

export function openingStatus(
  intervals: Interval[] | null,
  now: number,
): OpeningStatus | null {
  if (!intervals || intervals.length === 0) return null;

  for (const it of intervals) {
    for (const t of [now, now + 1440]) {
      if (t >= it.start && t < it.end) {
        const left = it.end - t;
        return left <= CLOSING_SOON
          ? { kind: "closingSoon", closesAt: it.end }
          : { kind: "open", closesAt: it.end };
      }
    }
  }

  const next = intervals
    .map((it) => it.start)
    .filter((s) => s > now)
    .sort((a, b) => a - b)[0];
  return next != null ? { kind: "opensLater", opensAt: next } : { kind: "closed" };
}

export function hoursSpan(
  texts: (string | null)[],
): { earliest: number; latest: number } | null {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const t of texts) {
    const iv = parseOpeningHours(t);
    if (!iv) continue;
    for (const { start, end } of iv) {
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    }
  }
  return earliest === Infinity ? null : { earliest, latest };
}
