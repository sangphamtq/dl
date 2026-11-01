"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CTRL } from "@/lib/radius";
import { PROVINCE_COUNT, PROVINCE_NAME_BY_SLUG } from "@/lib/provinces";
import { REGIONS } from "@/lib/regions";
import { VietnamMap } from "@/components/account/vietnam-map";
import {
  MapCustomizeButton,
  MapExportButton,
} from "@/components/account/share-map-button";
import type { MapCardOptions } from "@/lib/map-card";
import { toggleCheckIn } from "@/app/(site)/diem-den/check-in-actions";

const REGION_GROUPS = REGIONS.map((r) => ({
  label: r.label,
  provinces: [...r.slugs]
    .map((slug) => ({ slug, name: PROVINCE_NAME_BY_SLUG[slug] ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi")),
}));


export function DaDenBoard({
  initialVisited,
  initialOptions,
  accountName,
  slugToId,
}: {
  initialVisited: string[];
  initialOptions: MapCardOptions;
  accountName: string;
  slugToId: Record<string, string>;
}) {
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(initialVisited),
  );
  const [opts, setOpts] = useState<MapCardOptions>(initialOptions);
  const accent = opts.accent;
  const [, startTransition] = useTransition();

  const total = visited.size;
  const percent = Math.round((total / PROVINCE_COUNT) * 100);
  const left = PROVINCE_COUNT - total;

  function setMark(slug: string, on: boolean) {
    setVisited((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  function toggle(slug: string, name: string) {
    const id = slugToId[slug];
    if (!id) {
      toast.error(`${name} chưa có dữ liệu để đánh dấu.`);
      return;
    }
    const was = visited.has(slug);
    setMark(slug, !was);
    startTransition(async () => {
      const res = await toggleCheckIn({ kind: "place", id });
      if (!res.ok) {
        setMark(slug, was);
        toast.error(res.error);
        return;
      }
      setMark(slug, res.data.checked);
      if (was && res.data.checked)
        toast(`${name} vẫn được đánh dấu vì có điểm đến con đã đến.`);
    });
  }

  const regionStats = REGION_GROUPS.map((r) => ({
    label: r.label,
    done: r.provinces.filter((p) => visited.has(p.slug)).length,
    all: r.provinces.length,
  }));

  return (
    <>
      {/* ĐẦU TRANG: tiêu đề + nút bên phải; dưới là KHỐI TỔNG KẾT — số lớn + thanh tiến độ + ba miền, mỗi miền một thanh nhỏ. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-tight tracking-tight">
            Nơi bạn đã đến
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
            Bấm vào tỉnh trên bản đồ hoặc trong danh sách để đánh dấu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MapCustomizeButton visited={[...visited]} total={total} opts={opts} accountName={accountName} onSaved={setOpts} />
          <MapExportButton visited={[...visited]} total={total} opts={opts} />
        </div>
      </div>

      {/* TỔNG KẾT — một dải: số lớn bên trái, thanh tiến độ trải phần còn lại với % và số còn lại ở hai đầu.
          Không thống kê riêng từng miền (số từng miền đã nằm ở tiêu đề mỗi nhóm trong danh sách). */}
      <div className="mt-8 flex flex-col gap-4 border-y border-border py-5 sm:flex-row sm:items-center sm:gap-8">
        <p className="flex shrink-0 items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-6xl font-bold tabular-nums leading-none tracking-tight">
            {total}
          </span>
          <span className="text-lg font-medium text-muted-foreground">/ {PROVINCE_COUNT} tỉnh thành</span>
        </p>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground">
            <span>
              <N>{percent}%</N> bản đồ đã tô
            </span>
            {left > 0 ? (
              <span>
                còn <N>{left}</N> nơi chưa tới
              </span>
            ) : (
              <span className="font-medium text-foreground">Đã đi hết 34 tỉnh thành</span>
            )}
          </p>
          <Bar value={total} max={PROVINCE_COUNT} accent={accent} label={`Đã đến ${total} trên ${PROVINCE_COUNT} tỉnh thành`} thick />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-12">
        {/* Bản đồ đứng TRỰC TIẾP trên nền trang (không tấm nền — các tỉnh chưa đến vốn đã xám nhạt, thêm nền là chìm), dính khi
            cuộn danh sách. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <VietnamMap
            visited={visited}
            accent={accent}
            className="mx-auto w-full max-w-[32rem]"
            onToggle={(slug) => toggle(slug, PROVINCE_NAME_BY_SLUG[slug] ?? slug)}
          />
        </div>

        {/* Tên tỉnh giữ font viết tay (Mali) — chữ DUY NHẤT của trang khớp tấm ảnh chia sẻ. Ô đánh dấu VUÔNG + tick trần (không
            đổi hình: ảnh xuất ra vẽ đúng hình này — `checklistItem` trong share-map-button). */}
        <div className="space-y-8">
          {REGION_GROUPS.map((region, ri) => (
            <section key={region.label}>
              <h2 className="flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {region.label}
                </span>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  <b className="font-semibold text-foreground">{regionStats[ri].done}</b>/{regionStats[ri].all}
                </span>
              </h2>
              <ul className="mt-2.5 grid grid-cols-2 gap-1">
                {region.provinces.map(({ slug, name }) => (
                  <li key={slug}>
                    <ProvinceRow name={name} on={visited.has(slug)} accent={accent} onClick={() => toggle(slug, name)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

/** Thanh tiến độ: rãnh xám + phần đã đến tô `accent` (mảng — không bao giờ tô chữ bằng accent). */
function Bar({ value, max, accent, label, thick }: { value: number; max: number; accent: string; label: string; thick?: boolean }) {
  return (
    <div
      className={cn("mt-2 w-full overflow-hidden rounded-[4px] bg-foreground/[0.07]", thick ? "h-2.5" : "h-1.5")}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className="h-full rounded-[4px] transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${max ? (value / max) * 100 : 0}%`, backgroundColor: accent }}
      />
    </div>
  );
}

function ProvinceRow({
  name,
  on,
  accent,
  onClick,
}: {
  name: string;
  on: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      // Đã đến: KHÔNG tô nền dòng (biên tập) — ô tick đặc màu + tên đậm là đủ.
      className={cn(
        R_CTRL,
        "group flex h-10 w-full items-center gap-2.5 px-2.5 text-left transition-colors hover:bg-foreground/[0.04]",
      )}
    >
      <span
        style={on ? { backgroundColor: accent, borderColor: accent } : undefined}
        className={cn(
          R_BADGE,
          "grid size-[1.125rem] shrink-0 place-items-center border transition-colors",
          on ? "text-white" : "border-foreground/25 bg-background group-hover:border-foreground/50",
        )}
      >
        {on && <Glyph name="tick" className="size-3" />}
      </span>
      <span
        style={{ fontFamily: "var(--font-rounded)" }}
        className={cn(
          "truncate text-[0.9375rem] leading-tight transition-colors",
          on ? "font-semibold text-foreground" : "text-foreground/75",
        )}
      >
        {name}
      </span>
    </button>
  );
}

function N({ children }: { children: React.ReactNode }) {
  return (
    <b className="font-semibold tabular-nums text-foreground">{children}</b>
  );
}
