"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Clock,
  Phone,
  Globe,
  UtensilsCrossed,
  TriangleAlert,
  ExternalLink,
  ChevronDown,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { googleEmbedSrc } from "@/lib/map-url";
import { EATERY_CATEGORY_LABELS, MEAL_LABELS, label } from "@/lib/listing-labels";
import { FoodCrossLink } from "@/components/site/food-cross-link";

type CoverImg = { url: string; isCover: boolean }[];

export type EateryDetailData = {
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  openingHours: string | null;
  phone: string | null;
  website: string | null;
  bookingUrl: string | null;
  meals: string[];
  notice: string | null;
  tags: string[];
  wardName: string | null;
  districtName: string | null;
  provinceName: string | null;
  images: { id: string; url: string; alt: string | null; isCover: boolean }[];
  specialties: { slug: string; name: string; images: CoverImg }[];
};

// Nội dung chi tiết Quán ăn — render trong ngăn trượt (drawer), bố cục dọc tiết kiệm.
export function EateryDetail({
  data,
  onOpenSpecialty,
}: {
  data: EateryDetailData;
  onOpenSpecialty: (slug: string) => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);

  const strip =
    data.images.length > 0
      ? data.images
      : [
          {
            id: "fallback",
            url: coverUrl(data.images, data.slug, 800, 600),
            alt: data.name,
            isCover: true,
          },
        ];
  const single = strip.length === 1;

  const mealLabels = data.meals
    .map((m) => label(MEAL_LABELS, m))
    .filter(Boolean) as string[];
  // Địa chỉ đầy đủ: chi tiết → xã/phường → huyện/quận → tỉnh, bỏ phần đã lặp
  // (address seed thường chứa sẵn tên TP/huyện).
  const fullAddress =
    [data.address, data.wardName, data.districtName, data.provinceName]
      .filter((p): p is string => Boolean(p))
      .reduce<string[]>((acc, part) => {
        if (!acc.join(", ").toLowerCase().includes(part.toLowerCase()))
          acc.push(part);
        return acc;
      }, [])
      .join(", ") || null;
  const facts = [
    { icon: Clock, label: "Giờ mở cửa", value: data.openingHours },
    { icon: UtensilsCrossed, label: "Bữa", value: mealLabels.join(" · ") || null },
    { icon: MapPin, label: "Địa chỉ", value: fullAddress },
    { icon: Phone, label: "Điện thoại", value: data.phone },
  ].filter((f) => f.value);
  const hasMap = data.lat != null && data.lng != null;

  return (
    <div className="flex flex-col pb-8">
      {/* Header dính: thumbnail + tên + category */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/90 py-3 pr-14 pl-5 backdrop-blur-md">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image
            src={coverUrl(data.images, data.slug, 120, 120)}
            alt={data.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          {data.category && (
            <p className="text-xs font-semibold text-warm">
              {label(EATERY_CATEGORY_LABELS, data.category)}
            </p>
          )}
          <h2 className="truncate text-base font-bold tracking-tight">
            {data.name}
          </h2>
        </div>
      </div>

      {/* Dải ảnh cuộn ngang */}
      <div className="hide-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pt-4">
        {strip.map((im) => (
          <div
            key={im.id}
            className={cn(
              "relative aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted",
              single ? "w-full" : "w-[82%] sm:w-72",
            )}
          >
            <Image
              src={im.url}
              alt={im.alt ?? data.name}
              fill
              sizes="(min-width: 640px) 18rem, 82vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="space-y-5 px-5 pt-5">
        {data.notice && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warm/40 bg-warm/[0.07] px-3.5 py-2.5 text-sm">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-warm"
              aria-hidden
            />
            <span className="leading-snug">{data.notice}</span>
          </div>
        )}

        {data.description && (
          <p className="whitespace-pre-line leading-7 text-foreground/90">
            {data.description}
          </p>
        )}

        {/* Hành động: đặt bàn (nổi) / website / chỉ đường / bản đồ */}
        {(data.bookingUrl || data.website || hasMap) && (
          <div className="flex flex-wrap gap-2">
            {data.bookingUrl && (
              <a
                href={data.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-warm px-4 py-2 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
              >
                <ExternalLink className="size-4" aria-hidden /> Đặt bàn
              </a>
            )}
            {data.website && (
              <ActionLink href={data.website} icon={Globe}>
                Website
              </ActionLink>
            )}
            {hasMap && (
              <button
                type="button"
                onClick={() => setMapOpen((v) => !v)}
                aria-expanded={mapOpen}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted/60"
              >
                <MapPin className="size-3.5" aria-hidden /> Bản đồ
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    mapOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            )}
          </div>
        )}

        {hasMap && mapOpen && (
          <div className="overflow-hidden rounded-xl border">
            <iframe
              title={`Bản đồ ${data.name}`}
              className="aspect-[16/9] w-full"
              loading="lazy"
              src={googleEmbedSrc(data.lat!, data.lng!)}
            />
          </div>
        )}

        {/* Thông tin thực địa — danh sách nhãn/giá trị */}
        {facts.length > 0 && (
          <dl className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-card">
            {facts.map((f, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <f.icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm leading-snug">{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}

        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {data.specialties.length > 0 && (
        <div className="mt-7 border-t pt-6">
          <div className="flex items-center gap-2 px-5">
            <UtensilsCrossed className="size-4 text-warm" aria-hidden />
            <h3 className="text-sm font-semibold">Đặc sản nên thử ở đây</h3>
          </div>
          <div className="hide-scrollbar mt-3.5 flex snap-x gap-3 overflow-x-auto px-5">
            {data.specialties.map((s) => (
              <FoodCrossLink
                key={s.slug}
                name={s.name}
                slug={s.slug}
                images={s.images}
                onClick={() => onOpenSpecialty(s.slug)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted/60"
    >
      <Icon className="size-3.5 text-muted-foreground" aria-hidden /> {children}
    </a>
  );
}
