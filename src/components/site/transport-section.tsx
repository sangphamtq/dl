import {
  Bus,
  PlaneLanding,
  Navigation,
  Clock,
  MapPin,
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

function TransportSubhead({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Bus;
  title: string;
  count: number;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="size-4 text-primary" aria-hidden />
      {title}
      <span className="font-normal text-muted-foreground">({count})</span>
    </h3>
  );
}

// Card di chuyển — cùng họ thị giác với ListingCard (bo góc, viền, hover shadow).
function TransportCard({ item: t }: { item: TransportItem }) {
  const ModeIcon = MODE_ICON[t.mode] ?? Navigation;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ModeIcon className="size-5" aria-hidden />
        </span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {MODE_LABEL[t.mode] ?? t.mode}
        </span>
      </div>
      <h4 className="mt-3 font-semibold leading-snug">{t.name}</h4>
      {(t.fromName || t.duration) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {t.fromName && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              Từ {t.fromName}
            </span>
          )}
          {t.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {t.duration}
            </span>
          )}
        </div>
      )}
      {t.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {t.description}
        </p>
      )}
    </div>
  );
}

// Khối "Đi lại thế nào" — tách 2 nhóm getTo (đến nơi) / getAround (tại chỗ).
// Dùng chung cho trang chi tiết điểm đến & trang chi tiết địa điểm.
export function TransportSection({
  transports,
}: {
  transports: TransportItem[];
}) {
  const getTo = transports.filter((t) => t.direction === "getTo");
  const getAround = transports.filter((t) => t.direction === "getAround");
  if (transports.length === 0) return null;

  return (
    <div className="mt-7 space-y-8">
      {getTo.length > 0 && (
        <div>
          <TransportSubhead
            icon={PlaneLanding}
            title="Đến nơi"
            count={getTo.length}
          />
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {getTo.map((t) => (
              <TransportCard key={t.id} item={t} />
            ))}
          </div>
        </div>
      )}
      {getAround.length > 0 && (
        <div>
          <TransportSubhead
            icon={Navigation}
            title="Đi lại tại chỗ"
            count={getAround.length}
          />
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {getAround.map((t) => (
              <TransportCard key={t.id} item={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
