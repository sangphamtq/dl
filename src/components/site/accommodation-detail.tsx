"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  ShieldAlert,
  ShieldCheck,
  MessageCircle,
  Link2,
  TriangleAlert,
  Wallet,
  ArrowRight,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { AddToTripButton } from "@/components/site/add-to-trip-button";
import { coverUrl } from "@/lib/place-image";
import { googleEmbedSrc } from "@/lib/map-url";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";

export type AccommodationDetailData = {
  id: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// Chi tiết Nơi lưu trú trong POPUP (trước là ngăn trượt bên phải) — cùng khuôn
// với popup Quán ăn để hai tab anh em nói cùng một ngôn ngữ: từ `lg` là hai
// cột, trái là ảnh chiếm trọn cột (carousel embla + dải ảnh nhỏ), phải là phần
// đọc cuộn riêng + thanh hành động ghim đáy; dưới `sm` popup dán đáy màn hình.
//
// Khác Quán ăn ở CHỖ NÀO ĐỨNG ĐẦU: quán ăn hỏi "còn mở không, đường tới đâu";
// chỗ ở hỏi **"tin được không, liên hệ ai, cọc thế nào"**. Nên thứ tự cột phải
// là: trạng thái xác minh → cảnh báo → chính sách cọc → mô tả, và nút chính ở
// thanh đáy là **nhắn Zalo** (kênh chốt phòng chính ở VN) chứ không phải chỉ đường.
//
// Cũng đã bỏ các màu cứng của bản cũ (`emerald-600`, `amber-500`): theme đã có
// `primary` xanh lá và `warm` cam, dùng token thì dark mode mới đúng.
// ═══════════════════════════════════════════════════════════════════════════
export function AccommodationDetail({
  data,
}: {
  data: AccommodationDetailData;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [shot, setShot] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

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
  const many = gallery.length > 1;

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

  const category = data.category
    ? label(ACCOMMODATION_CATEGORY_LABELS, data.category)
    : "Lưu trú";
  const hasMap = data.lat != null && data.lng != null;
  const directions = hasMap
    ? `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`
    : null;

  return (
    <div className="flex max-h-[inherit] flex-col lg:grid lg:h-[min(88vh,44rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── Nửa hình ảnh ── */}
      <div className="relative shrink-0 overflow-hidden bg-muted max-lg:aspect-[4/3] lg:h-full">
        <Carousel
          setApi={setApi}
          opts={{ startIndex: shot, loop: many, watchDrag: many }}
          className="absolute inset-0 [&>div]:h-full"
        >
          <CarouselContent className="ml-0 h-full">
            {gallery.map((im, i) => (
              <CarouselItem key={im.id} className="relative h-full pl-0">
                <Image
                  src={im.url}
                  alt={im.alt ?? data.name}
                  fill
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  className="object-cover"
                  priority={i === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55"
          aria-hidden
        />

        {/* Huy hiệu xác minh nằm TRÊN ẢNH: đây là thứ đầu tiên cần biết về một
            chỗ ở, không phải một dòng chữ đâu đó giữa cột chữ. */}
        <span
          className={cn(
            "absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
            data.isVerified
              ? "bg-primary text-primary-foreground"
              : "bg-background/90 text-muted-foreground backdrop-blur-sm",
          )}
        >
          {data.isVerified ? (
            <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
          )}
          {data.isVerified ? "Đã xác minh chính chủ" : "Chưa xác minh"}
        </span>

        {many && (
          <>
            <ArrowBtn side="left" onClick={() => api?.scrollPrev()} />
            <ArrowBtn side="right" onClick={() => api?.scrollNext()} />
            <span className="absolute right-4 top-4 rounded-full bg-background/85 px-2.5 py-1 text-xs font-semibold tabular-nums shadow-sm backdrop-blur">
              {shot + 1}/{gallery.length}
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
              {/* `-m-1 p-1`: chừa chỗ cho vòng ring của ảnh đang chọn, nếu không
                  `overflow-x-auto` cắt cụt viền phía trên. */}
              <div className="pointer-events-auto -m-1 flex gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {gallery.map((im, i) => (
                  <button
                    key={im.id}
                    type="button"
                    onClick={() => api?.scrollTo(i)}
                    aria-label={`Xem ảnh ${i + 1}`}
                    aria-current={i === shot}
                    className={cn(
                      "relative size-14 shrink-0 overflow-hidden rounded-xl ring-2 transition-all",
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
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Cột nội dung ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <p className="text-sm font-semibold text-primary">{category}</p>
          <DialogTitle className="mt-1 text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
            {data.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Thông tin chi tiết nơi lưu trú {data.name}
          </DialogDescription>

          {/* ── Khối NIỀM TIN: xác minh + cọc + cảnh báo, gom một chỗ ngay dưới
                 tên. Với một chỗ ở thì đây mới là thứ quyết định, không phải mô
                 tả phòng. ── */}
          <div className="mt-4 space-y-2.5">
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-2xl p-4 text-sm leading-relaxed",
                data.isVerified ? "bg-primary/[0.08]" : "bg-muted/60",
              )}
            >
              {data.isVerified ? (
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
              ) : (
                <ShieldAlert
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              <span>
                {data.isVerified ? (
                  <>
                    <span className="font-semibold">
                      Đã xác minh đây là chính chủ.
                    </span>{" "}
                    Chỉ liên hệ và chuyển khoản qua kênh hiển thị bên dưới —
                    tài khoản lạ gửi trong bình luận là dấu hiệu lừa đảo.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Chưa xác minh chính chủ.</span>{" "}
                    Thông tin để tham khảo — hãy tự kiểm tra kỹ trước khi đặt cọc.
                  </>
                )}
              </span>
            </div>

            {data.depositPolicy && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">
                <Wallet
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold">Cọc: </span>
                  {data.depositPolicy}
                </span>
              </div>
            )}

            {data.notice && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-warm/10 p-4 text-sm leading-relaxed">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-warm"
                  aria-hidden
                />
                <span>{data.notice}</span>
              </div>
            )}
          </div>

          {data.description && (
            <p className="mt-5 whitespace-pre-line leading-7 text-foreground/90">
              {data.description}
            </p>
          )}

          {(data.address || data.phone) && (
            <dl className="mt-6 divide-y divide-border/60 border-y border-border/60">
              {data.address && (
                <Row icon={MapPin} label="Địa chỉ">
                  <span className="block leading-snug">{data.address}</span>
                  {hasMap && (
                    <button
                      type="button"
                      onClick={() => setMapOpen((v) => !v)}
                      aria-expanded={mapOpen}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {mapOpen ? "Ẩn bản đồ" : "Xem trên bản đồ"}
                      <ChevronDown
                        className={cn(
                          "size-3 transition-transform",
                          mapOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                  )}
                </Row>
              )}
              {data.phone && (
                <Row icon={Phone} label="Điện thoại">
                  <a href={`tel:${data.phone}`} className="hover:underline">
                    {data.phone}
                  </a>
                </Row>
              )}
            </dl>
          )}

          {hasMap && mapOpen && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
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
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Lưu vào lịch trình — KHÔNG nhét vào thanh ghim đáy: ở đó "Nhắn
              Zalo chính chủ" là nút chính và cả mục Lưu trú tồn tại để dẫn
              khách tới đúng kênh chính chủ. */}
          <div className="mt-5">
            <AddToTripButton
              target={{ kind: "accommodation", id: data.id }}
              name={data.name}
              className="h-8 px-3 text-xs"
            />
          </div>

          {/* Đường sang trang chi tiết — ĐÍCH CHIA SẺ (chủ nhà dán link vào
              group FB). Popup chỉ là bản xem nhanh nên lối này phải rõ ràng. */}
          <Link
            href={`/luu-tru/${data.slug}`}
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-4 text-sm transition-colors hover:border-border hover:bg-muted/40"
          >
            <span>
              <span className="block font-semibold">Xem trang đầy đủ</span>
              <span className="block text-xs text-muted-foreground">
                Bản đồ, chỉ đường, mã QR chia sẻ
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
          </Link>
        </div>

        {/* ── Thanh liên hệ ghim đáy ──
               Zalo là nút CHÍNH: ở Việt Nam đó là kênh chốt phòng, và cả mục
               này tồn tại để dẫn khách tới đúng kênh chính chủ. Các kênh còn
               lại thu thành nút tròn để thanh luôn một hàng. */}
        {(data.zalo ||
          data.phone ||
          data.facebookUrl ||
          data.bookingUrl ||
          data.website ||
          directions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
            {data.zalo ? (
              <a
                href={zaloHref(data.zalo)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <MessageCircle className="size-4" aria-hidden />
                Nhắn Zalo chính chủ
              </a>
            ) : data.phone ? (
              <a
                href={`tel:${data.phone}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Phone className="size-4" aria-hidden />
                Gọi chính chủ
              </a>
            ) : null}
            {data.zalo && data.phone && (
              <IconAction href={`tel:${data.phone}`} icon={Phone} label="Gọi" />
            )}
            {data.facebookUrl && (
              <IconAction
                href={data.facebookUrl}
                icon={Link2}
                label="Facebook chính chủ"
                external
              />
            )}
            {data.bookingUrl && (
              <IconAction
                href={data.bookingUrl}
                icon={ExternalLink}
                label="Trang đặt phòng"
                external
              />
            )}
            {data.website && (
              <IconAction
                href={data.website}
                icon={Globe}
                label="Website"
                external
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Một dòng thông tin: icon · nhãn nhỏ · giá trị.
function Row({
  icon: Icon,
  label: name,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{name}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}

function IconAction({
  href,
  icon: Icon,
  label: text,
  external = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      title={text}
      aria-label={text}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Icon className="size-4" />
    </a>
  );
}

// Mũi tên chuyển ảnh đè lên ảnh (nút mặc định của `ui/carousel` neo ngoài khung).
function ArrowBtn({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Ảnh trước" : "Ảnh tiếp theo"}
      className={cn(
        // Ẩn dưới `sm`: ở đó vuốt là thao tác tự nhiên, mũi tên chỉ che ảnh.
        "absolute top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
