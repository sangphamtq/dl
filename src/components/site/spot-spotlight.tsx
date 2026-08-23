"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "@/components/icons";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export type SpotSpotlightItem = {
  slug: string;
  name: string;
  category: string | null;
  location: string | null;
  image: string;
  tagline: string | null;
  description: string | null;
  // Fact dựng sẵn ở server (giờ mở cửa) — `icon` là TÊN icon để props còn
  // serialize được qua ranh giới server → client.
  facts: { icon: string; text: string }[];
  tags: string[];
  highlights: string[];
  visits: number;
};

// Cùng khuôn chữ "micro" với hero (nhãn dải số liệu): section này mượn chất liệu
// của hero — chữ hoa giãn ký tự, đường 1px, chữ trắng theo nấc độ mờ — nên hai
// khối đọc ra là cùng một ngôn ngữ, chỉ khác nhiệm vụ.
const MICRO = "text-[0.68rem] font-medium uppercase tracking-[0.16em]";

const num = (i: number) => String(i + 1).padStart(2, "0");

const INTERVAL = 7000;

// Một mục trong danh sách chọn. Tách riêng vì nó được dùng ở HAI chỗ: cột dọc
// (từ lg) và carousel Embla (dưới lg) — một chỗ sửa, hai nơi khớp.
function SpotRow({
  s,
  i,
  on,
  playing,
  onSelect,
  panelId,
}: {
  s: SpotSpotlightItem;
  i: number;
  on: boolean;
  playing: boolean;
  onSelect: () => void;
  panelId: string;
}) {
  return (
    // Hàng có HAI việc: bấm vào đâu cũng CHỌN để xem ảnh lớn, riêng cái TÊN là
    // link thật sang trang địa điểm. Trước đây cả hàng chỉ là nút chọn nên muốn
    // sang trang phải chọn rồi mới bấm được link trong khung ảnh — hai bước cho
    // một việc, và không mở được tab mới.
    //
    // Không được đặt <a> trong <button>, nên nút chọn là một lớp PHỦ toàn hàng
    // nằm dưới nội dung; nội dung để `pointer-events-none` cho chuột xuyên
    // xuống nút, riêng cái tên bật lại `pointer-events-auto` để nó tự nhận cú
    // bấm của mình.
    <div
      className={cn(
        "group relative flex items-center rounded-xl transition-colors",
        on ? "bg-muted" : "hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={on ? "true" : undefined}
        aria-controls={panelId}
        // Lớp phủ không có chữ bên trong → phải tự đặt tên cho trình đọc màn hình.
        aria-label={`Xem ảnh ${s.name}`}
        // Vòng focus TƯỜNG MINH. Đây là nút phủ trong suốt phủ kín cả dòng, và
        // là widget phức tạp nhất trang — nhưng nó là control DUY NHẤT ở đây
        // không tự vẽ vòng focus, nên người dùng bàn phím chỉ được vòng mặc định
        // của trình duyệt trong khi mọi nút khác quanh nó đều có ring riêng.
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {/* Hover và active nằm trên CÙNG MỘT THANG: nền hàng. Rỗng → chạm vào →
          đang xem, mỗi bậc đậm hơn bậc trước. Trước đây hover có nền mà active
          lại không, nên hàng đang rê chuột trông "được chọn" hơn cả hàng đang
          thực sự phát — hai tín hiệu đá nhau.
          Riêng active có thêm hai thứ mà hover không có, và cả hai đều mang
          thông tin chứ không phải trang trí: số thứ tự chuyển cam, và thanh tiến
          trình cho biết còn bao lâu. */}
      <span
        className={cn(
          "pointer-events-none relative flex min-w-0 flex-1 items-center gap-3 p-2 text-left",
          "lg:gap-4 lg:px-2 lg:py-2.5",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "hidden w-7 shrink-0 self-start pt-0.5 font-[family-name:var(--font-display)] text-xl font-bold tabular-nums leading-none tracking-tight transition-colors lg:block",
            on ? "text-warm-ink" : "text-muted-foreground",
          )}
        >
          {num(i)}
        </span>

        <span
          className={cn(
            "relative h-[4.75rem] w-24 shrink-0 overflow-hidden rounded-lg bg-muted transition-opacity lg:h-[5.5rem] lg:w-32",
            on ? "opacity-100" : "opacity-90",
          )}
        >
          <Image
            src={s.image}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        </span>

        <span className="min-w-0 flex-1">
          {/* Cái TÊN là link — đích duy nhất trong hàng dẫn sang trang địa điểm.
              `pointer-events-auto` để nó nhận cú bấm của mình thay vì để lọt
              xuống lớp phủ chọn ảnh bên dưới. */}
          <Link
            href={`/dia-diem/${s.slug}`}
            // Font display (Be Vietnam Pro) như tên thẻ ở Lưu trú/Ẩm thực — tên
            // riêng của một nơi thì ở đâu cũng phải cùng một bộ chữ.
            // `font-semibold` (600) — cùng bậc với tên thẻ ở Lưu trú/Ẩm thực.
            // Bộ nạp tĩnh 600/700/800 (xem layout.tsx) nên 600 là nét THẬT, không
            // phải trình duyệt bóp chữ; đừng dùng `font-normal`/`font-medium` với
            // họ này vì hai bậc đó không có trong bộ.
            className={cn(
              "pointer-events-auto block truncate font-[family-name:var(--font-display)] font-semibold tracking-tight underline-offset-4 transition-colors hover:text-primary hover:underline lg:text-lg",
              on ? "text-foreground" : "text-foreground/90",
            )}
          >
            {s.name}
          </Link>
          {/* Tagline: câu chốt của biên tập, đứng ngay dưới tên vì nó là thứ
              khiến người ta muốn bấm vào. Chỉ MỘT dòng — hàng trong danh sách chia
              đều chiều cao cột, cho nó xuống hai dòng là sáu hàng vỡ nhịp. */}
          {s.tagline && (
            <span className="mt-1 block truncate text-sm text-foreground/70">
              {s.tagline}
            </span>
          )}
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {[s.location, s.facts[0]?.text].filter(Boolean).join(" · ")}
          </span>

          {/* Rãnh của thanh tiến trình LUÔN được render, kể cả ở mục chưa chọn
              (lúc đó trong suốt). Chỉ render khi `on` thì mục vừa được chọn tự cao
              thêm ~10px, cả cột xô lên xuống mỗi 7 giây. */}
          <span
            aria-hidden
            className={cn(
              "mt-2 block h-0.5 w-full max-w-[9rem] overflow-hidden rounded-full transition-colors",
              on ? "bg-border" : "bg-transparent",
            )}
          >
            {on && (
              <span
                key={`${s.slug}-run`}
                className="spot-progress block h-full w-full bg-warm"
                style={{
                  animationDuration: `${INTERVAL}ms`,
                  animationPlayState: playing ? "running" : "paused",
                }}
              />
            )}
          </span>
        </span>
      </span>
    </div>
  );
}

// Khối chữ của MỘT địa điểm trong dải. Tách riêng vì mọi khối đều được render
// (xếp chồng trong cùng một ô lưới) chứ không chỉ khối đang xem — xem chú thích
// ở chỗ gọi.
function SpotPanel({
  s,
  on,
  /** `false` khi mỗi khối nằm trong MỘT thẻ riêng của carousel (mobile): lúc đó
   *  không cần xếp chồng, không cần ẩn/hiện — thẻ nào hiện thì chữ của thẻ đó
   *  hiện theo. */
  stacked = true,
}: {
  s: SpotSpotlightItem;
  on: boolean;
  stacked?: boolean;
}) {
  return (
    <div
      inert={stacked && !on}
      aria-hidden={stacked && !on}
      className={cn(
        stacked &&
          "col-start-1 row-start-1 transition-all duration-500 ease-out motion-reduce:transition-none",
        stacked &&
          (on
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"),
      )}
    >
      {/* Khối chữ neo ở ĐÁY ảnh, không canh giữa. Hai lý do:
            · lớp phủ đậm nhất ở góc trái–dưới, đặt chữ đúng vào đó thì đọc rõ
              nhất mà không phải đổ tối thêm chỗ nào;
            · chữ ở đáy đọc ra là CHÚ THÍCH của bức ảnh — nó thuộc về bức ảnh,
              thay vì một khối chữ ngẫu nhiên đặt đè lên.
          Bậc chữ: nhãn nhỏ → tên rất lớn → câu chốt → (vạch) → mô tả → nút.
          Vạch ngắn tách phần "giới thiệu" khỏi phần "đọc thêm", nên khối không
          thành một đống chữ dài liền mạch. */}
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-warm-bright [text-shadow:0_1px_8px_rgba(0,0,0,0.75)]">
        {s.category ?? "Địa điểm"}
      </p>

      {/* Tên: font display như hero, canh trái, nhỏ hơn hero một bậc.
          leading 1.16 — hero để 0.88 được vì gần như luôn một dòng; tên địa
          điểm hay xuống 2 dòng, siết chặt thì dấu của dòng dưới chạm chân chữ
          dòng trên. Tiếng Việt cần chỗ cho cả dấu thanh lẫn dấu mũ. */}
      <h3 className="mt-2.5 max-w-lg text-balance font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.16] tracking-[-0.03em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]">
        {/* Kẹp 2 dòng: tên dài mà thả tự do thì khối chữ dâng lên, đẩy nút
            "Khám phá" xuống quá đáy khung ảnh và bị cắt. */}
        <Link
          href={`/dia-diem/${s.slug}`}
          className="line-clamp-2 transition-opacity hover:opacity-80"
        >
          {s.name}
        </Link>
      </h3>

      {(s.tagline ?? s.description) && (
        <p className="mt-4 max-w-lg text-pretty text-xl leading-snug text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.75)]">
          <span className="line-clamp-2">{s.tagline ?? s.description}</span>
        </p>
      )}

      {s.description && (
        <>
          <span
            aria-hidden
            className="mt-5 block h-px w-14 bg-white/40"
          />
          <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            <span className="line-clamp-3">
              {/* Địa điểm không có tagline thì mô tả đã lên bậc trên rồi — ở đây
                  chỉ in khi hai thứ khác nhau, kẻo lặp nguyên đoạn. */}
              {s.tagline ? s.description : null}
            </span>
          </p>
        </>
      )}

      <Link
        href={`/dia-diem/${s.slug}`}
        className="group mt-7 inline-flex h-12 w-fit items-center gap-2.5 rounded-lg border border-white/35 px-6 text-base font-medium text-white transition-colors hover:border-white hover:bg-white/10"
      >
        Khám phá địa điểm
        <ArrowUpRight
          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}

// Section "Địa điểm đáng ghé" dựng như hero: ảnh full-bleed tràn viền, tên địa
// điểm cỡ lớn, tự đổi mục theo thời gian. Khác hero ở ba điểm — đó là phần
// "riêng" để nó không tranh vai với hero ở đầu trang:
//  - KHÔNG canh giữa: chữ dồn về cột trái, cột phải là danh sách các địa điểm
//    còn lại → mắt đọc theo chiều ngang thay vì tụ vào tâm như hero;
//  - hai mép CẮT THẲNG — hero tan vào nền bằng dải mây, dải này dứt khoát là
//    một khối trong trang (đã thử sương và cắt xiên, cả hai đều rối hơn là đẹp);
//  - HAI TÔNG: ảnh chỉ phủ 58% bên trái, nửa phải là NỀN TRANG. Chữ nhỏ của
//    danh sách không thể đọc trên ảnh đổi 7 giây một lần — sáng thì chìm, đổ
//    tối cho chắc thì cả dải thành khối âm u. Tách hẳn ra: chữ lớn ở lại trên
//    ảnh (cỡ đó scrim đỡ được), chữ nhỏ về nền phẳng sáng;
//  - tiến trình không có thanh riêng: nó là vạch ngăn của hàng đang chọn.
// Bấm một mục → ảnh nền crossfade sang ảnh mục đó, khối chữ đổi theo và lượt
// đếm bắt đầu lại từ mục vừa bấm.
export function SpotSpotlight({
  title,
  count,
  allHref,
  spots,
}: {
  title: string;
  count?: number;
  allHref: string;
  spots: SpotSpotlightItem[];
}) {
  const items = spots.slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Rê chuột/đưa focus vào danh sách là đang cân nhắc chọn — đổi mục ngay lúc
  // đó thì thao tác trượt tay. Tạm dừng, rời ra thì chạy tiếp.
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);
  const panelId = useId();

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const n = items.length;
  const playing = !paused && !hover && !reduced && n > 1;

  // Hẹn giờ NHỚ phần đã chạy của lượt hiện tại. Cần thế vì vạch tiến trình dùng
  // CSS animation: lúc tạm dừng nó đứng im tại chỗ rồi đi tiếp từ đó, nên nếu
  // hẹn giờ cứ chạy lại đủ 7 giây sau mỗi lần hover thì vạch sẽ về đích trước,
  // đứng đầy một lúc rồi mới đổi mục — nhìn ra là sai ngay.
  const elapsedRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = 0;
  }, [index]);
  useEffect(() => {
    if (!playing) return;
    const startedAt = performance.now();
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % n),
      Math.max(0, INTERVAL - elapsedRef.current),
    );
    return () => {
      clearTimeout(t);
      elapsedRef.current += performance.now() - startedAt;
    };
  }, [index, playing, n]);

  // ── Thẻ ảnh vuốt được (dưới lg) ─────────────────────────────────────────
  // Hai chiều: lượt tự đổi kéo carousel sang thẻ tương ứng, và người vuốt tay
  // thì carousel báo ngược về `index` để cột danh sách bên dưới sáng đúng hàng.
  // Chạm tay vào là DỪNG tự đổi: người dùng đã cầm lái, để nó tiếp tục nhảy sau
  // 7 giây thì thẻ đang xem bị giật đi mất. Nút play/pause có sẵn để chạy lại.
  const [api, setApi] = useState<CarouselApi | null>(null);
  useEffect(() => {
    api?.scrollTo(index);
  }, [api, index]);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    const onPointerDown = () => setPaused(true);
    api.on("select", onSelect);
    api.on("pointerDown", onPointerDown);
    return () => {
      api.off("select", onSelect);
      api.off("pointerDown", onPointerDown);
    };
  }, [api]);

  if (n === 0) return null;
  const active = items[Math.min(index, n - 1)];
  const go = (step: number) => {
    setPaused(true);
    setIndex((i) => (i + step + n) % n);
  };

  // KHÔNG đặt nền ở gốc: dải bọc ngoài (xem Band ở trang Place) quyết định nền,
  // nhờ vậy khung mat trắng của ảnh nổi lên được trên nền nhạt.
  return (
    <div className="relative isolate w-full overflow-hidden">
      {/* Sàn chiều cao: phần cao hơn nội dung KHÔNG thành khoảng trống — cột
          danh sách nuốt hết (`lg:items-stretch` + hàng `lg:flex-1`), còn khung
          ảnh bên trái cũng cao theo cột. Nâng con số này là cách duy nhất để
          dải cao lên mà không phải độn padding rỗng. */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 py-14 sm:px-6 sm:py-20 lg:min-h-[46rem]">
        {/* Heading dùng chung `SectionHeading` — chính khuôn "nhãn viết tay +
            đường bay" này đã được đưa vào component để mọi section trên trang
            cùng một giọng. */}
        <SectionHeading
          title={title}
          href={allHref}
          count={count}
          unit="địa điểm"
        />

        {/* `grid-cols-1` phải VIẾT RÕ: bỏ trống thì cột ngầm là track `auto`
            (co theo max-content) — tên/mô tả địa điểm dài là track phình tới cả
            nghìn px, chữ tràn ra ngoài màn hình rồi bị `overflow-hidden` xén.
            `grid-cols-1` của Tailwind = `minmax(0,1fr)` nên track không bao giờ
            vượt bề ngang cha. Áp dụng cho mọi lưới chỉ khai báo cột ở lg. */}
        {/* `gap-3` dưới lg, `gap-8` từ sm. Dưới lg cột phải chỉ còn CỤM ĐIỀU
                KHIỂN của carousel (bộ đếm + nút tạm dừng) — danh sách và nút
                gạch đứt đều đã ẩn — nên khe 32px của bố cục hai cột đẩy chúng
                trôi hẳn khỏi thứ chúng điều khiển. Điều khiển phải dính vào
                đúng vật nó điều khiển. */}
            <div className="mt-6 grid flex-1 grid-cols-1 gap-3 sm:gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-12">
          <div
            id={panelId}
            className="relative isolate flex min-w-0 flex-col pb-6 lg:col-span-7 lg:pb-14 lg:pr-12 xl:pr-20"
          >
            {/* ── DƯỚI lg: thẻ ảnh VUỐT ĐƯỢC ─────────────────────────────────
                Trước đây mobile dùng chung khung ảnh tuyệt đối của desktop: ảnh
                là lớp nền phía sau khối chữ, nên CHIỀU CAO ẢNH DO ĐỘ DÀI MÔ TẢ
                quyết định — địa điểm nào chữ dài là ảnh bị kéo cao ngoằng, mỗi
                mục một khổ khác nhau. Ở đây ảnh có TỈ LỆ CỐ ĐỊNH (3/4), chữ nằm
                đè ở đáy trong đúng khung đó, nên mọi mục cùng một khổ.
                Mỗi địa điểm là một thẻ của carousel → vuốt ngang được, cộng hai
                nút lùi/tiến cho người không quen vuốt (và cho chuột trên tablet). */}
            <div className="relative -mx-4 sm:-mx-6 lg:hidden">
              <Carousel
                setApi={setApi}
                opts={{ align: "start", loop: true }}
                aria-label="Ảnh địa điểm"
              >
                <CarouselContent className="ml-0">
                  {items.map((s, i) => (
                    <CarouselItem key={s.slug} className="basis-full pl-0">
                      {/* Cùng lối "ảnh in lồng khung" như bản desktop: mat nền
                          trang + hairline quanh miệng khoét. */}
                      {/* Khung mat KHÔNG bo góc: nó cùng màu nền trang và tràn
                          hết bề ngang, bo hay không cũng không ai thấy. Phần bo
                          nằm ở MIỆNG KHOÉT — tức chính bức ảnh. */}
                      <div className="relative aspect-[3/4] bg-background p-2.5 ring-1 ring-border sm:p-3">
                        <div className="absolute inset-2.5 overflow-hidden rounded-2xl sm:inset-3">
                          <Image
                            src={s.image}
                            alt=""
                            fill
                            priority={i === 0}
                            sizes="100vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-[radial-gradient(125%_115%_at_0%_100%,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.6)_30%,rgba(0,0,0,0.2)_64%,rgba(0,0,0,0.02)_100%)]" />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_2px_6px_rgba(0,0,0,0.22)] ring-1 ring-black/15"
                          />
                        </div>
                        <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
                          <SpotPanel s={s} on stacked={false} />
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Lùi/tiến: đặt ở GÓC TRÊN–PHẢI của ảnh. Khối chữ neo ở góc
                  trái–dưới nên đây là góc duy nhất luôn trống, khỏi che nội dung. */}
              {n > 1 && (
                <div className="absolute right-5 top-5 flex gap-2 sm:right-6 sm:top-6">
                  {[
                    { step: -1, label: "Địa điểm trước", Icon: ChevronLeft },
                    { step: 1, label: "Địa điểm sau", Icon: ChevronRight },
                  ].map(({ step, label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => go(step)}
                      aria-label={label}
                      className="relative grid size-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-black/55 active:bg-black/60"
                    >
                      <Icon className="size-5" aria-hidden />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ảnh bám đúng CỘT TRÁI: `right-0` neo vào mép phải của cột, lề
                trái lùi ra đúng bằng khoảng cách từ cột tới mép màn hình —
                `(100vw - bề ngang container)/2 + padding`.
                ĐỪNG thay bằng `-left-[100vw]` cho tiện: hộp chứa khi đó rộng gấp
                ~2,5 lần vùng nhìn thấy, `object-cover` phủ theo hộp nên cái ta
                thấy chỉ là một lát cắt phóng to của ảnh.
                HÌNH KHỐI: quanh ảnh có một lớp nền trang dày 8–10px cộng đường
                viền 1px — đúng lối đóng khung một bức ảnh in (mat + khung). Vì
                ảnh thò ra khỏi mép trái màn hình nên chỉ thấy ba cạnh; ba cạnh
                đó là đủ để đọc ra "bức ảnh có khung".
                BO GÓC (trước đây để vuông): cả trang này bo tròn — thẻ, nút,
                ảnh trong danh sách, thanh tab — nên một khối vuông vức cỡ này
                đọc ra như quên style. Khung bo `rounded-r-3xl` (chỉ hai góc
                phải, hai góc trái nằm ngoài màn hình), còn miệng khoét bên
                trong bo `rounded-2xl` — nhỏ hơn một bậc, đúng quy tắc khung
                ngoài luôn cong hơn ruột trong.
                Từ lg khung ảnh cao ĐÚNG BẰNG cột (`inset-y-0`): mép trên và mép
                dưới của nó thẳng hàng với đầu và cuối cột danh sách bên phải —
                lệch một chút thôi là hai bên đọc ra như hai khối rời nhau.
                Bóng để NGẮN thôi: khung cao bằng cột mà dải lại `overflow-hidden`,
                bóng dài bao nhiêu thì bị cắt ngang ở mép dưới bấy nhiêu — nhìn ra
                ngay là một vệt xám bị xén. */}
            <div
              aria-hidden
              className="absolute inset-y-0 right-0 hidden overflow-hidden rounded-r-3xl bg-background p-3.5 pb-7 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.35)] ring-1 ring-border lg:block lg:-left-[calc((100vw-min(100vw,80rem))/2+1.5rem)]"
            >
              {/* Ghi chú trong dải mat đáy: số thứ tự + loại địa điểm, cỡ rất
                  nhỏ, màu nhạt — đúng chỗ và đúng cách người ta ghi chú dưới một
                  bức ảnh in. Chỉ có ở lg vì chỉ ở đó mat đáy mới đủ dày. */}
              <span
                aria-hidden
                className="absolute inset-x-4 bottom-1.5 hidden items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:flex"
              >
                <span className="tabular-nums">
                  {num(index)} / {num(n - 1)}
                </span>
                <span className="truncate pl-4">{active.category}</span>
              </span>

              {/* Đường vát của mat: hairline quanh miệng khoét + bóng hắt vào
                  trong. Đây mới là chi tiết làm nó ra "ảnh in lồng khung" —
                  không có nó thì mat chỉ là một dải trắng viền ngoài. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-3.5 bottom-7 z-10 rounded-2xl shadow-[inset_0_2px_6px_rgba(0,0,0,0.22)] ring-1 ring-black/15"
              />

              {/* Lớp trong: đây mới là vùng ảnh thật (nằm trong khung). */}
              {items.map((s, i) => (
                <div
                  key={s.slug}
                  className={cn(
                    "absolute inset-3.5 bottom-7 overflow-hidden rounded-2xl transition-opacity duration-700 ease-out",
                    i === index ? "opacity-100" : "opacity-0",
                  )}
                >
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    style={{ transitionDuration: `${INTERVAL}ms` }}
                    className={cn(
                      "object-cover transition-transform ease-out motion-reduce:transition-none",
                      i === index ? "scale-100" : "scale-[1.08]",
                    )}
                  />
                </div>
              ))}
              {/* MỘT lớp phủ duy nhất, hình quạt từ góc trái–dưới: đậm đúng chỗ
                  đặt chữ rồi tan nhanh ra ngoài. Trước đây là hai lớp gradient
                  thẳng chồng nhau — cộng dồn nên chỗ nào cũng bị tối, kể cả
                  phần ảnh không có chữ nào. */}
              <div className="absolute inset-3.5 bottom-7 rounded-2xl bg-[radial-gradient(125%_115%_at_0%_100%,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.6)_30%,rgba(0,0,0,0.2)_64%,rgba(0,0,0,0.02)_100%)]" />
            </div>

            {/* MỌI khối chữ đều được render và xếp CHỒNG lên nhau trong cùng một
                ô lưới (`col-start-1 row-start-1`), chỉ khối đang chọn là hiện.
                Nhờ vậy chiều cao ô = khối CAO NHẤT và không đổi khi chuyển mục —
                mỗi địa điểm một độ dài mô tả/tên khác nhau, nếu chỉ render khối
                đang chọn thì cả dải giật lên xuống mỗi 7 giây.
                Khối ẩn dùng `inert` (React 19): vẫn nằm đó giữ chỗ nhưng không
                bắt được tab/chuột — `opacity-0` một mình thì link bên trong vẫn
                tab vào được.
                `content-center`: canh giữa cụm khối chữ trong phần cao còn lại
                của cột trái (sau khi trừ tiêu đề).
                CHỈ từ lg: dưới lg chữ đã nằm trong từng thẻ carousel ở trên,
                render cả khối này nữa là chữ hiện hai lần. */}
            <div className="relative hidden flex-1 content-end lg:grid">
              {items.map((s, i) => (
                <SpotPanel key={s.slug} s={s} on={i === index} />
              ))}
            </div>
          </div>

          {/* CỘT PHẢI — mục lục ảnh, ẢNH DỒN VỀ MÉP PHẢI.
              Bố cục cả section thành ra: ảnh lớn (mép trái) → chữ → chữ → cột
              ảnh nhỏ (mép phải). Hai đầu là ảnh, giữa là chữ; mắt có hai điểm
              tựa thay vì trôi từ trái sang phải rồi hết.
              Ảnh xếp thẳng hàng ở mép phải còn tạo một sống dọc gọn — thứ mà
              kiểu "ảnh bên trái + chữ bên phải" không có, vì mép phải của nó là
              chữ dài ngắn khác nhau.
              Dưới lg: dải thẻ cuộn ngang, ảnh quay về bên trái cho vừa bề ngang
              điện thoại. */}
          <div className="lg:col-span-5 lg:flex lg:flex-col lg:pl-2">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className={cn(MICRO, "text-muted-foreground")}>
                {/* "Chọn để xem" chỉ đúng ở lg, nơi có cột dòng để mà chọn.
                    Dưới lg còn lại đúng bộ đếm, đọc kèm carousel ngay trên. */}
                <span className="hidden lg:inline">Chọn để xem</span>
                <span className="tabular-nums text-foreground">
                  {" "}
                  {num(index)}/{num(n - 1)}
                </span>
              </p>
              {/* Nút tạm dừng hiện ở MỌI cỡ màn: trên điện thoại không có hover
                  để dừng, mà nội dung tự đổi thì luôn phải có cách dừng
                  (WCAG 2.2.2). */}
              {n > 1 && !reduced && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Tiếp tục tự đổi" : "Tạm dừng tự đổi"}
                  // `before:-inset-1.5` nới vùng chạm 32→44px mà không phình hình khối —
                  // cùng thủ pháp đã dùng ở các nút nhỏ trong hero.
                  className="relative grid size-8 shrink-0 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:border-foreground/40 hover:text-foreground"
                >
                  {paused ? (
                    <Play className="size-3.5" aria-hidden />
                  ) : (
                    <Pause className="size-3.5" aria-hidden />
                  )}
                </button>
              )}
            </div>

            {/* Cột chọn — CHỈ TỪ lg. Dưới lg đã có carousel thẻ ảnh ở trên.
                ⚠️ Trước đây cả hai cùng render dưới lg, và đó là một lỗi thật
                chứ không phải thừa thãi vô hại:
                  · ~1.600px lặp lại đúng sáu cái tên, sáu tấm ảnh, sáu dòng mô
                    tả — trên một trang tổng quan vốn đã cao ~9.000px ở khổ 390;
                  · tệ hơn, đích chính của mỗi dòng là nút phủ "Xem ảnh {tên}",
                    mà tác dụng duy nhất của nó là cuộn cái carousel giờ đã nằm
                    xa phía trên khung nhìn. Khách chạm và KHÔNG THẤY GÌ xảy ra,
                    còn link tên — thứ thật sự điều hướng — lại là đích nhỏ hơn
                    nằm lọt trong dòng.
                Cột dọc là thiết bị của bản DESKTOP, nơi nó nằm ngay cạnh khung
                ảnh lớn nên chọn một dòng là thấy ảnh đổi tức thì. */}
            <div
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onFocusCapture={() => setHover(true)}
              onBlurCapture={() => setHover(false)}
              className="hidden flex-1 flex-col lg:flex"
            >
              {items.map((s, i) => (
                <SpotRow
                  key={s.slug}
                  s={s}
                  i={i}
                  on={i === index}
                  playing={playing}
                  panelId={panelId}
                  onSelect={() => setIndex(i)}
                />
              ))}
            </div>
            {/* Lối sang tab Địa điểm: thanh NÉT ĐỨT rộng bằng cột, ngay dưới
                danh sách. Đây là khuôn "nút cuối danh sách" đã có ở mục Đánh
                giá ("Xem thêm N đánh giá") — cùng một việc thì cùng một hình,
                khỏi đẻ thêm kiểu mới.
                Nét đứt để nó KHÔNG bị đọc nhầm thành hàng thứ bảy: sáu hàng
                trên đều đặc và có ảnh, thanh này rỗng và đứt nét nên mắt hiểu
                ngay đó là điều khiển, không phải một địa điểm nữa. */}
            <Link
              href={allHref}
              // CHỈ TỪ lg. Lý lẽ của nút này là "một lối ra ở cuối danh sách, không phải
              // hàng thứ bảy" — mà dưới lg danh sách không còn (xem chú thích ở cột
              // chọn), nên nó chỉ còn là bản sao của link trên tiêu đề, đặt cách đó
              // đúng một thẻ carousel.
              className="group mt-4 hidden w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground lg:flex"
            >
              Xem tất cả{count != null ? ` ${count}` : ""} địa điểm
              <ArrowUpRight
                className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>

          </div>
        </div>

      </div>

      <p className="sr-only" aria-live="polite">
        Đang xem {active.name}, địa điểm {index + 1} trên {n}
      </p>
    </div>
  );
}
