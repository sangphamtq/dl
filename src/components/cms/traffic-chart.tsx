"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { type DailyPoint } from "@/lib/views";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Cặp màu categorical đã validate (xanh + cam — an toàn cho mù màu, CVD ΔE>80).
// Light/dark là bước riêng (không đảo tự động), đều nằm trong lightness band.
const chartConfig = {
  place: { label: "Điểm đến", theme: { light: "#0f88bf", dark: "#1e93c4" } },
  listing: { label: "Listing", theme: { light: "#d97a1f", dark: "#c2701e" } },
} satisfies ChartConfig;

function fmtDay(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

export function TrafficChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={fmtDay}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                fmtDay(String(payload?.[0]?.payload?.date ?? ""))
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {/* listing dưới, place trên; bo góc đầu cột trên cùng */}
        <Bar dataKey="listing" stackId="v" fill="var(--color-listing)" />
        <Bar
          dataKey="place"
          stackId="v"
          fill="var(--color-place)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
