import { cn } from "@/lib/utils";
import {
  Bus,
  PlaneLanding,
  Navigation,
  Clock,
  Route,
  Building2,
  ArrowRight,
  ExternalLink,
  Car,
  TrainFront,
  Plane,
  Ship,
  Bike,
  Footprints,
  CarTaxiFront,
} from "lucide-react";

export type TransportItem = {
  id: string;
  name: string;
  direction: string;
  mode: string;
  fromName: string | null;
  duration: string | null;
  distanceKm: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  currency: string | null;
  operatorName: string | null;
  bookingUrl: string | null;
  description: string | null;
};

// Icon + nhãn theo phương tiện (TransportMode).
const MODE_ICON: Record<string, typeof Bus> = {
  car: Car,
  bus: Bus,
  train: TrainFront,
  plane: Plane,
  boat: Ship,
  motorbike: Bike,
  bike: Bike,
  taxi: CarTaxiFront,
  grab: CarTaxiFront,
  walk: Footprints,
  cyclo: Bike,
  shuttle: Bus,
  other: Navigation,
};
const MODE_LABEL: Record<string, string> = {
  car: "Ô tô",
  bus: "Xe khách",
  train: "Tàu hỏa",
  plane: "Máy bay",
  boat: "Tàu / thuyền",
  motorbike: "Xe máy",
  bike: "Xe đạp",
  taxi: "Taxi",
  grab: "Grab",
  walk: "Đi bộ",
  cyclo: "Xích lô",
  shuttle: "Xe đưa đón",
  other: "Khác",
};

// "50.000 – 120.000đ" / "Từ 50.000đ" / null.
function formatPrice(t: TransportItem): string | null {
  const cur = t.currency === "VND" || !t.currency ? "đ" : ` ${t.currency}`;
  const fmt = (n: number) => n.toLocaleString("vi-VN") + cur;
  if (t.priceFrom != null && t.priceTo != null && t.priceTo !== t.priceFrom)
    return `${fmt(t.priceFrom)} – ${fmt(t.priceTo)}`;
  if (t.priceFrom != null) return `Từ ${fmt(t.priceFrom)}`;
  if (t.priceTo != null) return fmt(t.priceTo);
  return null;
}

function Fact({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function BookingLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Đặt vé <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

// "Cách đến nơi" — hàng tuyến: điểm đi ⟶ điểm đến, nhấn mạnh hành trình + giá.
// (Icon phương tiện nằm ở tiêu đề nhóm bên trên nên không lặp lại trong card.)
function RouteRow({ t, placeName }: { t: TransportItem; placeName: string }) {
  const price = formatPrice(t);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h5 className="font-semibold leading-snug">{t.name}</h5>
        {price && (
          <span className="shrink-0 text-sm font-bold text-primary">{price}</span>
        )}
      </div>

      {/* Tuyến: điểm đi ──→ điểm đến */}
      {t.fromName && (
        <div className="mt-2.5 flex items-center gap-2 text-sm">
          <span className="font-medium">{t.fromName}</span>
          <span className="h-px flex-1 border-t border-dashed border-border" />
          <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="font-semibold text-primary">{placeName}</span>
        </div>
      )}

      {(t.duration || t.distanceKm != null || t.operatorName) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {t.duration && <Fact icon={Clock}>{t.duration}</Fact>}
          {t.distanceKm != null && <Fact icon={Route}>{t.distanceKm} km</Fact>}
          {t.operatorName && <Fact icon={Building2}>{t.operatorName}</Fact>}
        </div>
      )}

      {t.description && (
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {t.description}
        </p>
      )}

      {t.bookingUrl && (
        <div className="mt-3.5">
          <BookingLink href={t.bookingUrl} />
        </div>
      )}
    </div>
  );
}

// Thứ tự ưu tiên phương tiện khi nhóm "Cách đến nơi".
const MODE_ORDER = [
  "plane",
  "train",
  "bus",
  "car",
  "shuttle",
  "boat",
  "motorbike",
  "taxi",
  "grab",
  "bike",
  "cyclo",
  "walk",
  "other",
];

function groupByMode(items: TransportItem[]): [string, TransportItem[]][] {
  const map = new Map<string, TransportItem[]>();
  for (const t of items) {
    const list = map.get(t.mode) ?? [];
    list.push(t);
    map.set(t.mode, list);
  }
  return [...map.entries()].sort(
    (a, b) => MODE_ORDER.indexOf(a[0]) - MODE_ORDER.indexOf(b[0]),
  );
}

function ModeSubhead({ mode, count }: { mode: string; count: number }) {
  const Icon = MODE_ICON[mode] ?? Navigation;
  return (
    <h4 className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="size-4 text-primary" aria-hidden />
      {MODE_LABEL[mode] ?? mode}
      {count > 1 && (
        <span className="font-normal text-muted-foreground">({count})</span>
      )}
    </h4>
  );
}

// "Đi lại tại chỗ" — ô gọn: phương tiện + mẹo ngắn.
function LocalCard({ t }: { t: TransportItem }) {
  const ModeIcon = MODE_ICON[t.mode] ?? Navigation;
  const price = formatPrice(t);
  return (
    <div className="flex gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 transition-shadow hover:shadow-md">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <ModeIcon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="truncate font-semibold leading-snug">{t.name}</h4>
          {price && (
            <span className="shrink-0 text-sm font-semibold text-primary">
              {price}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {MODE_LABEL[t.mode] ?? t.mode}
        </p>
        {t.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t.description}
          </p>
        )}
        {(t.operatorName || t.bookingUrl) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {t.operatorName && <Fact icon={Building2}>{t.operatorName}</Fact>}
            {t.bookingUrl && (
              <a
                href={t.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Đặt / liên hệ <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupHead({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Bus;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// Khối "Đi lại thế nào" — tách getTo (đến nơi, dạng tuyến) / getAround (tại chỗ, ô gọn).
export function TransportSection({
  transports,
  placeName,
}: {
  transports: TransportItem[];
  placeName: string;
}) {
  const getTo = transports.filter((t) => t.direction === "getTo");
  const getAround = transports.filter((t) => t.direction === "getAround");
  if (transports.length === 0) return null;

  // Hai cột: "Cách đến nơi" | "Đi lại tại chỗ". Chỉ có một nhóm → trải full.
  const bothCols = getTo.length > 0 && getAround.length > 0;

  return (
    <div className={cn("grid gap-x-10 gap-y-12", bothCols && "lg:grid-cols-2")}>
      {getTo.length > 0 && (
        <div>
          <GroupHead
            icon={PlaneLanding}
            title="Cách đến nơi"
            subtitle={`Từ các nơi khác tới ${placeName}`}
          />
          <div className="mt-6 space-y-7">
            {groupByMode(getTo).map(([mode, items]) => (
              <div key={mode}>
                <ModeSubhead mode={mode} count={items.length} />
                <div className="mt-3 space-y-3">
                  {items.map((t) => (
                    <RouteRow key={t.id} t={t} placeName={placeName} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {getAround.length > 0 && (
        <div>
          <GroupHead
            icon={Navigation}
            title="Đi lại tại chỗ"
            subtitle={`Phương tiện di chuyển trong ${placeName}`}
          />
          <div className="mt-6 space-y-4">
            {getAround.map((t) => (
              <LocalCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
