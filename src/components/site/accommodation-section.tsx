"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FilterChip } from "@/components/site/listing-filter";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  AccommodationDetail,
  type AccommodationDetailData,
} from "@/components/site/accommodation-detail";

type Stay = AccommodationDetailData;

function areaOf(address: string | null, placeName: string): string | null {
  if (!address) return null;
  const strip = (s: string) =>
    s
      .toLowerCase()
      .replace(/^(tp\.?|thành phố|thị xã|huyện|xã|phường)\s+/i, "")
      .trim();
  const place = strip(placeName);
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => strip(p) !== place);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function AccommodationSection({
  accommodations,
  placeName,
  openSlug,
}: {
  accommodations: Stay[];
  placeName: string;
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

  const active = selected ? bySlug.get(selected) : undefined;

  const catOptions = useMemo(() => {
    const present = new Set(accommodations.map((a) => a.category).filter(Boolean));
    return Object.keys(ACCOMMODATION_CATEGORY_LABELS).filter((c) =>
      present.has(c),
    );
  }, [accommodations]);

  const verifiedCount = accommodations.filter((a) => a.isVerified).length;
  const noticed = accommodations.filter((a) => a.notice).length;
  const composition = compositionLine(
    countByLabel(
      accommodations.map((a) =>
        label(ACCOMMODATION_CATEGORY_LABELS, a.category),
      ),
    ),
    accommodations.length,
  );

  const filtered = accommodations.filter(
    (a) => cat === "all" || a.category === cat,
  );
  const verified = filtered.filter((a) => a.isVerified);
  const unverified = filtered.filter((a) => !a.isVerified);

  return (
    <div>
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Chỗ ở đã xác minh chính chủ ở {placeName}
        </h2>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Stat glyph="check">
            <b className="font-semibold tabular-nums text-foreground">
              {verifiedCount}/{accommodations.length}
            </b>{" "}
            đã xác minh chính chủ
          </Stat>
          {composition && <Stat glyph="bed">{composition}</Stat>}
          {noticed > 0 && (
            <Stat glyph="warn">
              <b className="font-semibold text-foreground">{noticed}</b> nơi có
              lưu ý
            </Stat>
          )}
        </div>
      </header>

      {/* ── Dải an toàn: nói thẳng đây KHÔNG phải nơi đặt phòng, và quy tắc
             chuyển khoản. Đây là câu phải đọc trước khi cọc, không phải một
             đoạn giới thiệu — nên nó là một dải riêng, không trộn vào header. ── */}
      <div className={cn(R_CARD, "mt-6 flex items-start gap-3 bg-primary/[0.07] p-4 sm:p-5")}>
        <Glyph name="shield" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">
            Đây là danh bạ thông tin, không phải nơi đặt phòng.
          </p>
          <p className="mt-1 text-muted-foreground">
            Bạn tự chốt trực tiếp với chủ nhà qua kênh hiển thị tại đây. Chỉ
            chuyển khoản tới tài khoản do chính chủ cung cấp qua các kênh này —
            cảnh giác số tài khoản lạ trong phần bình luận.
          </p>
        </div>
      </div>

      {catOptions.length > 1 && (
        <div className="hide-scrollbar mt-6 flex items-center gap-2 overflow-x-auto">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            Tất cả
          </FilterChip>
          {catOptions.map((c) => (
            <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
              {label(ACCOMMODATION_CATEGORY_LABELS, c)}
            </FilterChip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            Không có chỗ ở nào thuộc loại hình này.
          </p>
          <button
            type="button"
            onClick={() => setCat("all")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả {accommodations.length} chỗ ở
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {verified.length > 0 && (
            <StayGroup
              tone="verified"
              title="Đã xác minh chính chủ"
              count={verified.length}
              note="Đã liên hệ và xác nhận đây đúng là chủ cơ sở; kênh liên hệ bên dưới là kênh thật."
              stays={verified}
              placeName={placeName}
              onOpen={setSelected}
            />
          )}
          {unverified.length > 0 && (
            <StayGroup
              tone="unverified"
              title="Chưa xác minh"
              count={unverified.length}
              note="Chưa liên hệ xác nhận được chính chủ. Thông tin để tham khảo — tự kiểm tra kỹ trước khi đặt cọc."
              stays={unverified}
              placeName={placeName}
              onOpen={setSelected}
            />
          )}
        </div>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full max-w-none gap-0 overflow-hidden border-0 p-0 shadow-2xl",
            "top-auto bottom-0 left-0 max-h-[92dvh] translate-x-0 translate-y-0 rounded-t-[6px]",
            "data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
            "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:max-w-[min(64rem,calc(100vw-3rem))] sm:rounded-b-[6px]",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0",
          )}
        >
          {active && (
            <>
              <AccommodationDetail data={active} />
              <DialogClose
                className={cn(R_CTRL, "absolute right-3 top-3 z-10 grid size-9 place-items-center bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background")}
                aria-label="Đóng"
              >
                <Glyph name="close" className="size-4" />
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
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

function StayGroup({
  tone,
  title,
  count,
  note,
  stays,
  placeName,
  onOpen,
}: {
  tone: "verified" | "unverified";
  title: string;
  count: number;
  note: string;
  stays: Stay[];
  placeName: string;
  onOpen: (slug: string) => void;
}) {
  const ok = tone === "verified";
  return (
    <section>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            R_CARD,
            "grid size-10 shrink-0 place-items-center",
            ok ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Glyph name={ok ? "check" : "warn"} className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
            <span className="ml-2 text-base font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {note}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stays.map((a) => (
          <StayCard
            key={a.slug}
            a={a}
            placeName={placeName}
            onOpen={() => onOpen(a.slug)}
          />
        ))}
      </div>
    </section>
  );
}

function StayCard({
  a,
  placeName,
  onOpen,
}: {
  a: Stay;
  placeName: string;
  onOpen: () => void;
}) {
  const area = areaOf(a.address, placeName);
  const category =
    (a.category ? label(ACCOMMODATION_CATEGORY_LABELS, a.category) : null) ??
    "Lưu trú";

  return (
    // Thẻ KHÔNG còn là một nút. Cả thẻ dẫn sang trang chi tiết `/luu-tru/[slug]`
    // bằng "stretched link": link thật nằm ở TÊN quán (nên trình đọc màn hình
    // đọc đúng "Sunny House Homestay" chứ không phải "link"), rồi `after:inset-0`
    // trải vùng bấm ra cả thẻ. Nút "Xem nhanh" đặt trên ẢNH, tách hẳn khỏi khối
    // chữ và nâng `z-10` để nằm trên vùng bấm đó — hai đích không giẫm nhau.
    <article className="group relative text-left">
      <div
        className={cn(R_CARD, "relative aspect-[3/2] overflow-hidden bg-muted")}
      >
        <Image
          src={coverUrl(a.images, a.slug)}
          alt={a.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            !a.isVerified && "saturate-[0.7]",
          )}
        />
        {a.isVerified ? (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 inline-flex items-center gap-1 bg-primary px-2.5 py-1 text-[0.6875rem] font-semibold text-primary-foreground shadow-sm",
            )}
          >
            <Glyph name="check" className="size-3.5 shrink-0" />
            Đã xác minh
          </span>
        ) : (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 inline-flex items-center gap-1 bg-background/90 px-2.5 py-1 text-[0.6875rem] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm",
            )}
          >
            <Glyph name="warn" className="size-3.5 shrink-0" />
            Chưa xác minh
          </span>
        )}

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Xem nhanh ${a.name}`}
          className="absolute inset-0 z-10 hidden place-items-center bg-black/30 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:fine)]:grid"
        >
          <span className={cn(R_CTRL, "bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-lg")}>
            Xem nhanh
          </span>
        </button>

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Xem nhanh ${a.name}`}
          className={cn(R_BADGE, "absolute bottom-3 right-3 z-10 bg-black/55 px-3 py-1.5 text-[0.6875rem] font-semibold text-white backdrop-blur-md [@media(pointer:fine)]:hidden")}
        >
          Xem nhanh
        </button>
      </div>

      <p className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">{category}</span>
        {area && (
          <span className="inline-flex items-center gap-1">
            <Glyph name="pin" className="size-3.5 shrink-0" />
            {area}
          </span>
        )}
      </p>

      <h4 className="mt-1 flex items-start justify-between gap-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight">
        <Link
          href={`/luu-tru/${a.slug}`}
          className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline"
        >
          {a.name}
        </Link>
        <Glyph
          name="forward"
          className="mt-1 size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
        />
      </h4>

      {a.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {a.description}
        </p>
      )}
    </article>
  );
}

