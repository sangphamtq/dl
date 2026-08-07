"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Store,
  MapPin,
  ChefHat,
  Lightbulb,
  Clock,
  ChevronRight,
  Coffee,
  Eye,
  Sunrise,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  EateryDetail,
  type EateryDetailData,
} from "@/components/site/eatery-detail";

// Bữa: trục lọc chính của phần ĂN. "cafe" cố tình KHÔNG có mặt — quán nước đã
// có mục riêng bên dưới, để lại đây thì hai chỗ cùng nghĩa.
const MEAL_CHIPS = ["all", "breakfast", "lunch", "dinner", "latenight", "snack"];


type Selected = { type: "eatery"; slug: string } | null;

export type FoodExperience = {
  slug: string;
  name: string;
  description: string | null;
  durationText: string | null;
  images: { url: string; isCover: boolean }[];
};

// Mục Ẩm thực: bản sắc → Ăn ở đâu (lọc bữa/kiểu) → Quán nước & cà phê (lọc theo
// hướng nhìn) → Trải nghiệm → Mẹo. Bấm card mở drawer chi tiết.
//
// Khối "Món phải thử" (Specialty) ĐÃ GỠ cùng lúc với việc tắt hiển thị phần món
// ăn trên toàn trang công khai — dữ liệu vẫn nguyên trong DB. Cần dựng lại thì
// lấy trong lịch sử git.
export function FoodSection({
  placeName,
  intro,
  tips,
  eateries,
  experiences,
}: {
  placeName: string;
  intro: string | null;
  tips: string[];
  eateries: EateryDetailData[];
  experiences: FoodExperience[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [meal, setMeal] = useState(() => searchParams.get("meal") ?? "all");
  const [cat, setCat] = useState("all");
  const [view, setView] = useState("all");
  const [selected, setSelected] = useState<Selected>(null);

  // Một quán là chỗ ĂN hay chỗ NGỒI (hay cả hai) — quyết định nó nằm mục nào.
  const eats = useMemo(
    () => eateries.filter((e) => e.venueKind !== "drink"),
    [eateries],
  );
  const drinks = useMemo(
    () => eateries.filter((e) => e.venueKind !== "eat"),
    [eateries],
  );

  // Mọi section đang có dữ liệu → thanh nhảy dính (để không bị "chôn" khi list dài).
  const sections = useMemo(() => {
    const eat = eats.length > 0 && {
      id: "quan-an",
      label: "Ăn ở đâu",
      icon: Store,
      count: eats.length,
    };
    const drink = drinks.length > 0 && {
      id: "quan-nuoc",
      label: "Quán nước",
      icon: Coffee,
      count: drinks.length,
    };
    return [
      eat,
      drink,
      experiences.length > 0 && {
        id: "trai-nghiem",
        label: "Trải nghiệm",
        icon: ChefHat,
        count: experiences.length,
      },
      tips.length > 0 && {
        id: "meo",
        label: "Mẹo",
        icon: Lightbulb,
        count: tips.length,
      },
    ].filter(Boolean) as {
      id: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      count: number;
    }[];
  }, [eats.length, drinks.length, experiences.length, tips.length]);

  // Lưu bữa đang lọc vào URL (?meal=) để giữ khi chia sẻ/quay lại.
  function chooseMeal(m: string) {
    setMeal(m);
    const params = new URLSearchParams(searchParams.toString());
    if (m === "all") params.delete("meal");
    else params.set("meal", m);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Scroll-spy cho thanh nhảy dính: section nào đang ở gần đầu thì sáng.
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  // Khóa scroll-spy khi đang nhảy có chủ đích → chip không "nháy" qua các section giữa.
  const jumpingRef = useRef<string | null>(null);
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sections.length < 2) return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    const obs = new IntersectionObserver(
      (entries) => {
        // Đang nhảy: bỏ qua section giữa đường, chỉ mở khóa khi section đích đã tới.
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
  }, [sections]);

  // Dọn timer khi unmount.
  useEffect(
    () => () => {
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
    },
    [],
  );

  const jumpTo = (id: string) => {
    setActive(id);
    jumpingRef.current = id;
    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
    // Dự phòng: mở khóa sau khi cuộn xong, phòng section đích không chạm vùng quan sát.
    jumpTimerRef.current = setTimeout(() => {
      jumpingRef.current = null;
    }, 700);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const eateryBySlug = useMemo(
    () => new Map(eateries.map((e) => [e.slug, e])),
    [eateries],
  );

  // Trục lọc phụ chỉ hiện giá trị thật sự có trong dữ liệu (không filter rỗng).
  const catOptions = useMemo(() => {
    const present = new Set(eats.map((e) => e.category).filter(Boolean));
    return Object.keys(EATERY_CATEGORY_LABELS).filter((c) => present.has(c));
  }, [eats]);

  // Quán nước lọc theo HƯỚNG NHÌN, không theo bữa — lý do đến là cảnh.
  const viewOptions = useMemo(() => {
    const present = new Set(drinks.map((e) => e.viewType).filter(Boolean));
    return Object.keys(VIEW_TYPE_LABELS).filter((v) => present.has(v));
  }, [drinks]);

  const filtered = eats.filter(
    (e) =>
      (meal === "all" || e.meals.includes(meal)) &&
      (cat === "all" || e.category === cat),
  );

  // Có view lên trước — trong cùng mục, quán ngắm cảnh là thứ đáng xem nhất.
  const filteredDrinks = drinks
    .filter((e) => view === "all" || e.viewType === view)
    .slice()
    .sort((a, b) => Number(Boolean(b.viewType)) - Number(Boolean(a.viewType)));

  // Deep-link từ trang khác (vd card "Quán ăn gần đây" ở /dia-diem):
  // #eatery-<slug> → mở đúng drawer khi vào trang.
  useEffect(() => {
    const m = window.location.hash.match(/^#eatery-(.+)$/);
    if (!m) return;
    const slug = decodeURIComponent(m[1]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (eateryBySlug.has(slug)) setSelected({ type: "eatery", slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ đọc hash lúc mount

  const activeEatery =
    selected?.type === "eatery" ? eateryBySlug.get(selected.slug) : undefined;

  // ── Ăn ở đâu: quán ăn thực dụng, lọc bữa / kiểu / giá ──
  const eatsBlock = eats.length > 0 && (
    <section key="quan-an" id="quan-an" className="scroll-mt-40">
      <SectionHead icon={Store} title="Ăn ở đâu" count={eats.length} unit="quán" />

      {/* Lọc chính: theo bữa */}
      <div className="mt-5 flex flex-wrap gap-2">
        {MEAL_CHIPS.map((m) => (
          <FilterChip
            key={m}
            active={meal === m}
            onClick={() => chooseMeal(m)}
            primary
          >
            {m === "all" ? "Mọi bữa" : label(MEAL_LABELS, m)}
          </FilterChip>
        ))}
      </div>

      {/* Lọc phụ: kiểu */}
      {catOptions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <FilterGroup label="Kiểu">
            <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
              Tất cả
            </FilterChip>
            {catOptions.map((c) => (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
                {label(EATERY_CATEGORY_LABELS, c)}
              </FilterChip>
            ))}
          </FilterGroup>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => (
            <EateryCard
              key={e.slug}
              eatery={e}
              onClick={() => setSelected({ type: "eatery", slug: e.slug })}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Không có quán khớp bộ lọc này.
        </p>
      )}
    </section>
  );

  // ── Quán nước & cà phê: đến vì CẢNH — ảnh to, lọc theo hướng nhìn ──
  const drinksBlock = drinks.length > 0 && (
    <section key="quan-nuoc" id="quan-nuoc" className="scroll-mt-40">
      <SectionHead
        icon={Coffee}
        title="Quán nước & cà phê"
        count={drinks.length}
        unit="quán"
      />

      {viewOptions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <FilterChip active={view === "all"} onClick={() => setView("all")} primary>
            Tất cả
          </FilterChip>
          {viewOptions.map((v) => (
            <FilterChip
              key={v}
              active={view === v}
              onClick={() => setView(v)}
              primary
            >
              {label(VIEW_TYPE_LABELS, v)}
            </FilterChip>
          ))}
        </div>
      )}

      {filteredDrinks.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDrinks.map((e) => (
            <DrinkCard
              key={e.slug}
              eatery={e}
              onClick={() => setSelected({ type: "eatery", slug: e.slug })}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Không có quán khớp bộ lọc này.
        </p>
      )}
    </section>
  );

  return (
    <div>
      {/* Mở đầu — bản sắc ẩm thực */}
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-warm">Ẩm thực</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Ăn gì ở {placeName}
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {intro ??
            "Món đặc trưng đáng thử và những quán được gợi ý — bấm để xem chi tiết, địa chỉ và nơi thưởng thức."}
        </p>
      </header>

      {/* Thanh nhảy dính — mọi section, để không bị "chôn" khi list dài */}
      {sections.length > 1 && (
        <nav className="hide-scrollbar sticky top-28 z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-border/60 bg-background/85 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6">
          {sections.map((s) => (
            <JumpBtn
              key={s.id}
              icon={s.icon}
              label={s.label}
              count={s.count}
              active={active === s.id}
              onClick={() => jumpTo(s.id)}
            />
          ))}
        </nav>
      )}

      <div className="mt-12 space-y-14">
        {eatsBlock}
        {drinksBlock}
      </div>

      {/* ── Trải nghiệm ẩm thực: tour/lớp học — link sang trang chi tiết ── */}
      {experiences.length > 0 && (
        <section id="trai-nghiem" className="mt-14 scroll-mt-40">
          <SectionHead
            icon={ChefHat}
            title="Trải nghiệm ẩm thực"
            count={experiences.length}
            unit="trải nghiệm"
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((x) => (
              <ExperienceLinkCard key={x.slug} exp={x} />
            ))}
          </div>
        </section>
      )}

      {/* ── Biết trước khi ăn: mẹo thực địa ── */}
      {tips.length > 0 && (
        <section id="meo" className="mt-14 scroll-mt-40">
          <SectionHead
            icon={Lightbulb}
            title="Biết trước khi ăn"
            count={tips.length}
            unit="mẹo"
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {tips.map((t, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-warm/15 text-warm">
                  <Lightbulb className="size-3" aria-hidden />
                </span>
                <span className="text-sm leading-relaxed text-foreground/90">
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className={cn(
            "w-full gap-0 overflow-y-auto p-0 will-change-transform sm:max-w-md lg:max-w-lg",
            // Trượt ngắn (~2rem) + mờ dần, thay vì bay vào từ ngoài màn hình.
            "data-[state=open]:duration-300! data-[state=closed]:duration-200!",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:slide-in-from-right-8! data-[state=closed]:slide-out-to-right-8!",
          )}
        >
          {activeEatery && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{activeEatery.name}</SheetTitle>
                <SheetDescription>Chi tiết quán ăn</SheetDescription>
              </SheetHeader>
              <EateryDetail data={activeEatery} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Card quán ăn — hàng ngang: ảnh + tên + loại · giá + khu vực + mô tả + bữa.
function EateryCard({
  eatery: e,
  onClick,
}: {
  eatery: EateryDetailData;
  onClick: () => void;
}) {
  const area =
    [e.wardName, e.districtName].filter(Boolean).join(", ") || null;
  const meals = e.meals
    .map((m) => label(MEAL_LABELS, m))
    .filter(Boolean) as string[];
  const category = e.category
    ? label(EATERY_CATEGORY_LABELS, e.category)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xem chi tiết ${e.name}`}
      className="group flex gap-4 rounded-2xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-border hover:bg-muted/30"
    >
      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
        <Image
          src={coverUrl(e.images, e.slug)}
          alt={e.name}
          fill
          sizes="160px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {category && (
          <p className="text-xs font-semibold text-warm">{category}</p>
        )}
        <h3 className="mt-0.5 truncate font-semibold tracking-tight transition-colors group-hover:text-primary">
          {e.name}
        </h3>
        {area && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{area}</span>
          </p>
        )}
        {e.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {e.description}
          </p>
        )}
        {meals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meals.slice(0, 4).map((m) => (
              <span
                key={m}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// Card quán nước — ảnh TO vì view chính là thứ khách mua; badge hướng nhìn trên
// ảnh, giờ vàng & giá ngay dưới tên.
function DrinkCard({
  eatery: e,
  onClick,
}: {
  eatery: EateryDetailData;
  onClick: () => void;
}) {
  const area = [e.wardName, e.districtName].filter(Boolean).join(", ") || null;
  const viewLabel = label(VIEW_TYPE_LABELS, e.viewType);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xem chi tiết ${e.name}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-sm shadow-black/5 transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={coverUrl(e.images, e.slug)}
          alt={e.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {viewLabel && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
            <Eye className="size-3 shrink-0 text-primary" aria-hidden />
            {viewLabel}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold tracking-tight transition-colors group-hover:text-primary">
          {e.name}
        </h3>
        {area && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{area}</span>
          </p>
        )}
        {e.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {e.description}
          </p>
        )}
        {e.bestTime && (
          <p className="mt-3 inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-primary">
            <Sunrise className="size-3.5 shrink-0" aria-hidden />
            {e.bestTime}
          </p>
        )}
      </div>
    </button>
  );
}

// Card trải nghiệm ẩm thực — dọc: ảnh + tên + thời lượng, link sang trang chi tiết.
function ExperienceLinkCard({ exp }: { exp: FoodExperience }) {
  return (
    <Link
      href={`/hoat-dong/${exp.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border hover:bg-muted/30"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={coverUrl(exp.images, exp.slug)}
          alt={exp.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-warm/95 px-2.5 py-1 text-xs font-semibold text-warm-foreground shadow-sm">
          Trải nghiệm
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold tracking-tight transition-colors group-hover:text-primary">
          {exp.name}
        </h3>
        {exp.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {exp.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between pt-1">
          {exp.durationText ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {exp.durationText}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            Xem chi tiết
            <ChevronRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterChip({
  active,
  primary = false,
  onClick,
  children,
}: {
  active: boolean;
  primary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full font-medium transition-colors",
        primary ? "px-3.5 py-1.5 text-sm" : "px-3 py-1 text-xs",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs font-medium text-muted-foreground/70">
        {label}
      </span>
      {children}
    </div>
  );
}

function JumpBtn({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
      <span
        className={cn(
          "text-xs font-medium",
          active ? "text-background/70" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SectionHead({
  icon: Icon,
  title,
  count,
  unit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warm/10 text-warm">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {count} {unit}
        </p>
      </div>
    </div>
  );
}
