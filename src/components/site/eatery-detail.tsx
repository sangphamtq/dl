"use client";

import { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Sunrise,
  Navigation,
  Maximize,
  X,
} from "@/components/icons";
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
  // Ảnh chụp tấm thực đơn / bảng giá. Rỗng ở phần lớn quán — tab Thực đơn chỉ
  // hiện khi có ảnh, không bao giờ mời vào một tab trống.
  menuImages: { id: string; url: string; alt: string | null }[];
};

// ═══════════════════════════════════════════════════════════════════════════
// Chi tiết Quán ăn trong POPUP (trước là ngăn trượt bên phải).
//
// Popup rộng nên bố cục là HAI CỘT từ `lg`: trái là một tấm ảnh CHIẾM TRỌN cột
// (dải ảnh nhỏ nổi ở đáy để đổi ảnh), phải là phần đọc và cuộn riêng. Ngăn
// trượt cũ rộng ~28rem nên ảnh phải nằm trong một dải cuộn ngang tí hon và mọi
// thứ xếp thành một cột dài — với một trang lấy ảnh làm chủ thì đó là phần
// thiệt thòi nhất.
//
// Dưới `lg` popup dán đáy màn hình, ảnh 4/3 lên đầu, nội dung cuộn bên dưới —
// đúng thói quen cầm điện thoại một tay.
//
// Thanh hành động GHIM ở đáy cột phải: mở popup xong, việc kế tiếp luôn là
// "đường tới đó thế nào" — không nên bắt cuộn hết mô tả mới thấy nút.
// ═══════════════════════════════════════════════════════════════════════════
export function EateryDetail({
  data,
  status,
  initialTab = "anh",
}: {
  data: EateryDetailData;
  status?: OpeningStatus | null;
  // Mở thẳng vào tab nào — thẻ ngoài lưới truyền "menu" khi người dùng bấm
  // đúng lúc đang rê chuột xem thực đơn.
  initialTab?: "anh" | "menu";
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [shot, setShot] = useState(0);
  // Không đọc qua biến `menu` bên dưới: nó khai báo sau, dùng ở đây là chạm
  // vùng chết của `const`. Và chốt về "anh" khi quán không có ảnh thực đơn —
  // deep-link cũ hay dữ liệu lệch không được đẩy vào một tab rỗng.
  const [tab, setTab] = useState<"anh" | "menu">(
    data.menuImages.length > 0 ? initialTab : "anh",
  );
  // Ảnh menu đang phóng to (null = không mở). Chụp bảng giá thì chữ rất nhỏ,
  // xem ở cỡ thumbnail là vô dụng — bắt buộc phải phóng được.
  const [zoom, setZoom] = useState<number | null>(null);
  // Carousel ảnh chính (embla, qua component `ui/carousel` của dự án) — vuốt
  // được trên điện thoại, còn dải ảnh nhỏ chỉ là bộ điều khiển đồng bộ với nó.
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
  // Hai tab dùng CHUNG một carousel, chỉ khác danh sách slide và cách vừa khung.
  const isMenu = tab === "menu";
  const slides = isMenu ? menu : gallery;
  const many = slides.length > 1;
  // Đổi tab thì về ảnh đầu — `key={tab}` khiến embla khởi tạo lại, `shot` cũ
  // của tab kia sẽ trỏ ra ngoài danh sách mới.
  const changeTab = (t: "anh" | "menu") => {
    setTab(t);
    setShot(0);
  };

  // Carousel → dải ảnh nhỏ. Không gọi thẳng lúc gắn: `startIndex` đã đặt đúng
  // slide nên `shot` vốn đã khớp; gọi thêm chỉ tạo một lần render thừa.
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

  // Địa chỉ đầy đủ: chi tiết → xã/phường → tỉnh, bỏ phần đã lặp (address seed
  // thường chứa sẵn tên phường/thành phố).
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

  // Địa chỉ trong bảng chỉ lấy phần ĐƯỜNG/mốc — phường & thành phố đã nằm ngay
  // dưới tên quán, in lại lần nữa là đọc hai lần cùng một chỗ.
  const street = data.address?.trim() || fullAddress;

  // Từ `lg` khoá chiều cao cả popup: ảnh mới phủ kín được cột trái. Để cao tự
  // do thì hàng lưới lấy chiều cao của cột chữ, ảnh hụt lại và hở một mảng
  // trắng dưới đáy.
  return (
    <div className="flex max-h-[inherit] flex-col lg:grid lg:h-[min(88vh,44rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── Nửa hình ảnh: Ảnh quán ↔ Thực đơn ──
             Thực đơn cũng là ảnh nên nó thuộc về nửa này. Nhét vào cột chữ thì
             ảnh menu bé bằng nửa và đẩy nút "Chỉ đường" ra xa. */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden max-lg:aspect-[4/3] lg:h-full",
          // Nền tối cho tab Thực đơn: tấm menu thường là giấy sáng, nền tối làm
          // nó nổi lên như một tài liệu đặt trên bàn, không lẫn vào khung popup.
          isMenu ? "bg-foreground/90" : "bg-muted",
        )}
      >
        {/* MỘT carousel cho CẢ HAI tab. Ảnh quán và ảnh thực đơn đều là ảnh,
            nên chúng dùng chung bộ điều khiển (vuốt · mũi tên · đếm · dải ảnh
            nhỏ) — người dùng học một lần. Chỉ khác cách vừa khung:
            `cover` cho ảnh quán, `contain` cho tấm menu (cắt là mất giá).
            `key={tab}` để embla khởi tạo lại đúng danh sách slide. */}
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
                      // Chừa đúng chiều cao overlay đáy để tấm menu không bị
                      // thẻ chuyển / dải ảnh nhỏ đè lên: 16 + 52 (thẻ) +
                      // 10 (gap) + 56 (thumb) + 16 = 150px; không có dải ảnh
                      // thì 16 + 52 + 16 = 84px.
                      many ? "pb-[9.5rem]" : "pb-[5.5rem]",
                    )}
                  >
                    {/* Ảnh thực đơn giữ NGUYÊN tỉ lệ gốc: dọc hay ngang đều
                        không bị cắt, và luôn to hết mức khung cho phép. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={im.url}
                      alt={im.alt ?? `Thực đơn ${data.name}`}
                      draggable={false}
                      className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-transform duration-200 group-hover:scale-[1.01]"
                    />
                    {/* Gợi ý đặt GÓC TRÊN TRÁI — ở tab Thực đơn chỗ đó trống
                        (không có huy hiệu trạng thái/hướng nhìn). Để ở đáy thì
                        trên điện thoại nó đụng ngay cụm tab. */}
                    <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                      <Maximize className="size-3.5" aria-hidden />
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

        {/* Scrim chỉ ở hai đầu: giữ ảnh sáng, nhưng huy hiệu và dải ảnh nhỏ vẫn
            đọc được. Tab Thực đơn đã có nền tối nên không cần. */}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
                <Eye className="size-3 shrink-0 text-primary" aria-hidden />
                Nhìn ra {viewLabel.toLowerCase()}
              </span>
            )}
          </div>
        )}

        {/* Mũi tên đặt ĐÈ LÊN ảnh: nút mặc định của `ui/carousel` neo ở ngoài
            khung (-left-12) nên trong popup nó rơi ra ngoài mép. */}
        {many && (
          <>
            <ArrowBtn side="left" onClick={() => api?.scrollPrev()} />
            <ArrowBtn side="right" onClick={() => api?.scrollNext()} />
          </>
        )}

        {/* Chip trạng thái: ĐANG XEM BỘ NÀO + vị trí trong bộ đó. Gộp hai con
            số từng nằm hai nơi (số trên nhãn tab và bộ đếm carousel) về một
            chỗ. Ở tab Thực đơn thì chip luôn hiện dù chỉ có một ảnh — không có
            nó thì mất hẳn dấu hiệu "bạn đang xem thực đơn". */}
        {(isMenu || many) && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
            {isMenu && (
              <>
                <UtensilsCrossed className="size-3 shrink-0" aria-hidden />
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

        {/* Overlay đáy XẾP CHỒNG: cụm tab một dòng, dải ảnh nhỏ một dòng riêng
            chiếm HẾT bề ngang. Trước đây hai khối chia nhau một hàng ngang nên
            dải ảnh bị bóp lại và ảnh cuối bị cắt cụt. */}
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
            // `-m-1 p-1`: chừa chỗ cho vòng `ring` của ảnh đang chọn. Không có
            // nó thì `overflow-x-auto` cắt cụt viền phía trên, mà vị trí khối
            // vẫn y nguyên nhờ margin âm bù lại.
            <div className="pointer-events-auto -m-1 flex gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {slides.map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-current={i === shot}
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-xl ring-2 transition-all",
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

      {/* ── Nội dung: cuộn riêng ở cột phải ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {data.category && (
            <p className="text-sm font-semibold text-warm">
              {label(EATERY_CATEGORY_LABELS, data.category)}
            </p>
          )}
          <DialogTitle className="mt-1 text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
            {data.name}
          </DialogTitle>
          {area && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden />
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

          {/* ── TIN THỰC ĐỊA: thứ quyết định "đi hay không", đặt NGAY dưới tên ──
                 Bản cũ chôn giờ mở cửa xuống hàng đầu của một bảng ở tận đáy
                 cột, sau cả đoạn mô tả — trong khi cả màn hình Ẩm thực được
                 dựng quanh đúng câu hỏi "giờ này còn mở không". */}
          {(data.openingHours || sv || data.bestTime) && (
            <div className="mt-4 space-y-2 rounded-2xl bg-muted/50 p-4">
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
                  <Clock className="size-4 shrink-0" aria-hidden />
                  <span className="tabular-nums">{data.openingHours}</span>
                </p>
              )}
              {data.bestTime && (
                <p className="flex items-start gap-2 text-sm font-medium text-primary">
                  <Sunrise className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="leading-snug">
                    Đẹp nhất: {data.bestTime}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Cảnh báo: nền cam nhạt, KHÔNG viền — cột này đã nhiều khung rồi */}
          {data.notice && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-warm/10 px-4 py-3 text-sm">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-warm"
                aria-hidden
              />
              <span className="leading-relaxed">{data.notice}</span>
            </div>
          )}

          {data.description && (
            <p className="mt-5 whitespace-pre-line leading-7 text-foreground/90">
              {data.description}
            </p>
          )}

          {/* Dẫn sang tab Thực đơn: nút chuyển nằm ở nửa ảnh nên người đang đọc
              cột này dễ không để ý là quán có ảnh thực đơn. Đang ở tab đó rồi
              thì ẩn — không mời đi tới nơi mình đang đứng. */}
          {menu.length > 0 && !isMenu && (
            <button
              type="button"
              onClick={() => changeTab("menu")}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-border hover:bg-muted/40"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
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
              <ChevronDown className="size-4 -rotate-90 text-muted-foreground" aria-hidden />
            </button>
          )}

          {/* ── Thông tin còn lại: hàng gạch chân, KHÔNG bọc thẻ ──
                 Giờ mở cửa đã lên khối trên; ở đây chỉ còn thứ chưa nói ở đâu.
                 Bỏ viền ngoài để cột bớt "hộp chồng hộp". */}
          {(street || mealLabels.length > 0 || viewLabel || data.phone) && (
            <dl className="mt-6 divide-y divide-border/60 border-y border-border/60">
              {street && (
                <Row icon={MapPin} label="Địa chỉ">
                  {/* `block`: để inline thì nút bản đồ dính liền vào cuối địa
                      chỉ, không có lấy một khoảng trắng ngăn cách. */}
                  <span className="block leading-snug">{street}</span>
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
              {mealLabels.length > 0 && (
                <Row icon={UtensilsCrossed} label="Hợp bữa">
                  <span className="mt-0.5 flex flex-wrap gap-1.5">
                    {mealLabels.map((m) => (
                      <span
                        key={m}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </span>
                </Row>
              )}
              {viewLabel && (
                <Row icon={Eye} label="Nhìn ra">
                  {viewLabel}
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
        </div>

        {/* ── Hành động, ghim đáy. Chỉ đường là nút CHÍNH: đây là trang thông
               tin, không phải nơi đặt bàn — việc kế tiếp gần như luôn là tới đó. ── */}
        {(directions || data.phone || data.bookingUrl || data.website) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Navigation className="size-4" aria-hidden />
                Chỉ đường
              </a>
            )}
            {data.phone && (
              <IconAction href={`tel:${data.phone}`} icon={Phone} label="Gọi quán" />
            )}
            {data.bookingUrl && (
              <a
                href={data.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-warm px-4 py-2.5 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
              >
                <ExternalLink className="size-4" aria-hidden /> Đặt bàn
              </a>
            )}
            {data.website && (
              <IconAction href={data.website} icon={Globe} label="Website" external />
            )}
          </div>
        )}
      </div>

      {/* Xem phóng to ảnh thực đơn. Dùng Dialog LỒNG chứ không phải một lớp phủ
          tự chế: Radix xếp lớp, nên Esc đóng đúng lớp trên cùng (ảnh) rồi mới
          tới popup quán — lớp phủ tự chế sẽ đóng tuột cả hai. */}
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

// Lớp xem ảnh thực đơn phóng to: nền tối, ảnh `object-contain` nguyên khổ,
// chuyển trang bằng nút hoặc phím ← →.
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
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          <X className="size-5" aria-hidden />
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
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Ảnh trước" : "Ảnh sau"}
      className={cn(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

// Mũi tên chuyển ảnh, đặt đè lên ảnh (khác nút mặc định của `ui/carousel` vốn
// neo ra ngoài khung). Cùng vật liệu với các huy hiệu trên ảnh cho đồng bộ.
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
        // Ẩn dưới `sm`: ở đó vuốt là thao tác tự nhiên (embla đã bật `watchDrag`)
        // và dải ảnh nhỏ ngay bên dưới — mũi tên chỉ tổ che mất ảnh.
        "absolute top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

// Chuyển giữa hai bộ ảnh (ảnh quán ↔ thực đơn).
//
// MỘT nút chỉ ra NƠI SẼ TỚI, không phải hai nút đánh dấu nơi đang đứng — trạng
// thái hiện tại đã do chip góc trên phải nói. Bản cũ là segmented hai nút, sai
// ẩn dụ (segmented là để lọc/sắp xếp CÙNG một tập, đây là hai tập khác hẳn) và
// mời gọi bằng một chữ, trong khi thứ đằng sau nó là ẢNH.
//
// Ảnh xem trước chính là mồi: thấy tấm menu rồi mới có lý do bấm.
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
      className="pointer-events-auto inline-flex items-center gap-2.5 rounded-2xl bg-background/90 p-1.5 pr-3 text-left shadow-sm backdrop-blur transition-colors hover:bg-background"
    >
      <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-muted">
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
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
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

// Nút phụ chỉ-icon: giữ thanh hành động một hàng để nút Chỉ đường không bị đẩy
// xuống, kể cả khi quán có đủ cả điện thoại lẫn website.
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

// Huy hiệu trạng thái mở cửa — cùng quy ước màu với thẻ ngoài lưới.
// Diễn giải trạng thái mở cửa — dùng chung cho huy hiệu trên ảnh và dòng trạng
// thái ở cột phải. `label` là từ ngắn cho huy hiệu, `detail` là vế thêm giờ cụ
// thể cho chỗ có đủ bề ngang.
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
  // Huy hiệu trên ảnh chật chỗ: chỉ kèm giờ khi giờ đó là tin gấp (sắp đóng /
  // mở lại lúc mấy giờ), còn "Đang mở" thì không cần nhắc giờ đóng.
  const withDetail = status.kind === "closingSoon" || status.kind === "opensLater";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
        s.tone,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} aria-hidden />
      {withDetail && s.detail ? `${s.label} · ${s.detail}` : s.label}
    </span>
  );
}
