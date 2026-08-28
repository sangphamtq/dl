"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  Compass,
  X,
  Star,
  Share2,
  Plus,
  ChevronUp,
  ChevronDown,
  Crosshair,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { getRoute, getDistances } from "@/lib/map-actions";
import { startTripFromRoute } from "@/app/(site)/lich-trinh/actions";
import { tripBagChanged } from "@/components/trip/trip-bag-events";
import type { MapPlacePoint } from "@/lib/geo";
import type { LatLng, MapFocus } from "@/components/map/vietnam-map-inner";

const VietnamMapInner = dynamic(
  () => import("@/components/map/vietnam-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="grid size-full place-items-center bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
);

// Nhãn nhỏ in hoa — CÙNG một hằng với trang danh sách điểm đến
// (`destination-filter.tsx`). Hai trang nói về cùng một tập nội dung nên phải
// dùng chung một thang chữ, đừng chế biến thể riêng cho bản đồ.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Ngưỡng lọc là GIỜ LÁI, không phải bán kính km. Bản đầu dùng km + vòng tròn
// trên bản đồ, và nó NÓI DỐI ngay trên dữ liệu thật: lọc "200 km" (đường chim
// bay, đúng bằng vòng tròn vẽ ra) nhưng hàng lại ghi "376 km · 4 giờ 31" vì
// đường núi. Người ta cũng không nghĩ bằng bán kính — họ nghĩ "lái 3 tiếng thì
// tới đâu". Bỏ luôn vòng tròn: một vòng tròn đều không tả được vùng-đi-được.
const HOURS = [2, 4, 6] as const;
/** Trần chặng — OSRM nhận nhiều hơn, nhưng một chuyến 12 nơi thì không ai đi. */
const MAX_STOPS = 12;

function shortRegion(label: string): string {
  if (label === "Miền Trung & Tây Nguyên") return "Trung";
  return label.replace(/^Miền\s+/, "");
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const fmtKm = (km: number) => (km >= 100 ? Math.round(km) : Math.round(km * 10) / 10);

function fmtMin(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} giờ ${r} phút` : `${h} giờ`;
}

type Mode = "nearby" | "route";
type Drive = { km: number; min: number };

export function VietnamMap({
  points,
  initialAt,
  initialHours,
  initialStops,
}: {
  points: MapPlacePoint[];
  initialAt?: string;
  initialHours?: number;
  initialStops?: string[];
}) {
  const router = useRouter();
  const bySlug = useMemo(
    () => new Map(points.map((p) => [p.slug, p] as const)),
    [points],
  );

  // Link chia sẻ mang theo cả chế độ: có lộ trình thì mở thẳng chế độ Đo chuyến.
  const [mode, setMode] = useState<Mode>(
    initialStops && initialStops.length ? "route" : "nearby",
  );
  const [originSlug, setOriginSlug] = useState<string | null>(
    () => (points.some((p) => p.slug === initialAt) ? initialAt! : null),
  );
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [fromMe, setFromMe] = useState(false);
  const [maxHours, setMaxHours] = useState<number | null>(
    () => (initialHours && HOURS.includes(initialHours as 2) ? initialHours : 4),
  );
  const [stops, setStops] = useState<string[]>(
    () => (initialStops ?? []).filter((s) => points.some((p) => p.slug === s)),
  );
  // Khung nhìn chỉ đổi khi token tăng — tức khi NGƯỜI DÙNG vừa làm gì đó, không
  // phải mỗi lần state bất kỳ đổi. Nhờ vậy bản đồ không giật khỏi chỗ đang xem.
  const [focusToken, setFocusToken] = useState(0);
  const refocus = () => setFocusToken((t) => t + 1);

  const [drive, setDrive] = useState<{ key: string; by: Record<string, Drive> } | null>(null);
  const [loadingDrive, startDrive] = useTransition();
  const [routeInfo, setRouteInfo] = useState<{
    key: string;
    coords: [number, number][];
    km: number;
    min: number;
    legs: Drive[];
  } | null>(null);
  const [routing, startRouting] = useTransition();
  const [saving, startSaving] = useTransition();

  const originPoint = originSlug ? (bySlug.get(originSlug) ?? null) : null;
  // useMemo vì `origin` là dep của effect đo đường: dựng lại một object mới mỗi
  // lần render thì effect chạy lại mỗi lần render.
  const origin: (LatLng & { label: string; slug?: string }) | null = useMemo(
    () =>
      fromMe && userLoc
        ? { ...userLoc, label: "Vị trí của tôi" }
        : originPoint
          ? {
              lat: originPoint.lat,
              lng: originPoint.lng,
              label: originPoint.name,
              slug: originPoint.slug,
            }
          : null,
    [fromMe, userLoc, originPoint],
  );
  const originKey = origin
    ? (origin.slug ?? `me:${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`)
    : null;

  const stopPoints = useMemo(
    () => stops.map((s) => bySlug.get(s)).filter((p): p is MapPlacePoint => !!p),
    [stops, bySlug],
  );
  const stopOrder = useMemo(() => {
    const o: Record<string, number> = {};
    stops.forEach((s, i) => (o[s] = i + 1));
    return o;
  }, [stops]);

  // ── Giờ xe từ mốc tới mọi nơi ────────────────────────────────
  // MỘT lần cho mỗi mốc, không phải mỗi lần đổi bán kính: OSRM table trả cả
  // bảng trong một lượt, còn bán kính chỉ là phép lọc trên số đã có.
  const driveReq = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "nearby" || !origin || !originKey) return;
    if (driveReq.current === originKey) return;
    driveReq.current = originKey;
    const targets = points.filter((p) => p.slug !== origin.slug);
    const at = { lat: origin.lat, lng: origin.lng };
    startDrive(async () => {
      const res = await getDistances(at, targets.map((p) => ({ lat: p.lat, lng: p.lng })));
      const by: Record<string, Drive> = {};
      targets.forEach((p, i) => {
        const r = res[i];
        if (r) by[p.slug] = { km: r.distance / 1000, min: r.duration / 60 };
      });
      setDrive({ key: originKey, by });
    });
  }, [mode, origin, originKey, points]);

  // ── Tuyến của lộ trình đang đo ───────────────────────────────
  // Ref chặn-trùng chứ không phải `setState` dọn dẹp trong thân effect: một là
  // để khỏi render lồng, hai là vì OSRM có thể HỎNG — nếu lấy "routeInfo còn
  // null" làm điều kiện chạy thì mỗi lần hỏng sẽ gọi lại vô hạn.
  const routeKey = stops.join(">");
  const routeReq = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "route" || stopPoints.length < 2) return;
    if (routeReq.current === routeKey) return;
    routeReq.current = routeKey;
    startRouting(async () => {
      const r = await getRoute(stopPoints.map((p) => ({ lat: p.lat, lng: p.lng })));
      if (!r) {
        toast.error("Không tính được đường giữa các chặng");
        return;
      }
      setRouteInfo({
        key: routeKey,
        coords: r.coords,
        km: r.distance / 1000,
        min: r.duration / 60,
        legs: r.legs.map((l) => ({ km: l.distance / 1000, min: l.duration / 60 })),
      });
    });
  }, [mode, routeKey, stopPoints]);

  // Chỉ dùng kết quả nào KHỚP lộ trình hiện tại — bỏ một chặng là số cũ hết
  // đúng ngay lập tức, không đợi lượt đo mới về.
  const activeRoute =
    routeInfo && routeInfo.key === routeKey && stopPoints.length >= 2
      ? routeInfo
      : null;

  // ── URL chia sẻ được (không tải lại trang) ───────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (mode === "route") {
      if (stops.length) params.set("lo", stops.join(","));
    } else {
      if (fromMe) params.set("tu", "toi");
      else if (originSlug) params.set("tu", originSlug);
      if (origin && maxHours) params.set("gio", String(maxHours));
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [mode, stops, fromMe, originSlug, maxHours, origin]);

  const driveOf = (slug: string): Drive | null =>
    drive && drive.key === originKey ? (drive.by[slug] ?? null) : null;

  // Danh sách của chế độ Quanh đây. Lọc & xếp theo GIỜ LÁI — con số quyết định
  // đi hay không. Chưa có kết quả OSRM (đang tính, hoặc máy chủ hỏng) thì KHÔNG
  // lọc, chỉ xếp theo đường chim bay: thà kém chính xác còn hơn để trang trống
  // khi một dịch vụ ngoài tầm tay mình chết.
  const hasDrive = !!drive && drive.key === originKey;
  const rows = useMemo(() => {
    if (!origin) return points.map((p) => ({ p, air: null as number | null }));
    const list = points
      .filter((p) => p.slug !== origin.slug)
      .map((p) => ({ p, air: haversineKm(origin, p) }))
      .filter((r) => {
        if (!hasDrive || !maxHours) return true;
        const d = driveOf(r.p.slug);
        // Không tính được giờ cho nơi này → để ngoài ngưỡng, đừng đoán.
        return d ? d.min <= maxHours * 60 : false;
      });
    return list.sort((a, b) => {
      const da = driveOf(a.p.slug);
      const db = driveOf(b.p.slug);
      if (da && db) return da.min - db.min;
      if (da) return -1;
      if (db) return 1;
      return a.air - b.air;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, origin, maxHours, drive, originKey, hasDrive]);

  // Nơi nằm NGOÀI ngưỡng giờ lái: pin mờ đi thay vì biến mất. Giữ chúng trên
  // bản đồ mới thấy được "xa tới đâu" — mà đó là một nửa câu trả lời; xoá đi thì
  // bản đồ nói dối rằng phía bên kia không có gì.
  const dimmed = useMemo(() => {
    if (mode !== "nearby" || !origin || !maxHours || !hasDrive)
      return new Set<string>();
    const keep = new Set(rows.map((r) => r.p.slug));
    return new Set(
      points
        .filter((p) => p.slug !== origin.slug && !keep.has(p.slug))
        .map((p) => p.slug),
    );
  }, [mode, origin, maxHours, hasDrive, rows, points]);

  const focus: MapFocus = useMemo(() => {
    if (mode === "route") {
      return stopPoints.length
        ? { kind: "points", points: stopPoints, token: focusToken }
        : { kind: "country", token: focusToken };
    }
    // Khung nhìn ôm ĐÚNG những nơi đang có trong danh sách + mốc — thay cho
    // vòng tròn đã bỏ, đây mới là hình dạng thật của "trong tầm lái".
    if (origin)
      return {
        kind: "points",
        points: [origin, ...rows.slice(0, 12).map((r) => r.p)],
        token: focusToken,
      };
    return { kind: "country", token: focusToken };
  }, [mode, stopPoints, origin, rows, focusToken]);

  const pickRow = (slug: string) => {
    if (mode === "route") {
      setStops((cur) => {
        if (cur.includes(slug)) return cur.filter((s) => s !== slug);
        if (cur.length >= MAX_STOPS) {
          toast.error(`Tối đa ${MAX_STOPS} chặng`);
          return cur;
        }
        return [...cur, slug];
      });
    } else {
      setFromMe(false);
      setOriginSlug((cur) => (cur === slug ? null : slug));
    }
    refocus();
  };

  const locate = (loc: LatLng) => {
    setUserLoc(loc);
    if (mode === "nearby") {
      setFromMe(true);
      setOriginSlug(null);
      refocus();
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết bản đồ");
    } catch {
      toast.error("Không sao chép được liên kết");
    }
  };

  const saveTrip = () => {
    startSaving(async () => {
      const res = await startTripFromRoute(stops);
      if (!res.ok) {
        // Lộ trình đã đo xong mà bị chặn vì chưa đăng nhập thì đừng bỏ người
        // dùng lại đó — URL đang mang sẵn `?lo=…` nên quay về là còn nguyên.
        toast.error(res.error, {
          action: {
            label: "Đăng nhập",
            onClick: () =>
              router.push(
                `/login?callbackUrl=${encodeURIComponent(window.location.href)}`,
              ),
          },
        });
        return;
      }
      tripBagChanged();
      toast.success(`Đã tạo khung ${stops.length} ngày`);
      router.push(`/lich-trinh/cua-toi/${res.data.id}`);
    });
  };

  const longest =
    activeRoute && activeRoute.legs.length
      ? activeRoute.legs.reduce(
          (best, l, i) => (l.min > activeRoute.legs[best].min ? i : best),
          0,
        )
      : null;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <aside className="order-2 flex min-h-0 flex-col border-t border-border/60 lg:order-1 lg:w-[26rem] lg:border-r lg:border-t-0">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 sm:px-5 lg:pt-5">
          <div className="min-w-0">
            <p className={cn(MICRO, "text-muted-foreground")}>Bản đồ du lịch</p>
            <h1 className="mt-1.5 hidden font-[family-name:var(--font-serif)] text-[clamp(1.5rem,2.4vw,2rem)] font-normal uppercase leading-[1.1] tracking-[0.12em] lg:block">
              Việt Nam
            </h1>
          </div>
          <button
            type="button"
            onClick={share}
            className={cn(
              MICRO,
              "inline-flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            <Share2 className="size-3.5" aria-hidden />
            Chia sẻ
          </button>
        </div>

        {/* Hai chế độ = hai câu hỏi không gian mà một danh sách không trả lời
            được. Trang này KHÔNG có ô tìm kiếm / lọc miền / lọc nổi bật: cả ba
            đã có ở /diem-den, và trên bản đồ thì "miền" vốn là thứ nhìn thấy. */}
        <div className="mt-3.5 grid grid-cols-2 gap-px border-y border-border/60 bg-border/60 sm:mt-4">
          {(
            [
              ["nearby", "Quanh đây"],
              ["route", "Đo chuyến"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                refocus();
              }}
              aria-pressed={mode === key}
              className={cn(
                MICRO,
                "h-10 transition-colors",
                mode === key
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "nearby" ? (
          <NearbyBar
            origin={origin}
            maxHours={maxHours}
            hasDrive={hasDrive}
            onHours={(h) => {
              setMaxHours(h);
              refocus();
            }}
            onClear={() => {
              setOriginSlug(null);
              setFromMe(false);
              refocus();
            }}
            count={rows.length}
            loading={loadingDrive}
          />
        ) : (
          <RouteBar
            stops={stopPoints}
            info={activeRoute}
            routing={routing}
            longest={longest}
            saving={saving}
            onMove={(i, dir) => {
              setStops((cur) => {
                const next = [...cur];
                const j = i + dir;
                if (j < 0 || j >= next.length) return cur;
                [next[i], next[j]] = [next[j], next[i]];
                return next;
              });
            }}
            onRemove={(slug) => {
              setStops((cur) => cur.filter((s) => s !== slug));
              refocus();
            }}
            onSave={saveTrip}
          />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span
                aria-hidden
                className="grid size-12 place-items-center bg-muted text-muted-foreground"
              >
                <Compass className="size-5" />
              </span>
              <p className="mt-4 font-[family-name:var(--font-display)] text-base tracking-tight">
                Không có nơi nào trong bán kính này
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Nới bán kính ra, hoặc chọn một mốc khác.
              </p>
            </div>
          ) : (
            <ul>
              {rows.map(({ p, air }) => (
                <PlaceRow
                  key={p.slug}
                  p={p}
                  mode={mode}
                  stopIndex={stopOrder[p.slug] ?? null}
                  isOrigin={origin?.slug === p.slug}
                  air={air}
                  drive={mode === "nearby" ? driveOf(p.slug) : null}
                  onPick={() => pickRow(p.slug)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Bản đồ — isolate: nhốt z-index cao của Leaflet trong 1 stacking context
          riêng, để không đè lên header (tooltip/search/dropdown ở z-50). */}
      <div className="relative isolate order-1 h-[46vh] shrink-0 lg:order-2 lg:h-full lg:flex-1">
        <VietnamMapInner
          points={points}
          active={mode === "nearby" ? (origin?.slug ?? null) : null}
          stopOrder={mode === "route" ? stopOrder : {}}
          dimmed={dimmed}
          route={mode === "route" ? (activeRoute?.coords ?? null) : null}
          focus={focus}
          userLoc={userLoc}
          onLocate={locate}
          onSelect={pickRow}
        />
      </div>
    </div>
  );
}

// ─── Thanh của chế độ "Quanh đây" ──────────────────────────────
function NearbyBar({
  origin,
  maxHours,
  hasDrive,
  onHours,
  onClear,
  count,
  loading,
}: {
  origin: (LatLng & { label: string; slug?: string }) | null;
  maxHours: number | null;
  hasDrive: boolean;
  onHours: (h: number | null) => void;
  onClear: () => void;
  count: number;
  loading: boolean;
}) {
  if (!origin) {
    return (
      <div className="border-b border-border/60 px-4 py-3 sm:px-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chọn một nơi làm <span className="font-medium text-foreground">mốc</span> —
          hoặc bấm{" "}
          <Crosshair className="inline size-3.5 align-[-2px]" aria-hidden /> để lấy
          vị trí của bạn — rồi xem quanh đó còn đi được đâu.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5 border-b border-border/60 px-4 py-3 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0">
          <span className={cn(MICRO, "text-muted-foreground")}>Mốc</span>{" "}
          <span className="font-[family-name:var(--font-display)] text-[0.9375rem] tracking-tight">
            {origin.label}
          </span>
        </p>
        <button
          type="button"
          onClick={onClear}
          className={cn(
            MICRO,
            "shrink-0 text-muted-foreground transition-colors hover:text-foreground",
          )}
        >
          Bỏ mốc
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {HOURS.map((h) => (
          <Chip
            key={h}
            active={maxHours === h}
            onClick={() => onHours(h)}
            label={`≤ ${h} giờ lái`}
          />
        ))}
        <Chip
          active={maxHours === null}
          onClick={() => onHours(null)}
          label="Cả nước"
        />
      </div>

      <p className={cn(MICRO, "text-muted-foreground")}>
        {loading ? (
          "Đang tính giờ xe…"
        ) : (
          <>
            <span className="tabular-nums text-foreground">{count}</span> nơi
            {hasDrive
              ? maxHours
                ? ` trong ${maxHours} giờ lái`
                : " · xếp theo giờ lái"
              : " · chưa tính được giờ xe, đang xếp theo đường chim bay"}
          </>
        )}
      </p>
    </div>
  );
}

// ─── Thanh của chế độ "Đo chuyến" ──────────────────────────────
function RouteBar({
  stops,
  info,
  routing,
  longest,
  saving,
  onMove,
  onRemove,
  onSave,
}: {
  stops: MapPlacePoint[];
  info: { km: number; min: number; legs: { km: number; min: number }[] } | null;
  routing: boolean;
  longest: number | null;
  saving: boolean;
  onMove: (i: number, dir: 1 | -1) => void;
  onRemove: (slug: string) => void;
  onSave: () => void;
}) {
  if (stops.length === 0) {
    return (
      <div className="border-b border-border/60 px-4 py-3 sm:px-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Bấm các nơi bạn định đi, <span className="font-medium text-foreground">theo
          đúng thứ tự</span>. Bản đồ nối chặng và đo tổng đường — để biết chuyến
          này có đi nổi không.
        </p>
      </div>
    );
  }
  return (
    <div className="border-b border-border/60 px-4 py-3 sm:px-5">
      <ol className="space-y-1.5">
        {stops.map((p, i) => (
          <li key={p.slug}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[0.7rem] font-semibold tabular-nums text-primary-foreground"
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-[0.9375rem] tracking-tight">
                {p.name}
              </span>
              <span className="flex shrink-0 items-center">
                <IconBtn
                  label={`Đưa ${p.name} lên trên`}
                  disabled={i === 0}
                  onClick={() => onMove(i, -1)}
                >
                  <ChevronUp className="size-3.5" aria-hidden />
                </IconBtn>
                <IconBtn
                  label={`Đưa ${p.name} xuống dưới`}
                  disabled={i === stops.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  <ChevronDown className="size-3.5" aria-hidden />
                </IconBtn>
                <IconBtn label={`Bỏ ${p.name}`} onClick={() => onRemove(p.slug)}>
                  <X className="size-3.5" aria-hidden />
                </IconBtn>
              </span>
            </div>

            {/* Chặng nằm GIỮA hai nơi nên phải hiện giữa hai dòng, không phải
                thành một cột số bên phải — cột số thì không nói được nó thuộc
                khoảng nào. */}
            {info && i < stops.length - 1 && info.legs[i] && (
              <p
                className={cn(
                  MICRO,
                  "ml-3 border-l border-border pl-4 pt-1.5 text-muted-foreground",
                  longest === i && stops.length > 2 && "text-warm-ink",
                )}
              >
                {fmtKm(info.legs[i].km)} km · {fmtMin(info.legs[i].min)}
                {longest === i && stops.length > 2 && " · chặng dài nhất"}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2.5">
        <p className={cn(MICRO, "text-muted-foreground")}>
          {routing ? (
            "Đang đo…"
          ) : info ? (
            <>
              <span className="tabular-nums text-foreground">{fmtKm(info.km)}</span> km
              {" · "}
              <span className="text-foreground">{fmtMin(info.min)}</span> lái
            </>
          ) : (
            "Thêm một nơi nữa để đo"
          )}
        </p>
        {stops.length >= 2 && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={cn(
              MICRO,
              "inline-flex h-9 shrink-0 items-center gap-1.5 bg-primary px-3 text-primary-foreground disabled:opacity-60",
            )}
          >
            {saving && <Loader2 className="size-3 animate-spin" aria-hidden />}
            Tạo lịch trình {stops.length} ngày
          </button>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// Một hàng = MỘT điểm đến. Hai đích tách bằng vị trí: thân hàng làm việc của
// chế độ đang bật (đặt mốc / thêm chặng), ô mũi tên bên phải mới rời trang sang
// /diem-den/[slug]. Hai phần tử ANH EM trong một <li> — không lồng <a> trong
// <button>.
function PlaceRow({
  p,
  mode,
  stopIndex,
  isOrigin,
  air,
  drive,
  onPick,
}: {
  p: MapPlacePoint;
  mode: Mode;
  stopIndex: number | null;
  isOrigin: boolean;
  air: number | null;
  drive: { km: number; min: number } | null;
  onPick: () => void;
}) {
  const marked = mode === "route" ? stopIndex !== null : isOrigin;
  return (
    <li
      className={cn(
        "relative flex items-stretch border-b border-border/50 transition-colors",
        // Vạch chọn vẽ bằng inset-shadow chứ không phải border-l: border thật
        // sẽ đẩy cả hàng dịch sang 2px mỗi lần đổi lựa chọn.
        marked
          ? "bg-muted/60 shadow-[inset_2px_0_0_var(--foreground)]"
          : "hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={onPick}
        aria-pressed={marked}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left outline-none focus-visible:bg-muted sm:px-5"
      >
        <span className="relative aspect-[3/2] w-[4.75rem] shrink-0 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.coverUrl ?? coverUrl([], p.slug, 240, 160)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
          <span aria-hidden className="absolute inset-0 ring-1 ring-inset ring-black/10" />
          {stopIndex !== null && (
            <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold tabular-nums text-white">
              {stopIndex}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-[family-name:var(--font-display)] text-[0.9375rem] leading-tight tracking-tight">
              {p.name}
            </span>
            {p.isFeatured && (
              <Star className="size-3 shrink-0 text-warm-ink" aria-hidden />
            )}
          </span>

          <span className={cn(MICRO, "mt-1 block truncate text-muted-foreground")}>
            {isOrigin
              ? "Mốc"
              : p.kind === "province"
                ? "Tỉnh"
                : (p.provinceName ?? shortRegion(p.region))}
          </span>

          {/* Con số ĐO ĐƯỢC là lý do trang này tồn tại, nên nó đứng ở dòng riêng
              chứ không lẫn vào dòng tỉnh. Giờ lái là con số quyết định; đường
              chim bay chỉ là thứ hiện ngay trong lúc chờ OSRM. */}
          {(drive || air !== null) && !isOrigin && (
            <span className={cn(MICRO, "mt-1.5 inline-block border-t border-border pt-1")}>
              {drive ? (
                <>
                  <span className="tabular-nums text-foreground">
                    {fmtMin(drive.min)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    lái · {fmtKm(drive.km)} km
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  <span className="tabular-nums">{fmtKm(air!)}</span> km chim bay
                </span>
              )}
            </span>
          )}
        </span>

        {mode === "route" && stopIndex === null && (
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center border border-border text-muted-foreground"
          >
            <Plus className="size-3.5" />
          </span>
        )}
      </button>

      <Link
        href={`/diem-den/${p.slug}`}
        aria-label={`Xem điểm đến ${p.name}`}
        className="grid w-11 shrink-0 place-items-center border-l border-border/50 text-muted-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:bg-foreground focus-visible:text-background focus-visible:outline-none"
      >
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </li>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        MICRO,
        "inline-flex h-8 items-center gap-1.5 border px-3 transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
