"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/site/section-heading";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export type ExperienceItem = {
  slug: string;
  name: string;
  category: string | null;
  image: string;
  // "Bao lâu · mùa nào · bao nhiêu tiền" — dựng sẵn ở server, tối đa 2 mục.
  facts: string[];
};

// Cùng khuôn chữ "micro" với hero và dải Địa điểm: chữ hoa giãn ký tự. Ba mục
// liền nhau trên trang dùng chung một ngôn ngữ chữ, chỉ khác bố cục.
const MICRO = "text-[0.68rem] font-medium uppercase tracking-[0.16em]";

const num = (i: number) => String(i + 1).padStart(2, "0");

// Nhịp khổ ảnh. Chiều cao cả băng là CỐ ĐỊNH, nên tỉ lệ khung quyết định luôn
// bề ngang từng tấm: dọc → vuông → rất hẹp → hơi dọc, lặp lại. Không phải trang
// trí — một hàng ảnh cùng khổ kéo dài đọc ra là bảng liên hệ (contact sheet),
// khổ đổi liên tục mới ra cuộn phim.
// Lề hai đầu băng, bằng đúng lề của cột nội dung (xem chỗ dùng).
const GUTTER =
  "basis-[calc((100vw-min(100vw,90rem))/2+1rem)] sm:basis-[calc((100vw-min(100vw,90rem))/2+1.5rem)]";

const SHAPES = [
  "aspect-[3/4]",
  "aspect-[1/1]",
  "aspect-[9/16]",
  "aspect-[4/5]",
  "aspect-[5/4]",
  "aspect-[2/3]",
];

// Section "Trải nghiệm nổi bật" — BĂNG ẢNH PANORAMA: một dải ảnh cao dính liền
// nhau (khe 1px nền trang), tràn hai mép màn hình, kéo/vuốt như cuộn phim.
// Rê vào một tấm thì cả băng tối đi, riêng tấm đó sáng rõ.
//
// Vì sao không lặp kiểu dải "Địa điểm đáng ghé" ngay phía trên (một ảnh lớn
// đóng khung + cột danh sách + tự đổi mục):
//  - dải trên cho xem MỘT chỗ mỗi lúc, đọc kỹ từng chỗ; băng này cho lướt qua
//    cả loạt — đúng việc người ta làm với trải nghiệm: liếc xem có gì đáng
//    làm rồi mới bấm vào một cái;
//  - dải trên tự chạy 7 giây/mục, băng này KHÔNG có gì tự động;
//  - dải trên tách hai tông (ảnh trái / nền phải) và ảnh nằm trong khung có
//    mat; băng này bỏ hết khung, bỏ cả bo góc — ảnh dính nhau thành một dải
//    liền, hai đầu bị mép màn hình cắt.
// MỘT cách trình bày cho mọi cỡ màn: điện thoại chỉ đổi chiều cao băng, không
// phải một bố cục thứ hai.
export function ExperienceStrip({
  title,
  eyebrow,
  href,
  count,
  unit,
  items,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  count?: number;
  unit?: string;
  items: ExperienceItem[];
}) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [nav, setNav] = useState({ prev: false, next: false });

  // Trạng thái bật/tắt của nút ‹ › — chúng nằm ở hàng tiêu đề, tức NGOÀI
  // <Carousel>, nên không dùng được context của nó.
  useEffect(() => {
    if (!api) return;
    const update = () =>
      setNav({ prev: api.canScrollPrev(), next: api.canScrollNext() });
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  if (items.length === 0) return null;

  return (
    // Chỉ đệm PHÍA TRÊN: mục kế tiếp nằm trong container của trang và tự có
    // đệm trên của nó rồi — thêm đệm dưới ở đây là cộng dồn thành một quãng
    // trống gấp đôi mọi chỗ khác.
    <div className="pt-14 sm:pt-20">
      {/* Tiêu đề vẫn nằm trong lưới của trang; chỉ băng ảnh mới tràn viền. */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          href={href}
          count={count}
          unit={unit}
          actions={
            (nav.prev || nav.next) && (
              <span className="hidden items-center gap-2 sm:flex">
                <NavButton
                  label="Trải nghiệm trước"
                  disabled={!nav.prev}
                  onClick={() => api?.scrollPrev()}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </NavButton>
                <NavButton
                  label="Trải nghiệm tiếp theo"
                  disabled={!nav.next}
                  onClick={() => api?.scrollNext()}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </NavButton>
              </span>
            )
          }
        />
      </div>

      {/* `dragFree`: cuộn trôi tự do, KHÔNG snap từng tấm — snap sẽ cắt băng
          thành từng thẻ rời, mất đúng cái cảm giác một dải liền đang trôi qua.
          Băng bắt đầu bằng một khoảng lề bằng lề trang (tấm đầu thẳng hàng với
          tiêu đề) rồi chạy thẳng ra khỏi mép phải màn hình. */}
      <div className="group/strip mt-8">
        <Carousel
          opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
          plugins={[WheelGesturesPlugin()]}
          setApi={setApi}
        >
          <CarouselContent className="-ml-px h-[22rem] sm:h-[27rem] lg:h-[34rem]">
            {/* Lề mở đầu: một ô rỗng rộng đúng bằng khoảng cách từ mép màn
                hình tới cột nội dung — `(100vw − bề ngang container)/2 + lề
                trang` — để tấm ảnh đầu thẳng hàng với tiêu đề phía trên ở MỌI
                cỡ màn (container của trang là `max-w-7xl`, đã nới thành 90rem
                trong globals.css). Kéo đi là ô này cuộn mất, băng dính luôn
                vào mép trái — đúng kiểu cuộn phim.
                Ô tương tự ở cuối để tấm chót không dán vào mép phải. */}
            <CarouselItem aria-hidden className={cn(GUTTER, "pl-px")} />
            {items.map((it, i) => (
              <CarouselItem key={it.slug} className="basis-auto pl-px">
                <Frame item={it} i={i} />
              </CarouselItem>
            ))}
            <CarouselItem aria-hidden className={cn(GUTTER, "pl-px")} />
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}

// Một khuôn hình trong băng. Không bo góc, không viền: hai tấm cạnh nhau chỉ
// cách nhau đúng 1px nền trang.
function Frame({ item, i }: { item: ExperienceItem; i: number }) {
  return (
    <Link
      href={`/hoat-dong/${item.slug}`}
      className={cn(
        "group/frame relative block h-full overflow-hidden bg-muted",
        SHAPES[i % SHAPES.length],
        // Rê vào MỘT tấm thì cả băng tối đi, riêng tấm đang rê sáng nguyên.
        // Làm bằng CSS thuần (group lồng nhau), không cần state: con trỏ ở đâu
        // là sự chú ý ở đó, không có độ trễ của một vòng render.
        "transition-[filter,opacity] duration-500 ease-out",
        "group-hover/strip:opacity-45 hover:!opacity-100",
        "motion-reduce:transition-none",
      )}
    >
      <Image
        src={item.image}
        alt=""
        fill
        sizes="(min-width: 1024px) 30vw, 60vw"
        className="object-cover"
      />
      {/* Lớp phủ đỡ chữ: đậm ở đáy, tan hết ở lưng chừng — nửa trên của ảnh
          không bị đụng tới. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      <span
        aria-hidden
        className="absolute left-5 top-5 font-[family-name:var(--font-display)] text-lg font-extrabold tabular-nums leading-none text-white/70"
      >
        {num(i)}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
        {item.category && (
          <p className={cn(MICRO, "text-warm-bright")}>{item.category}</p>
        )}
        {/* Cỡ chữ vừa phải chứ không "to như hero": khổ hẹp nhất của băng chỉ
            rộng ~12rem, tên cỡ hero ở đó sẽ vỡ thành năm sáu dòng. */}
        <h3 className="mt-1.5 text-balance font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] lg:text-2xl">
          {item.name}
        </h3>
        {item.facts.length > 0 && (
          <p className={cn(MICRO, "mt-2.5 text-white/80")}>
            {item.facts.join(" · ")}
          </p>
        )}
        {/* Dòng "Khám phá" chỉ hiện khi rê vào đúng tấm đó — băng đứng yên thì
            sáu dòng chữ giống hệt nhau lặp lại chỉ làm rối. */}
        <span
          aria-hidden
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white opacity-0 transition-opacity duration-300 group-hover/frame:opacity-100"
        >
          Khám phá
          <ArrowUpRight className="size-4 shrink-0" />
        </span>
      </div>
    </Link>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
