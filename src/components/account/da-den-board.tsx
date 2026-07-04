"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PROVINCE_COUNT, PROVINCE_NAME_BY_SLUG } from "@/lib/provinces";
import { REGIONS } from "@/lib/regions";
import { VietnamMap } from "@/components/account/vietnam-map";
import { ShareMapButton } from "@/components/account/share-map-button";
import { toggleCheckIn } from "@/app/diem-den/check-in-actions";

// Checklist nhóm theo miền; mỗi miền tỉnh sắp theo bảng chữ cái tiếng Việt.
const REGION_GROUPS = REGIONS.map((r) => ({
  label: r.label,
  provinces: [...r.slugs]
    .map((slug) => ({ slug, name: PROVINCE_NAME_BY_SLUG[slug] ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi")),
}));

// Trang "Đã đến": bản đồ + checklist tỉnh nằm CHUNG một khung. Bấm ô tròn để
// đánh dấu; bản đồ và tiến độ cập nhật ngay (chung state).
export function DaDenBoard({
  initialVisited,
  slugToId,
}: {
  initialVisited: string[];
  slugToId: Record<string, string>;
}) {
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(initialVisited),
  );
  const [, startTransition] = useTransition();

  const total = visited.size;
  const percent = Math.round((total / PROVINCE_COUNT) * 100);
  const R = 30;
  const C = 2 * Math.PI * R;

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
    setMark(slug, !was); // optimistic
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
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bấm vào tỉnh trên bản đồ hoặc trong danh sách để đánh dấu đã đến.
        </p>
        <ShareMapButton visited={[...visited]} total={total} />
      </div>

      {/* MỘT khung chứa cả bản đồ và checklist */}
      <div className="mt-5 rounded-3xl border border-border/50 bg-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_460px] lg:gap-10">
          {/* Bản đồ (to, làm chủ đạo) + thẻ tiến độ nổi */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative mx-auto w-full max-w-[560px]">
              <VietnamMap
                visited={visited}
                className="w-full"
                onToggle={(slug) =>
                  toggle(slug, PROVINCE_NAME_BY_SLUG[slug] ?? slug)
                }
              />

              <div className="absolute right-1 top-1 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/90 px-4 py-3 shadow-md backdrop-blur-md sm:right-3 sm:top-3">
                <div className="relative size-[64px]">
                <svg viewBox="0 0 72 72" className="size-full -rotate-90">
                  <circle cx="36" cy="36" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
                  <circle
                    cx="36"
                    cy="36"
                    r={R}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="stroke-warm transition-all"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - total / PROVINCE_COUNT)}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">
                  {percent}%
                </span>
              </div>
              <div>
                <p className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums text-warm">
                    {total}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    /{PROVINCE_COUNT}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">tỉnh thành</p>
              </div>
            </div>
            </div>
          </div>

          {/* Checklist nhóm theo miền — ô tròn nhỏ, font tròn kiểu poster */}
          <div
            className="space-y-4"
            style={{ fontFamily: "var(--font-rounded)" }}
          >
            <h2 className="text-sm font-bold text-foreground">
              Năm nay bạn đã đi được những đâu?
            </h2>
            {REGION_GROUPS.map((region) => {
              const done = region.provinces.filter((p) =>
                visited.has(p.slug),
              ).length;
              return (
                <section key={region.label}>
                  <h3 className="mb-1.5 flex items-baseline gap-1.5 text-xs font-bold uppercase tracking-wide text-warm">
                    {region.label}
                    <span className="font-semibold tabular-nums text-muted-foreground">
                      {done}/{region.provinces.length}
                    </span>
                  </h3>
                  <ul className="columns-2 gap-x-3 sm:columns-3 [&>li]:break-inside-avoid">
                    {region.provinces.map(({ slug, name }) => {
                      const isVisited = visited.has(slug);
                      return (
                        <li key={slug} className="mb-0.5">
                          <button
                            type="button"
                            onClick={() => toggle(slug, name)}
                            aria-pressed={isVisited}
                            className="group flex w-full items-center gap-2 rounded-md py-1 pr-1.5 text-left transition-colors hover:bg-muted/50"
                          >
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                                isVisited
                                  ? "border-warm bg-warm text-warm-foreground"
                                  : "border-muted-foreground/30 group-hover:border-warm/50",
                              )}
                            >
                              {isVisited && <Check className="size-3" aria-hidden />}
                            </span>
                            <span
                              className={cn(
                                "text-[15px] leading-tight",
                                isVisited
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {name}
                            </span>
                          </button>
                        </li>
                      );
                    })}
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
