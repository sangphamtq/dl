import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";

export type TransportBriefItem = {
  id: string;
  name: string;
  direction: string;
  mode: string;
  fromName: string | null;
  duration: string | null;
  distanceKm: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  isRecommended: boolean;
};

const MODE_GLYPH: Record<string, GlyphName> = {
  car: "car",
  taxi: "car",
  grab: "car",
  shuttle: "car",
  bus: "bus",
  train: "train",
  plane: "plane",
  boat: "boat",
  motorbike: "two-wheel",
  bike: "two-wheel",
  cyclo: "two-wheel",
  walk: "walk",
  other: "navigation",
};

function money(from: number | null, to: number | null): string | null {
  if (from == null && to == null) return null;
  const unit = (n: number) => {
    if (n >= 1_000_000)
      return `${(n / 1_000_000).toFixed(1).replace(/[.,]0$/, "").replace(".", ",")}tr`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return `${n}đ`;
  };
  if (from != null && to != null)
    return from === to ? unit(from) : `${unit(from)}–${unit(to)}`;
  if (from != null) return `từ ${unit(from)}`;
  return `đến ${unit(to as number)}`;
}

function groupByOrigin(items: TransportBriefItem[]) {
  const out: { from: string | null; items: TransportBriefItem[] }[] = [];
  for (const t of items) {
    const found = out.find((g) => g.from === t.fromName);
    if (found) found.items.push(t);
    else out.push({ from: t.fromName, items: [t] });
  }
  return out;
}

export function TransportBrief({ items }: { items: TransportBriefItem[] }) {
  const rank = (a: TransportBriefItem, b: TransportBriefItem) =>
    Number(b.isRecommended) - Number(a.isRecommended);
  const getTo = groupByOrigin(items.filter((t) => t.direction === "getTo").sort(rank));
  const around = items.filter((t) => t.direction === "getAround").sort(rank);
  if (getTo.length === 0 && around.length === 0) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
      {getTo.length > 0 && (
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Cách đến nơi</h3>

          <div className="mt-4 border-t border-border">
            {getTo.map((g) => (
              <div key={g.from ?? "khac"} className="border-b border-border py-3.5">
                {g.from && (
                  <p className="font-medium leading-snug">{g.from}</p>
                )}

                <ul className={cn(g.from && "mt-2 space-y-2")}>
                  {g.items.map((t) => {
                    const price = money(t.priceFrom, t.priceTo);
                    return (
                      <li
                        key={t.id}
                        className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                      >
                        <span className="flex min-w-0 items-baseline gap-2.5">
                          <Glyph
                            name={MODE_GLYPH[t.mode] ?? "navigation"}
                            className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
                          />
                          <span className="min-w-0">
                            <span className={cn(!g.from && "font-medium")}>
                              {t.name}
                            </span>
                            {t.isRecommended && (
                              <span className="ml-2 whitespace-nowrap text-xs font-semibold text-warm-ink">
                                Phổ biến
                              </span>
                            )}
                          </span>
                        </span>

                        <span className="flex shrink-0 items-baseline gap-x-4 pl-6.5 text-sm tabular-nums text-muted-foreground sm:justify-end sm:pl-0">
                          {t.duration && <span>{t.duration}</span>}
                          {price && (
                            <span className="font-medium text-foreground">
                              {price}
                            </span>
                          )}
                          {!t.duration && !price && t.distanceKm != null ? (
                            <span>{t.distanceKm} km</span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {around.length > 0 && (
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Đi lại tại chỗ</h3>
          <ul className="mt-4 space-y-2.5">
            {around.map((t) => {
              const price = money(t.priceFrom, t.priceTo);
              return (
                <li key={t.id} className="flex items-baseline gap-2.5">
                  <Glyph
                    name={MODE_GLYPH[t.mode] ?? "navigation"}
                    className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm">{t.name}</span>
                    {price && (
                      <span className="ml-4 whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                        {price}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
