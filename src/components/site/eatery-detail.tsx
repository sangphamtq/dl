"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { AddToTripButton } from "@/components/site/add-to-trip-button";
import { coverUrl } from "@/lib/place-image";
import { googleEmbedSrc } from "@/lib/map-url";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { formatMinutes, type OpeningStatus } from "@/lib/opening-hours";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";

export type EateryDetailData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  venueKind: string;
  viewType: string | null;
  bestTime: string | null;
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
  provinceName: string | null;
  images: { id: string; url: string; alt: string | null; isCover: boolean }[];
  menuImages: { id: string; url: string; alt: string | null }[];
};

export function EateryDetail({
  data,
  status,
  initialTab = "anh",
}: {
  data: EateryDetailData;
  status?: OpeningStatus | null;
  initialTab?: "anh" | "menu";
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [shot, setShot] = useState(0);
  const [tab, setTab] = useState<"anh" | "menu">(
    data.menuImages.length > 0 ? initialTab : "anh",
  );
  const [zoom, setZoom] = useState<number | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const menu = data.menuImages;

  const gallery =
    data.images.length > 0
      ? data.images
      : [
          {
            id: "fallback",
            url: coverUrl(data.images, data.slug, 1200, 900),
            alt: data.name,
            isCover: true,
          },
        ];
  const isMenu = tab === "menu";
  const slides = isMenu ? menu : gallery;
  const many = slides.length > 1;
  const changeTab = (t: "anh" | "menu") => {
    setTab(t);
    setShot(0);
  };

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setShot(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const mealLabels = data.meals
    .map((m) => label(MEAL_LABELS, m))
    .filter(Boolean) as string[];
  const viewLabel = label(VIEW_TYPE_LABELS, data.viewType);
  const area = data.wardName ?? "";

  const fullAddress =
    [data.address, data.wardName, data.provinceName]
      .filter((p): p is string => Boolean(p))
      .reduce<string[]>((acc, part) => {
        if (!acc.join(", ").toLowerCase().includes(part.toLowerCase()))
          acc.push(part);
        return acc;
      }, [])
      .join(", ") || null;

  const hasMap = data.lat != null && data.lng != null;
  const directions = hasMap
    ? `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`
    : null;

  const sv = status ? statusView(status) : null;

  const street = data.address?.trim() || fullAddress;

  return (
    <div className="flex max-h-[inherit] flex-col lg:grid lg:h-[min(88vh,44rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden max-lg:aspect-[4/3] lg:h-full",
          isMenu ? "bg-foreground/90" : "bg-muted",
        )}
      >
        <Carousel
          key={tab}
          setApi={setApi}
          opts={{ startIndex: shot, loop: many, watchDrag: many }}
          className="absolute inset-0 [&>div]:h-full"
        >
          <CarouselContent className="ml-0 h-full">
            {slides.map((im, i) => (
              <CarouselItem key={im.id} className="relative h-full pl-0">
                {isMenu ? (
                  <button
                    type="button"
                    onClick={() => setZoom(i)}
                    aria-label={`Phóng to thực đơn ${i + 1}`}
                    className={cn(
                      "group absolute inset-0 flex w-full items-center justify-center p-4 sm:p-6",
                      many ? "pb-[9.5rem]" : "pb-[5.5rem]",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={im.url}
                      alt={im.alt ?? `Thực đơn ${data.name}`}
                      draggable={false}
                      className={cn(R_CARD, "max-h-full max-w-full select-none object-contain shadow-2xl transition-transform duration-200 group-hover:scale-[1.01]")}
                    />
                    <span className={cn(R_BADGE, "pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur")}>
                      <Glyph name="expand" className="size-3.5" />
                      Bấm để phóng to
                    </span>
                  </button>
                ) : (
                  <Image
                    src={im.url}
                    alt={im.alt ?? data.name}
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {!isMenu && (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55"
            aria-hidden
          />
        )}

        {!isMenu && (
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            {status && <StatusPill status={status} />}
            {viewLabel && (
              <span className={cn(R_BADGE, "inline-flex items-center gap-1 bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm")}>
                <Glyph name="eye" className="size-3.5 shrink-0 text-primary" />
                Nhìn ra {viewLabel.toLowerCase()}
              </span>
            )}
          </div>
        )}

        {many && (
          <>
            <ArrowBtn side="left" onClick={() => api?.scrollPrev()} />
            <ArrowBtn side="right" onClick={() => api?.scrollNext()} />
          </>
        )}

        {(isMenu || many) && (
          <span className={cn(R_BADGE, "absolute right-4 top-4 inline-flex items-center gap-1.5 bg-background/85 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur")}>
            {isMenu && (
              <>
                <Glyph name="bowl" className="size-3.5 shrink-0" />
                Thực đơn
              </>
            )}
            {many && (
              <span className="tabular-nums">
                {shot + 1}/{slides.length}
              </span>
            )}
          </span>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-4">
          {menu.length > 0 && (
            <div className="flex">
              <MediaSwitch
                preview={(isMenu ? gallery : menu)[0]}
                label={isMenu ? "Ảnh quán" : "Thực đơn"}
                count={(isMenu ? gallery : menu).length}
                fit={isMenu ? "cover" : "contain"}
                onClick={() => changeTab(isMenu ? "anh" : "menu")}
              />
            </div>
          )}

          {many && (
            <div className="pointer-events-auto -m-1 flex gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {slides.map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-current={i === shot}
                  className={cn(
                    R_BADGE,
                    "relative size-14 shrink-0 overflow-hidden ring-2 transition-all",
                    isMenu && "bg-background",
                    i === shot
                      ? "ring-white"
                      : "opacity-70 ring-white/0 hover:opacity-100",
                  )}
                >
                  <Image
                    src={im.url}
                    alt=""
                    fill
                    sizes="56px"
                    className={isMenu ? "object-contain p-0.5" : "object-cover"}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {data.category && (
            <p className="text-sm font-semibold text-warm">
              {label(EATERY_CATEGORY_LABELS, data.category)}
            </p>
          )}
          <DialogTitle className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl">
            {data.name}
          </DialogTitle>
          {area && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Glyph name="pin" className="size-4 shrink-0" />
              {area}
            </p>
          )}
          <DialogDescription className="sr-only">
            Thông tin chi tiết quán {data.name}
          </DialogDescription>

          {/* Lưu vào lịch trình — đặt ở đây chứ KHÔNG nhét vào thanh ghim đáy:
              thanh đó có "Chỉ đường" làm nút chính, thêm một nút nữa vào là hai
              lời mời tranh nhau. Đây cũng là chỗ luôn hiện, kể cả quán không có
              số điện thoại/website nên không có thanh ghim. */}
          <div className="mt-3">
            <AddToTripButton
              target={{ kind: "eatery", id: data.id }}
              name={data.name}
              className="h-8 px-3 text-xs"
            />
          </div>

          {(data.openingHours || sv || data.bestTime) && (
            <div className={cn(R_CARD, "mt-4 space-y-2 bg-muted/50 p-4")}>
              {sv && (
                <p
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold",
                    sv.tone,
                  )}
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", sv.dot)}
                    aria-hidden
                  />
                  {sv.label}
                  {sv.detail && (
                    <span className="font-normal text-muted-foreground">
                      · {sv.detail}
                    </span>
                  )}
                </p>
              )}
              {data.openingHours && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Glyph name="clock" className="size-4 shrink-0" />
                  <span className="tabular-nums">{data.openingHours}</span>
                </p>
              )}
              {data.bestTime && (
                <p className="flex items-start gap-2 text-sm font-medium text-primary">
                  <Glyph name="sunrise" className="mt-0.5 size-4 shrink-0" />
                  <span className="leading-snug">
                    Đẹp nhất: {data.bestTime}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Cảnh báo: nền cam nhạt, KHÔNG viền — cột này đã nhiều khung rồi */}
          {data.notice && (
            <div className={cn(R_CARD, "mt-3 flex items-start gap-2.5 bg-warm/10 px-4 py-3 text-sm")}>
              <Glyph
                name="warn"
                className="mt-0.5 size-4 shrink-0 text-warm"
              />
              <span className="leading-relaxed">{data.notice}</span>
            </div>
          )}

          {data.description && (
            <p className="mt-5 whitespace-pre-line leading-7 text-foreground/90">
              {data.description}
            </p>
          )}

          {menu.length > 0 && !isMenu && (
            <button
              type="button"
              onClick={() => changeTab("menu")}
              className={cn(R_CARD, "mt-5 flex w-full items-center gap-3 border border-border/60 bg-card p-3 text-left transition-colors hover:border-border hover:bg-muted/40")}
            >
              <span className={cn(R_BADGE, "relative size-12 shrink-0 overflow-hidden bg-muted")}>
                <Image
                  src={menu[0].url}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Xem thực đơn
                </span>
                <span className="block text-xs text-muted-foreground">
                  {menu.length} ảnh chụp thực đơn · bấm để phóng to
                </span>
              </span>
              <Glyph name="forward" className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* ── Thông tin còn lại: hàng gạch chân, KHÔNG bọc thẻ ──
                 Giờ mở cửa đã lên khối trên; ở đây chỉ còn thứ chưa nói ở đâu.
                 Bỏ viền ngoài để cột bớt "hộp chồng hộp". */}
          {(street || mealLabels.length > 0 || viewLabel || data.phone) && (
            <dl className="mt-6 divide-y divide-border/60 border-y border-border/60">
              {street && (
                <Row glyph="pin" label="Địa chỉ">
                  <span className="block leading-snug">{street}</span>
                  {hasMap && (
                    <button
                      type="button"
                      onClick={() => setMapOpen((v) => !v)}
                      aria-expanded={mapOpen}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {mapOpen ? "Ẩn bản đồ" : "Xem trên bản đồ"}
                      <Glyph
                        name="chevron-down"
                        className={cn(
                          "size-3.5 transition-transform",
                          mapOpen && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </Row>
              )}
              {mealLabels.length > 0 && (
                <Row glyph="bowl" label="Hợp bữa">
                  <span className="mt-0.5 flex flex-wrap gap-1.5">
                    {mealLabels.map((m) => (
                      <span
                        key={m}
                        className={cn(R_BADGE, "bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground")}
                      >
                        {m}
                      </span>
                    ))}
                  </span>
                </Row>
              )}
              {viewLabel && (
                <Row glyph="eye" label="Nhìn ra">
                  {viewLabel}
                </Row>
              )}
              {data.phone && (
                <Row glyph="phone" label="Điện thoại">
                  <a href={`tel:${data.phone}`} className="hover:underline">
                    {data.phone}
                  </a>
                </Row>
              )}
            </dl>
          )}

          {hasMap && mapOpen && (
            <div className={cn(R_CARD, "mt-4 overflow-hidden border border-border/60")}>
              <iframe
                title={`Bản đồ ${data.name}`}
                className="aspect-[16/10] w-full"
                loading="lazy"
                src={googleEmbedSrc(data.lat!, data.lng!)}
              />
            </div>
          )}

          {data.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <span
                  key={t}
                  className={cn(R_BADGE, "bg-muted px-2.5 py-1 text-xs text-muted-foreground")}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {(directions || data.phone || data.bookingUrl || data.website) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(R_CTRL, "inline-flex flex-1 items-center justify-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90")}
              >
                <Glyph name="navigation" className="size-4" />
                Chỉ đường
              </a>
            )}
            {data.phone && (
              <IconAction href={`tel:${data.phone}`} glyph="phone" label="Gọi quán" />
            )}
            {data.bookingUrl && (
              <a
                href={data.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(R_CTRL, "inline-flex items-center gap-1.5 bg-warm px-4 py-2.5 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90")}
              >
                <Glyph name="external" className="size-4" /> Đặt bàn
              </a>
            )}
            {data.website && (
              <IconAction href={data.website} glyph="globe" label="Website" external />
            )}
          </div>
        )}
      </div>

      <MenuZoom
        images={menu}
        name={data.name}
        index={zoom}
        onIndex={setZoom}
        onClose={() => setZoom(null)}
      />
    </div>
  );
}

function MenuZoom({
  images,
  name,
  index,
  onIndex,
  onClose,
}: {
  images: { id: string; url: string; alt: string | null }[];
  name: string;
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const many = images.length > 1;

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        onIndex((index! - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndex((index! + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, many, index, images.length, onIndex]);

  if (!open) return null;
  const img = images[index!];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 border-0 bg-black/95 p-0"
      >
        <DialogTitle className="sr-only">Thực đơn {name}</DialogTitle>
        <DialogDescription className="sr-only">
          Ảnh {index! + 1} trên {images.length}
        </DialogDescription>

        <div className="relative size-full">
          <Image
            key={img.id}
            src={img.url}
            alt={img.alt ?? `Thực đơn ${name}`}
            fill
            sizes="100vw"
            className="object-contain p-4 sm:p-8"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className={cn(R_CTRL, "absolute right-4 top-4 grid size-10 place-items-center bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20")}
        >
          <Glyph name="close" className="size-5" />
        </button>

        {many && (
          <>
            <ZoomNav
              side="left"
              onClick={() => onIndex((index! - 1 + images.length) % images.length)}
            />
            <ZoomNav
              side="right"
              onClick={() => onIndex((index! + 1) % images.length)}
            />
            <p className="absolute inset-x-0 bottom-5 text-center text-sm font-medium tabular-nums text-white/70">
              {index! + 1} / {images.length}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ZoomNav({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const glyph = side === "left" ? "back" : "forward";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Ảnh trước" : "Ảnh sau"}
      className={cn(
        R_CTRL,
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <Glyph name={glyph} className="size-5" />
    </button>
  );
}

function ArrowBtn({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const glyph = side === "left" ? "back" : "forward";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Ảnh trước" : "Ảnh tiếp theo"}
      className={cn(
        R_CTRL,
        "absolute top-1/2 hidden size-9 -translate-y-1/2 place-items-center bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Glyph name={glyph} className="size-4" />
    </button>
  );
}

function MediaSwitch({
  preview,
  label,
  count,
  fit,
  onClick,
}: {
  preview: { url: string; alt: string | null };
  label: string;
  count: number;
  fit: "cover" | "contain";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(R_CARD, "pointer-events-auto inline-flex items-center gap-2.5 bg-background/90 p-1.5 pr-3 text-left shadow-sm backdrop-blur transition-colors hover:bg-background")}
    >
      <span className={cn(R_BADGE, "relative size-10 shrink-0 overflow-hidden bg-muted")}>
        <Image
          src={preview.url}
          alt=""
          fill
          sizes="40px"
          className={fit === "contain" ? "object-contain p-0.5" : "object-cover"}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-tight">{label}</span>
        <span className="block text-[0.6875rem] leading-tight text-muted-foreground">
          {count} ảnh
        </span>
      </span>
      <Glyph name="forward" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function Row({
  glyph,
  label: name,
  children,
}: {
  glyph: GlyphName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Glyph
        name={glyph}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{name}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}

function IconAction({
  href,
  glyph,
  label: text,
  external = false,
}: {
  href: string;
  glyph: GlyphName;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      title={text}
      aria-label={text}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(R_CTRL, "grid size-11 shrink-0 place-items-center border border-border/70 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground")}
    >
      <Glyph name={glyph} className="size-[1.15rem]" />
    </a>
  );
}

function statusView(s: OpeningStatus): {
  label: string;
  detail: string | null;
  tone: string;
  dot: string;
} {
  switch (s.kind) {
    case "open":
      return {
        label: "Đang mở",
        detail: `đến ${formatMinutes(s.closesAt)}`,
        tone: "text-primary",
        dot: "bg-primary",
      };
    case "closingSoon":
      return {
        label: "Sắp đóng",
        detail: `đóng lúc ${formatMinutes(s.closesAt)}`,
        tone: "text-warm",
        dot: "bg-warm",
      };
    case "opensLater":
      return {
        label: "Đã đóng",
        detail: `mở lại lúc ${formatMinutes(s.opensAt)}`,
        tone: "text-muted-foreground",
        dot: "bg-muted-foreground/50",
      };
    case "closed":
      return {
        label: "Đã đóng cửa",
        detail: null,
        tone: "text-muted-foreground",
        dot: "bg-muted-foreground/50",
      };
  }
}

function StatusPill({ status }: { status: OpeningStatus }) {
  const s = statusView(status);
  const withDetail = status.kind === "closingSoon" || status.kind === "opensLater";
  return (
    <span
      className={cn(
        R_BADGE,
        "inline-flex items-center gap-1.5 bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
        s.tone,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} aria-hidden />
      {withDetail && s.detail ? `${s.label} · ${s.detail}` : s.label}
    </span>
  );
}
