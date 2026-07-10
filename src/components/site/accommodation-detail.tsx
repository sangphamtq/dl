"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Globe,
  BedDouble,
  ExternalLink,
  ChevronDown,
  BadgeCheck,
  MessageCircle,
  Link2,
  TriangleAlert,
  Wallet,
  ArrowRight,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { googleEmbedSrc } from "@/lib/map-url";
import {
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";

export type AccommodationDetailData = {
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  bookingUrl: string | null;
  zalo: string | null;
  facebookUrl: string | null;
  isVerified: boolean;
  depositPolicy: string | null;
  notice: string | null;
  tags: string[];
  images: { id: string; url: string; alt: string | null; isCover: boolean }[];
};

// Zalo có thể là SĐT hoặc link — chuẩn hoá thành URL chat zalo.me.
function zaloHref(v: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^\d]/g, "");
  return digits ? `https://zalo.me/${digits}` : v;
}

// Nội dung chi tiết Nơi lưu trú — render trong ngăn trượt (drawer), bố cục dọc tiết kiệm.
export function AccommodationDetail({
  data,
}: {
  data: AccommodationDetailData;
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

  const facts = [
    { icon: MapPin, value: data.address },
    { icon: Phone, value: data.phone },
  ].filter((f) => f.value);
  const hasMap = data.lat != null && data.lng != null;

  return (
    <div className="flex flex-col pb-6">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background py-3 pr-14 pl-5">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={coverUrl(data.images, data.slug, 120, 120)}
            alt={data.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-medium text-primary">
            <BedDouble className="size-3" aria-hidden />
            {data.category
              ? label(ACCOMMODATION_CATEGORY_LABELS, data.category)
              : "Lưu trú"}
          </p>
          <h2 className="flex items-center gap-1.5 truncate text-base font-bold tracking-tight">
            {data.name}
            {data.isVerified && (
              <BadgeCheck
                className="size-4 shrink-0 text-emerald-600"
                aria-label="Đã xác minh chính chủ"
              />
            )}
          </h2>
        </div>
      </div>

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
        {data.isVerified && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50/60 px-3.5 py-2.5 text-sm">
            <BadgeCheck
              className="mt-0.5 size-4 shrink-0 text-emerald-600"
              aria-hidden
            />
            <span>
              <span className="font-medium text-emerald-700">
                Đã xác minh chính chủ.
              </span>{" "}
              Chỉ liên hệ &amp; chuyển khoản qua kênh hiển thị bên dưới.
            </span>
          </div>
        )}

        {data.notice && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3.5 py-2.5 text-sm">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-amber-600"
              aria-hidden
            />
            <span>{data.notice}</span>
          </div>
        )}

        {facts.length > 0 && (
          <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {facts.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <f.icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="leading-snug">{f.value}</span>
              </div>
            ))}
          </div>
        )}

        {(data.bookingUrl ||
          data.website ||
          data.zalo ||
          data.facebookUrl ||
          hasMap) && (
          <div className="flex flex-wrap gap-2">
            {data.zalo && (
              <ActionLink href={zaloHref(data.zalo)} icon={MessageCircle}>
                Zalo
              </ActionLink>
            )}
            {data.facebookUrl && (
              <ActionLink href={data.facebookUrl} icon={Link2}>
                Facebook
              </ActionLink>
            )}
            {data.bookingUrl && (
              <ActionLink href={data.bookingUrl} icon={ExternalLink}>
                Đặt phòng
              </ActionLink>
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
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60"
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

        {data.depositPolicy && (
          <div className="flex items-start gap-2 rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm">
            <Wallet
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span>
              <span className="font-medium">Cọc: </span>
              {data.depositPolicy}
            </span>
          </div>
        )}

        {data.description && (
          <p className="whitespace-pre-line leading-7 text-foreground/90">
            {data.description}
          </p>
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

        <Link
          href={`/luu-tru/${data.slug}`}
          className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Xem trang đầy đủ
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60"
    >
      <Icon className="size-3.5 text-primary" aria-hidden /> {children}
    </a>
  );
}
