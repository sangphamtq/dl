"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MEAL_LABELS } from "@/lib/listing-labels";
import { CrossLinkCard } from "@/components/site/cross-link-card";

type CoverImg = { url: string; isCover: boolean }[];
type Eatery = {
  slug: string;
  name: string;
  description: string | null;
  meals: string[];
  images: CoverImg;
};
type Specialty = {
  slug: string;
  name: string;
  description: string | null;
  images: CoverImg;
};

const MEAL_CHIPS = ["all", "breakfast", "lunch", "dinner", "cafe", "snack"];

// Mục "Ăn gì": gộp Đặc sản (món nên thử) + Quán ăn (lọc theo bữa).
export function EatSection({
  placeName,
  placeSlug,
  eateries,
  specialties,
}: {
  placeName: string;
  placeSlug: string;
  eateries: Eatery[];
  specialties: Specialty[];
}) {
  const [meal, setMeal] = useState("all");
  const filtered =
    meal === "all"
      ? eateries
      : eateries.filter((e) => e.meals.includes(meal));

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold tracking-tight">
        Ăn gì ở {placeName}
      </h2>

      {/* Đặc sản nên thử */}
      {specialties.length > 0 && (
        <div>
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-lg font-semibold tracking-tight">
              Đặc sản nên thử
            </h3>
            <Link
              href={`/diem-den/${placeSlug}/dac-san`}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {specialties.map((s) => (
              <CrossLinkCard
                key={s.slug}
                href={`/dac-san/${s.slug}`}
                name={s.name}
                slug={s.slug}
                images={s.images}
                subtitle={s.description}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quán ăn — lọc theo bữa */}
      {eateries.length > 0 && (
        <div>
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-lg font-semibold tracking-tight">Quán ăn</h3>
            <Link
              href={`/diem-den/${placeSlug}/quan-an`}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {MEAL_CHIPS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeal(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  meal === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {m === "all" ? "Tất cả" : MEAL_LABELS[m]}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((e) => (
                <CrossLinkCard
                  key={e.slug}
                  href={`/quan-an/${e.slug}`}
                  name={e.name}
                  slug={e.slug}
                  images={e.images}
                  subtitle={
                    e.meals.map((x) => MEAL_LABELS[x] ?? x).join(" · ") || null
                  }
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Chưa có quán cho bữa này.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
