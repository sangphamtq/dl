"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { UtensilsCrossed, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { EATERY_CATEGORY_LABELS, MEAL_LABELS, label } from "@/lib/listing-labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  SpecialtyDetail,
  type SpecialtyDetailData,
} from "@/components/site/specialty-detail";
import {
  EateryDetail,
  type EateryDetailData,
} from "@/components/site/eatery-detail";

const MEAL_CHIPS = ["all", "breakfast", "lunch", "dinner", "cafe", "snack"];

type Selected =
  | { type: "specialty"; slug: string }
  | { type: "eatery"; slug: string }
  | null;

// Mục Ẩm thực: lưới card gọn (Đặc sản + Quán ăn lọc theo bữa); bấm card mở
// ngăn trượt (drawer) hiển thị chi tiết. Cross-link trong drawer chuyển sang mục kia.
export function FoodSection({
  placeName,
  specialties,
  eateries,
}: {
  placeName: string;
  specialties: SpecialtyDetailData[];
  eateries: EateryDetailData[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [meal, setMeal] = useState(() => searchParams.get("meal") ?? "all");
  const [selected, setSelected] = useState<Selected>(null);
  const hasBoth = specialties.length > 0 && eateries.length > 0;

  // Lưu bữa đang lọc vào URL (?meal=) để giữ khi chia sẻ/quay lại.
  function chooseMeal(m: string) {
    setMeal(m);
    const params = new URLSearchParams(searchParams.toString());
    if (m === "all") params.delete("meal");
    else params.set("meal", m);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Scroll-spy cho thanh nhảy dính: mục nào đang ở gần đầu thì sáng.
  const [active, setActive] = useState<"dac-san" | "quan-an">(
    specialties.length > 0 ? "dac-san" : "quan-an",
  );
  const specRef = useRef<HTMLElement | null>(null);
  const eatRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!hasBoth) return;
    const els = [specRef.current, eatRef.current].filter(
      (el): el is HTMLElement => el !== null,
    );
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting)
            setActive(e.target.id as "dac-san" | "quan-an");
        }
      },
      { rootMargin: "-160px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [hasBoth]);

  const jumpTo = (id: "dac-san" | "quan-an") => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const specBySlug = useMemo(
    () => new Map(specialties.map((s) => [s.slug, s])),
    [specialties],
  );
  const eateryBySlug = useMemo(
    () => new Map(eateries.map((e) => [e.slug, e])),
    [eateries],
  );

  const filtered =
    meal === "all" ? eateries : eateries.filter((e) => e.meals.includes(meal));

  const openSpecialty = (slug: string) =>
    specBySlug.has(slug) && setSelected({ type: "specialty", slug });
  const openEatery = (slug: string) =>
    eateryBySlug.has(slug) && setSelected({ type: "eatery", slug });

  // Deep-link từ trang khác (vd card "Quán ăn gần đây" ở /dia-diem):
  // #eatery-<slug> / #specialty-<slug> → mở đúng drawer khi vào trang.
  // hash chỉ đọc được ở browser nên phải nằm trong effect (không đưa vào
  // useState initializer được — SSR không có window, mở Sheet ngay lúc
  // hydrate cũng gây mismatch).
  useEffect(() => {
    const m = window.location.hash.match(/^#(eatery|specialty)-(.+)$/);
    if (!m) return;
    const slug = decodeURIComponent(m[2]);
    if (m[1] === "eatery" && eateryBySlug.has(slug))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected({ type: "eatery", slug });
    else if (m[1] === "specialty" && specBySlug.has(slug))
      setSelected({ type: "specialty", slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ đọc hash lúc mount

  const activeSpecialty =
    selected?.type === "specialty" ? specBySlug.get(selected.slug) : undefined;
  const activeEatery =
    selected?.type === "eatery" ? eateryBySlug.get(selected.slug) : undefined;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Ăn gì ở {placeName}</h2>

      {/* Thanh nhảy dính — luôn thấy cả hai mục khi cuộn */}
      {hasBoth && (
        <nav className="sticky top-28 z-30 -mx-4 flex gap-2 border-b border-border/60 bg-background/85 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <JumpBtn
            icon={UtensilsCrossed}
            label="Đặc sản"
            count={specialties.length}
            active={active === "dac-san"}
            onClick={() => jumpTo("dac-san")}
          />
          <JumpBtn
            icon={Store}
            label="Quán ăn"
            count={eateries.length}
            active={active === "quan-an"}
            onClick={() => jumpTo("quan-an")}
          />
        </nav>
      )}

      {specialties.length > 0 && (
        <section id="dac-san" ref={specRef} className="scroll-mt-40">
          <SectionHead title="Đặc sản nên thử" count={specialties.length} />
          <Grid>
            {specialties.map((s) => (
              <FoodCard
                key={s.slug}
                name={s.name}
                slug={s.slug}
                images={s.images}
                subtitle={s.description}
                tag={s.tags[0] ?? null}
                onClick={() => setSelected({ type: "specialty", slug: s.slug })}
              />
            ))}
          </Grid>
        </section>
      )}

      {eateries.length > 0 && (
        <section id="quan-an" ref={eatRef} className="scroll-mt-40">
          <SectionHead title="Quán ăn" count={eateries.length} />
          <div className="mt-4 flex flex-wrap gap-2">
            {MEAL_CHIPS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => chooseMeal(m)}
                aria-pressed={meal === m}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  meal === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {m === "all" ? "Tất cả" : label(MEAL_LABELS, m)}
              </button>
            ))}
          </div>
          {filtered.length > 0 ? (
            <Grid>
              {filtered.map((e) => (
                <FoodCard
                  key={e.slug}
                  name={e.name}
                  slug={e.slug}
                  images={e.images}
                  subtitle={e.description}
                  tag={e.category ? label(EATERY_CATEGORY_LABELS, e.category) : null}
                  meta={e.meals.map((m) => label(MEAL_LABELS, m)).filter(Boolean) as string[]}
                  onClick={() => setSelected({ type: "eatery", slug: e.slug })}
                />
              ))}
            </Grid>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Chưa có quán cho bữa này.
            </p>
          )}
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
          {activeSpecialty && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{activeSpecialty.name}</SheetTitle>
                <SheetDescription>Chi tiết đặc sản</SheetDescription>
              </SheetHeader>
              <SpecialtyDetail data={activeSpecialty} onOpenEatery={openEatery} />
            </>
          )}
          {activeEatery && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{activeEatery.name}</SheetTitle>
                <SheetDescription>Chi tiết quán ăn</SheetDescription>
              </SheetHeader>
              <EateryDetail data={activeEatery} onOpenSpecialty={openSpecialty} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function FoodCard({
  name,
  slug,
  images,
  subtitle,
  tag,
  meta = [],
  onClick,
}: {
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  subtitle?: string | null;
  tag?: string | null;
  meta?: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xem chi tiết ${name}`}
      className="group block text-left"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {tag && (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
            {tag}
          </span>
        )}
      </div>
      <h3 className="mt-2.5 font-semibold tracking-tight line-clamp-1">{name}</h3>
      {subtitle && (
        <p className="mt-1 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
      {meta.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {meta.map((m, i) => (
            <span
              key={i}
              className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </button>
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
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
      <span
        className={cn(
          "text-xs font-medium",
          active ? "text-primary-foreground/80" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <span className="text-sm font-medium text-muted-foreground">{count}</span>
    </div>
  );
}
