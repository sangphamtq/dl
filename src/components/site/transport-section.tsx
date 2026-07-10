"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bus,
  PlaneLanding,
  Navigation,
  Phone,
  TriangleAlert,
  ArrowRight,
  Car,
  TrainFront,
  Plane,
  Ship,
  Bike,
  Footprints,
  CarTaxiFront,
} from "@/components/icons";

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
  phone: string | null;
  notice: string | null;
  isRecommended: boolean;
  description: string | null;
};

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

function metaLine(t: TransportItem): string {
  return [
    MODE_LABEL[t.mode] ?? t.mode,
    t.duration,
    t.distanceKm != null ? `${t.distanceKm} km` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
    >
      <Phone className="size-3.5" aria-hidden /> {phone}
    </a>
  );
}

// Một lựa chọn — mọi phương tiện đồng cấp: huy hiệu icon + tên + meta thanh lịch,
// mô tả, cảnh báo, đơn vị · hotline · đặt. Ngăn nhau bằng hairline của danh sách.
function Option({ t }: { t: TransportItem }) {
  const Icon = MODE_ICON[t.mode] ?? Navigation;
  const price = formatPrice(t);
  return (
    <div className="flex gap-4 py-5 first:pt-0">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-base font-bold tracking-tight">{t.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{metaLine(t)}</p>
          </div>
          {price && (
            <span className="shrink-0 text-right text-base font-bold text-primary">
              {price}
            </span>
          )}
        </div>

        {t.description && (
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-foreground/80">
            {t.description}
          </p>
        )}

        {t.notice && (
          <p className="mt-2.5 flex max-w-2xl items-start gap-1.5 text-sm text-muted-foreground">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-warm"
              aria-hidden
            />
            <span>{t.notice}</span>
          </p>
        )}

        {(t.operatorName || t.phone || t.bookingUrl) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {t.operatorName && (
              <span className="text-muted-foreground">{t.operatorName}</span>
            )}
            {t.phone && <PhoneLink phone={t.phone} />}
            {t.bookingUrl && (
              <a
                href={t.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                Đặt vé <ArrowRight className="size-4" aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Nhóm "đến nơi" theo điểm xuất phát (giữ nguyên thứ tự — mọi cách đồng cấp).
function groupByOrigin(items: TransportItem[]): [string, TransportItem[]][] {
  const map = new Map<string, TransportItem[]>();
  for (const t of items) {
    const k = t.fromName?.trim() || "Nơi khác";
    const list = map.get(k);
    if (list) list.push(t);
    else map.set(k, [t]);
  }
  return [...map.entries()];
}

function GroupHead({
  icon: Icon,
  title,
  intro,
}: {
  icon: typeof Bus;
  title: string;
  intro: string | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h3>
      </div>
      {intro && (
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {intro}
        </p>
      )}
    </div>
  );
}

// "Đi lại thế nào": "Đến nơi" nhóm theo điểm xuất phát (các cách đồng cấp); "Tại
// chỗ" theo đặc tính. Thanh nhảy dính để không "chôn" phần tại chỗ khi list dài.
export function TransportSection({
  transports,
  placeName,
  getToIntro,
  getAroundIntro,
}: {
  transports: TransportItem[];
  placeName: string;
  getToIntro?: string | null;
  getAroundIntro?: string | null;
}) {
  const getTo = transports.filter((t) => t.direction === "getTo");
  const getAround = transports.filter((t) => t.direction === "getAround");

  const navItems = [
    getTo.length > 0 && { id: "den-noi", label: "Đến nơi", icon: PlaneLanding },
    getAround.length > 0 && {
      id: "tai-cho",
      label: "Đi lại tại chỗ",
      icon: Navigation,
    },
  ].filter(Boolean) as { id: string; label: string; icon: typeof Bus }[];

  const [active, setActive] = useState(navItems[0]?.id ?? "");
  const jumpingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll-spy: sáng chip theo mục đang xem. Khi nhảy có chủ đích thì khóa để
  // chip không "nháy" qua mục giữa đường (mở khóa khi mục đích tới / sau timeout).
  useEffect(() => {
    if (navItems.length < 2) return;
    const els = navItems
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    const obs = new IntersectionObserver(
      (entries) => {
        if (jumpingRef.current) {
          if (
            entries.some(
              (e) => e.isIntersecting && e.target.id === jumpingRef.current,
            )
          )
            jumpingRef.current = null;
          return;
        }
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-160px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navItems.length]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (transports.length === 0) return null;

  const jumpTo = (id: string) => {
    setActive(id);
    jumpingRef.current = id;
    if (timerRef.current) clearTimeout(timerRef.current);
    // Dự phòng: mở khóa sau khi cuộn xong (phòng mục đích không chạm vùng quan sát).
    timerRef.current = setTimeout(() => {
      jumpingRef.current = null;
    }, 700);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {navItems.length > 1 && (
        <nav className="hide-scrollbar sticky top-28 z-30 -mx-4 flex gap-2 overflow-x-auto border-b border-border/60 bg-background/85 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => jumpTo(it.id)}
                aria-current={active === it.id}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  active === it.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {it.label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="space-y-16 pt-8">
        {getTo.length > 0 && (
          <section id="den-noi" className="scroll-mt-40">
            <GroupHead
              icon={PlaneLanding}
              title={`Đến ${placeName}`}
              intro={getToIntro ?? null}
            />
            <div className="mt-8 space-y-10">
              {groupByOrigin(getTo).map(([origin, items]) => (
                <div key={origin}>
                  <h4 className="mb-2 border-b border-border/60 pb-2.5 text-lg font-bold tracking-tight sm:text-xl">
                    <span className="font-medium text-muted-foreground">
                      Từ{" "}
                    </span>
                    {origin}
                  </h4>
                  <div className="divide-y divide-border/60">
                    {items.map((t) => (
                      <Option key={t.id} t={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {getAround.length > 0 && (
          <section id="tai-cho" className="scroll-mt-40">
            <GroupHead
              icon={Navigation}
              title={`Đi lại tại ${placeName}`}
              intro={getAroundIntro ?? null}
            />
            <div className="mt-6 divide-y divide-border/60">
              {getAround.map((t) => (
                <Option key={t.id} t={t} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
