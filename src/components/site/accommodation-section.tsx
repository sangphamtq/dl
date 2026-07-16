"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  BadgeCheck,
  Eye,
  ShieldCheck,
  MessageCircle,
  Phone,
  ArrowRight,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AccommodationDetail,
  type AccommodationDetailData,
} from "@/components/site/accommodation-detail";

type Stay = AccommodationDetailData;

// Tab Lưu trú: danh bạ chỗ ở ĐÃ XÁC MINH CHÍNH CHỦ (không phải OTA). Bố cục biên
// tập: một "đề xuất" lớn dẫn đầu + hàng editorial cho phần còn lại — foreground
// niềm tin (xác minh + kênh chính chủ + chính sách cọc). "Xem nhanh" → drawer;
// bấm card → trang chi tiết /luu-tru/[slug] (đích chia sẻ).
export function AccommodationSection({
  accommodations,
  openSlug,
}: {
  accommodations: Stay[];
  openSlug?: string;
}) {
  const bySlug = useMemo(
    () => new Map(accommodations.map((a) => [a.slug, a])),
    [accommodations],
  );
  const [selected, setSelected] = useState<string | null>(() =>
    openSlug && bySlug.has(openSlug) ? openSlug : null,
  );
  const [cat, setCat] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const active = selected ? bySlug.get(selected) : undefined;
  const quick = (slug: string) => setSelected(slug);

  const catOptions = useMemo(() => {
    const present = new Set(accommodations.map((a) => a.category).filter(Boolean));
    return Object.keys(ACCOMMODATION_CATEGORY_LABELS).filter((c) =>
      present.has(c),
    );
  }, [accommodations]);
  const hasVerified = useMemo(
    () => accommodations.some((a) => a.isVerified),
    [accommodations],
  );

  const filtered = accommodations.filter(
    (a) =>
      (cat === "all" || a.category === cat) && (!verifiedOnly || a.isVerified),
  );
  const [lead, ...rest] = filtered;

  return (
    <div>
      {/* Mở đầu — định vị niềm tin (tách khỏi OTA / FB group) */}
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">Nơi lưu trú</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Chỗ ở đã xác minh chính chủ
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Danh bạ để bạn{" "}
          <span className="font-medium text-foreground">
            liên hệ trực tiếp chủ nhà
          </span>{" "}
          qua kênh hiển thị tại đây — tránh page nhái và lừa cọc. Đây không phải
          nền tảng đặt phòng; bạn tự chốt với chủ.
        </p>
      </header>

      {/* Bộ lọc: chỉ đã xác minh + loại hình */}
      {(hasVerified || catOptions.length > 0) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {hasVerified && (
            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              aria-pressed={verifiedOnly}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                verifiedOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/15",
              )}
            >
              <BadgeCheck className="size-4" aria-hidden />
              Chỉ chỗ đã xác minh
            </button>
          )}
          {catOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-xs font-medium text-muted-foreground/70">
                Loại hình
              </span>
              <Chip active={cat === "all"} onClick={() => setCat("all")}>
                Tất cả
              </Chip>
              {catOptions.map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {label(ACCOMMODATION_CATEGORY_LABELS, c)}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="mt-8 space-y-4">
          {lead && <FeaturedStay a={lead} onQuick={quick} />}
          {rest.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {rest.map((a) => (
                <StayRow key={a.slug} a={a} onQuick={quick} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Không có chỗ ở khớp bộ lọc này.
        </p>
      )}

      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent
          side="right"
          className={cn(
            "w-full gap-0 overflow-y-auto p-0 will-change-transform sm:max-w-md lg:max-w-lg",
            "data-[state=open]:duration-300! data-[state=closed]:duration-200!",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:slide-in-from-right-8! data-[state=closed]:slide-out-to-right-8!",
          )}
        >
          {active && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{active.name}</SheetTitle>
                <SheetDescription>Chi tiết nơi lưu trú</SheetDescription>
              </SheetHeader>
              <AccommodationDetail data={active} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Đề xuất dẫn đầu — thẻ lớn 2 cột, chữ có chỗ thở (kiểu bài biên tập).
function FeaturedStay({ a, onQuick }: { a: Stay; onQuick: (s: string) => void }) {
  const area = a.address?.split(",").pop()?.trim() ?? null;
  return (
    <article className="group overflow-hidden rounded-3xl border border-border/60 bg-card">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <Link
          href={`/luu-tru/${a.slug}`}
          className="relative block aspect-[16/10] overflow-hidden bg-muted lg:aspect-auto"
        >
          <Image
            src={coverUrl(a.images, a.slug, 1000, 700)}
            alt={a.name}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
          {a.isVerified && <VerifiedBadge />}
        </Link>
        <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {a.category
              ? label(ACCOMMODATION_CATEGORY_LABELS, a.category)
              : "Lưu trú"}
            <span className="text-muted-foreground/50"> · </span>
            <span className="text-muted-foreground">Đề xuất</span>
          </p>
          <div>
            <Link
              href={`/luu-tru/${a.slug}`}
              className="text-2xl font-bold tracking-tight transition-colors hover:text-primary"
            >
              {a.name}
            </Link>
            {area && (
              <p className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {area}
              </p>
            )}
          </div>
          {a.description && (
            <p className="line-clamp-3 leading-relaxed text-muted-foreground">
              {a.description}
            </p>
          )}
          <TrustLine a={a} showDeposit />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onQuick(a.slug)}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted/70"
            >
              <Eye className="size-4" aria-hidden />
              Xem nhanh
            </button>
            <Link
              href={`/luu-tru/${a.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Xem trang đầy đủ
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// Hàng editorial — ảnh trái, nội dung phải, chừa chỗ cho mô tả + tín hiệu tin cậy.
function StayRow({ a, onQuick }: { a: Stay; onQuick: (s: string) => void }) {
  const area = a.address?.split(",").pop()?.trim() ?? null;
  return (
    <article className="group relative flex gap-4 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:border-border hover:bg-muted/20">
      <Link
        href={`/luu-tru/${a.slug}`}
        aria-label={a.name}
        className="absolute inset-0 z-10 rounded-2xl"
      />
      <div className="relative aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-44">
        <Image
          src={coverUrl(a.images, a.slug, 400, 300)}
          alt={a.name}
          fill
          sizes="176px"
          className="object-cover"
        />
        {a.isVerified && <VerifiedBadge compact />}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {a.category
            ? label(ACCOMMODATION_CATEGORY_LABELS, a.category)
            : "Lưu trú"}
        </p>
        <h3 className="mt-0.5 truncate font-semibold tracking-tight transition-colors group-hover:text-primary">
          {a.name}
        </h3>
        {area && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{area}</span>
          </p>
        )}
        {a.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {a.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <TrustLine a={a} />
          {/* Nút z cao hơn stretched link → mở drawer, không điều hướng */}
          <button
            type="button"
            onClick={() => onQuick(a.slug)}
            aria-label={`Xem nhanh ${a.name}`}
            className="relative z-20 inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <Eye className="size-3.5" aria-hidden />
            Xem nhanh
          </button>
        </div>
      </div>
    </article>
  );
}

// Tín hiệu tin cậy — kênh liên hệ chính chủ (+ chính sách cọc ở thẻ lớn).
function TrustLine({ a, showDeposit = false }: { a: Stay; showDeposit?: boolean }) {
  const hasContact = a.zalo || a.phone;
  if (!hasContact && !(showDeposit && a.depositPolicy)) return null;
  return (
    <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
      {hasContact && (
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
          Liên hệ chính chủ
          <span className="flex items-center gap-1 text-foreground/60">
            {a.zalo && <MessageCircle className="size-3.5" aria-hidden />}
            {a.phone && <Phone className="size-3.5" aria-hidden />}
          </span>
        </p>
      )}
      {showDeposit && a.depositPolicy && (
        <p className="line-clamp-1">Cọc: {a.depositPolicy}</p>
      )}
    </div>
  );
}

function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary font-medium text-primary-foreground shadow-sm",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <BadgeCheck className={compact ? "size-3" : "size-3.5"} aria-hidden />
      {compact ? "Xác minh" : "Đã xác minh"}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}
