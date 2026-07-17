import Link from "next/link";
import { Eye, MapPin, Compass } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  getDailySeries,
  getPeriodTotals,
  getTopEntities,
  type TopEntity,
} from "@/lib/views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrafficChart } from "@/components/cms/traffic-chart";

export const metadata = { title: "Traffic" };

const PERIODS = [7, 30] as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = daysParam === "30" ? 30 : 7;

  const [series, totals, topPlaces, topListings] = await Promise.all([
    getDailySeries(days),
    getPeriodTotals(days),
    getTopEntities(days, "place", 10),
    getTopEntities(days, "listing", 10),
  ]);

  const kpis = [
    { label: "Tổng lượt xem", value: totals.total, icon: Eye },
    { label: "Điểm đến", value: totals.place, icon: MapPin },
    { label: "Listing", value: totals.listing, icon: Compass },
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Traffic</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lượt xem theo điểm đến & listing trong {days} ngày gần nhất.
          </p>
        </div>

        {/* Chọn khoảng thời gian */}
        <div className="inline-flex rounded-lg border p-0.5">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/cms/analytics?days=${p}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                p === days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p} ngày
            </Link>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {value.toLocaleString("vi-VN")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Biểu đồ theo ngày */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Lượt xem theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {totals.total > 0 ? (
            <TrafficChart data={series} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có lượt xem nào trong {days} ngày qua.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top điểm đến & listing */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopList title="Top điểm đến" items={topPlaces} showType={false} />
        <TopList title="Top listing" items={topListings} showType />
      </div>
    </div>
  );
}

function TopList({
  title,
  items,
  showType,
}: {
  title: string;
  items: TopEntity[];
  showType: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ol className="space-y-3">
            {items.map((it, i) => (
              <li key={`${it.entityType}:${it.entityId}`}>
                <Link
                  href={it.href}
                  className="group flex items-center gap-3 text-sm"
                >
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium group-hover:text-primary">
                        {it.name}
                      </span>
                      {showType && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {it.label}
                        </Badge>
                      )}
                    </div>
                    {/* thanh tỉ lệ */}
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(it.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
                    {it.count.toLocaleString("vi-VN")}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
