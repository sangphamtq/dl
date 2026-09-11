"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
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

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

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

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-6xl">
              {total}
            </span>
            <span className="text-lg font-medium text-muted-foreground">
              / {PROVINCE_COUNT} tỉnh thành
            </span>
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Stat glyph="route">
              <N>{percent}%</N> bản đồ đã tô
            </Stat>
            {left > 0 && (
              <Stat glyph="pin">
                còn <N>{left}</N> nơi chưa tới
              </Stat>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MapCustomizeButton
            visited={[...visited]}
            total={total}
            opts={opts}
            accountName={accountName}
            onSaved={setOpts}
          />
          <MapExportButton
            visited={[...visited]}
            total={total}
            opts={opts}
          />
        </div>
      </div>

      <div
        className={cn(R_BADGE, "mt-5 h-2 w-full overflow-hidden bg-muted")}
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={PROVINCE_COUNT}
        aria-label={`Đã đến ${total} trên ${PROVINCE_COUNT} tỉnh thành`}
      >
        <div
          className="h-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `${(total / PROVINCE_COUNT) * 100}%`,
            backgroundColor: accent,
          }}
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Bấm vào tỉnh trên bản đồ hoặc trong danh sách để đánh dấu đã đến.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <VietnamMap
            visited={visited}
            accent={accent}
            className="mx-auto w-full max-w-[34rem]"
            onToggle={(slug) =>
              toggle(slug, PROVINCE_NAME_BY_SLUG[slug] ?? slug)
            }
          />
        </div>

        {/* Tên tỉnh giữ font viết tay (Mali): đây đúng vai "nhãn viết tay" mà
            skill `design` dành cho font đó, và nó là chữ DUY NHẤT của trang
            khớp với tấm ảnh chia sẻ — ảnh cũng nhúng Mali cho checklist. Tiêu
            đề miền thì KHÔNG: nhãn cấu trúc dùng bộ chữ chung. */}
        <div>
          <h2 className={cn(MICRO, "text-muted-foreground")}>
            Đánh dấu theo miền
          </h2>

          <div className="mt-4 space-y-7">
            {REGION_GROUPS.map((region) => {
              const done = region.provinces.filter((p) =>
                visited.has(p.slug),
              ).length;
              return (
                <section key={region.label}>
                  <h3 className="flex items-baseline gap-2 border-b border-border pb-2">
                    <span className={cn(MICRO, "text-foreground")}>
                      {region.label}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      <b className="font-semibold text-foreground">{done}</b>/
                      {region.provinces.length}
                    </span>
                  </h3>

                  <ul className="mt-1.5 columns-2 gap-x-4 [&>li]:break-inside-avoid">
                    {region.provinces.map(({ slug, name }) => (
                      <li key={slug}>
                        <ProvinceRow
                          name={name}
                          on={visited.has(slug)}
                          accent={accent}
                          onClick={() => toggle(slug, name)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
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
      className={cn(
        R_CTRL,
        "group flex w-full items-center gap-2.5 py-1.5 pr-2 text-left transition-colors hover:bg-muted/60",
      )}
    >
      <span
        style={on ? { backgroundColor: accent, borderColor: accent } : undefined}
        className={cn(
          R_BADGE,
          "grid size-[1.125rem] shrink-0 place-items-center border transition-colors",
          on ? "text-white" : "border-border group-hover:border-foreground/40",
        )}
      >
        {on && <Glyph name="tick" className="size-3" />}
      </span>
      <span
        style={{ fontFamily: "var(--font-rounded)" }}
        className={cn(
          "truncate text-[0.9375rem] leading-tight transition-colors",
          on ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {name}
      </span>
    </button>
  );
}

function Stat({
  glyph,
  children,
}: {
  glyph: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph
        name={glyph}
        className="size-[1.05rem] shrink-0 text-muted-foreground/70"
      />
      {children}
    </span>
  );
}

function N({ children }: { children: React.ReactNode }) {
  return (
    <b className="font-semibold tabular-nums text-foreground">{children}</b>
  );
}
