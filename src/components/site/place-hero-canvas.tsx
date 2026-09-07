"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Fade from "embla-carousel-fade";
import { ArrowUpRight, LayoutGrid, Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { HeroLightbox } from "@/components/site/hero-lightbox";
import type { HeroImage } from "@/components/site/place-hero-stack";
import { R_BADGE } from "@/lib/radius";

// Hình học CHUNG của một ô trong dải ảnh — ô ảnh và ô thư viện phải khớp từng
// pixel, nếu không ô cuối sẽ đọc ra là một nút gắn thêm chứ không phải phần
// tiếp theo của dải.
// KHÔNG `shrink-0`: 6 ô × 56px + khe = 376px, vượt bề ngang khả dụng của màn
// 320px. Cho phép co thì ô tự hẹp lại ở máy nhỏ nhất mà `aspect-[3/4]` vẫn giữ
// tỉ lệ.
const TILE = `group relative aspect-[3/4] w-14 cursor-pointer overflow-hidden transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 sm:w-24 ${R_BADGE}`;

// Dải mây ở đáy hero: silhouette ghép từ các nửa cung tròn bán kính lệch nhau
// (đều nhau sẽ ra "vỏ sò"). Path vẽ lún xuống dưới đáy viewBox (h=220 > 140) để
// sau khi làm mờ, mép dưới vẫn đặc → không hở ảnh ở chỗ giáp nội dung trang.
const cloudPath = (radii: number[], base: number, h = 220) =>
  `M0,${h} L0,${base} ` +
  radii.map((r) => `a${r},${r} 0 0 1 ${2 * r},0`).join(" ") +
  ` L1440,${h} Z`;

// Khối chữ nằm ĐÈ lên dải ảnh, nên nó quyết định chỗ nào trong hero kéo được.
// Để nguyên thì cả hero hết kéo; cho cả khối `pointer-events-none` thì kéo được
// nhưng chữ hết bôi đen. Chốt: khối BAO trong suốt với con trỏ, trả lại cho
// từng phần tử thật sự có nội dung — chữ để bôi đen, link/nút để bấm. Phần còn
// lại (khoảng trống giữa các dòng, lề hai bên, vùng trên/dưới) rơi xuống dải
// ảnh nên vẫn kéo được.
//
// Chỉ cần khai thẻ NGOÀI CÙNG của mỗi cụm chữ: `pointer-events` là thuộc tính
// kế thừa, nên `<span>` bên trong h1/p/dd/a tự nhận theo.
//
// Cố ý KHÔNG khai `span` trần: hero còn dùng span cho các lớp phủ trang trí
// (dải gradient dưới filmstrip, kim tiến trình) đang phải `pointer-events-none`
// để không nuốt cú bấm thumbnail — mà selector con `[&_span]` có specificity
// cao hơn utility đặt thẳng trên thẻ, khai vào là vô hiệu hoá đúng những chỗ đó.
// Thêm cụm chữ mới bằng thẻ khác thì khai thêm ở đây.
const CONTENT_HITS = [
  "[&_a]:pointer-events-auto",
  "[&_button]:pointer-events-auto",
  "[&_h1]:pointer-events-auto",
  "[&_p]:pointer-events-auto",
  "[&_dt]:pointer-events-auto",
  "[&_dd]:pointer-events-auto",
].join(" ");

// Tốc độ mờ chồng, tính bằng ĐƠN VỊ CỦA EMBLA (không phải ms): plugin Fade lấy
// thẳng option `duration` của carousel làm thời lượng chuyển. 25 là mặc định
// (nhanh, hợp carousel card); hero cần mềm hơn nhiều nên đẩy lên ~2×.
const FADE_DURATION = 55;

// Tổng bán kính mỗi lớp = 720 → 2×720 = 1440 = bề ngang viewBox.
const CLOUD_HAZE = cloudPath(
  [70, 54, 62, 46, 74, 58, 50, 66, 44, 72, 56, 68],
  92,
);
const CLOUD_BACK = cloudPath(
  [52, 30, 44, 26, 58, 34, 40, 24, 50, 36, 46, 28, 54, 32, 42, 26, 48, 50],
  108,
);
const CLOUD_FRONT = cloudPath(
  [36, 48, 28, 56, 34, 44, 24, 52, 38, 30, 46, 26, 42, 32, 50, 28, 56, 50],
  120,
);

// Khung hero full-bleed: dải ảnh tràn viền KÉO ĐƯỢC (Embla, qua component
// `Carousel` của dự án) chuyển cảnh kiểu MỜ CHỒNG + zoom chậm (Ken Burns), phủ
// scrim để chữ trắng đọc rõ, đáy tan dần vào nền trang. Hai chuyển động này
// tách bạch: mờ chồng chỉ chạy khi kéo/chuyển ảnh, Ken Burns chạy nền suốt lượt
// hiển thị. Nội dung do phía server truyền vào qua slot
// `topBar` (thanh điều khiển) và `children` (khối chữ) — nhờ vậy stats/check-in
// vẫn render ở server.
//
// Bố cục: chữ nằm giữa khung, bộ chuyển ảnh (dải phim) gom xuống đáy, canh giữa.
//
// Nhìn thì vẫn là mờ chồng như bản `opacity` + timer trước đây, nhưng phải qua
// carousel thật vì cử chỉ kéo cần BÁM NGÓN TAY: độ mờ chạy theo đúng quãng kéo,
// thả giữa chừng thì lùi về ảnh cũ. Một chồng ảnh đổi class không làm được việc
// đó — nó chỉ biết "đã chuyển" hay "chưa".
export function PlaceHeroCanvas({
  images,
  topBar,
  children,
  intervalMs = 6500,
}: {
  images: HeroImage[];
  topBar?: React.ReactNode;
  children: React.ReactNode;
  intervalMs?: number;
}) {
  // Vòng chạy = 5 ảnh THẬT đầu tiên. Dải khớp 1:1 với vòng chạy (không lật
  // trang, không cửa sổ trượt) và không nạp cả chục ảnh khổ lớn làm lớp nền.
  // Toàn bộ ảnh vẫn xem được qua "Xem tất cả N ảnh".
  const shots = images.slice(0, 5);
  const n = shots.length;
  const total = images.length;
  // `index` là BẢN SAO của slide đang chọn trong Embla (đồng bộ qua sự kiện
  // "select"), dùng cho caption / kim tiến trình / Ken Burns. Muốn ĐỔI ảnh thì
  // luôn gọi `api.scrollTo()` chứ đừng setIndex — nếu không dải ảnh đứng im.
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Lightbox giữ index RIÊNG: nó duyệt được toàn bộ ảnh, trong khi hero chỉ
  // quay vòng 5 ảnh đầu. Trước đây lightbox dùng chung `index` của hero rồi bị
  // hero kẹp lại ở 0–4 → chọn ảnh thứ 6 thì carousel nhảy đúng ảnh nhưng số
  // đếm, chú thích và thumbnail đang chọn đứng im ở ảnh cũ.
  const [lightbox, setLightbox] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  // Embla → React: mọi nguồn đổi ảnh (kéo tay, autoplay, bấm dải phim) đều đi
  // qua sự kiện "select", nên chỉ một chỗ này cập nhật `index`.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const playing = !paused && !lightbox && !reduced && n > 1;
  useEffect(() => {
    if (!playing || !api) return;
    // Hẹn giờ chạy lại mỗi lần `index` đổi → kéo tay cũng đẩy lùi lần tự chuyển
    // kế tiếp (không bị "vừa vuốt xong ảnh đã nhảy").
    const t = setTimeout(() => api.scrollNext(), intervalMs);
    return () => clearTimeout(t);
  }, [index, playing, intervalMs, api]);

  if (n === 0) return null;
  const active = shots[index];
  // Ảnh không có ô riêng trong dải (dải tối đa 5) → con số trên ô thư viện.
  const rest = total - n;
  const more = images[n] ?? null;

  return (
    <section className="relative isolate w-full overflow-hidden bg-neutral-900">
      {/* Lớp ảnh: dải Embla kéo được + zoom chậm về 100% cho ảnh đang xem.
          `aria-hidden` vì ảnh ở đây là nền trang trí (alt rỗng, không focus
          được) — phần đọc được cho screen-reader là dòng aria-live cuối file và
          dải phim bên dưới. */}
      <div aria-hidden className="absolute inset-0">
        <Carousel
          setApi={setApi}
          // Plugin Fade: các khung nằm CHỒNG lên nhau, Embla đổi `opacity` thay
          // vì dịch ngang — nhưng vẫn là cùng bộ máy kéo, nên độ mờ chạy theo
          // đúng quãng ngón tay và thả giữa chừng thì nó lùi về ảnh cũ.
          plugins={n > 1 ? [Fade()] : []}
          // `watchDrag` tắt khi chỉ có 1 ảnh: bật thì con trỏ vẫn đổi thành bàn
          // tay và ảnh nhún nhẹ dù chẳng có gì để kéo tới.
          opts={{ loop: n > 1, watchDrag: n > 1, duration: FADE_DURATION }}
          // `[&>div]:h-full` với tới lớp viewport bên trong Carousel (class của
          // nó cố định trong ui/carousel.tsx) để dải ảnh cao trọn hero.
          className="h-full [&>div]:h-full"
        >
          {/* touch-pan-y: nhường cử chỉ DỌC lại cho trình duyệt, nếu không vuốt
              cuộn trang ngay trên hero sẽ bị dải ảnh nuốt mất. */}
          <CarouselContent className="ml-0 h-full touch-pan-y">
            {shots.map((img, i) => (
              // overflow-hidden trên từng khung: ảnh đang ở mức zoom 110%
              // (Ken Burns), không cắt thì nó tràn ra ngoài hero.
              <CarouselItem key={i} className="h-full overflow-hidden pl-0">
                <div className="relative h-full w-full">
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    priority={i === 0}
                    // Hero bó trong `max-w-7xl` (= 90rem ở dự án này), nên trên
                    // màn rộng hơn thế nó KHÔNG còn full-viewport: khai `100vw`
                    // là bắt trình duyệt tải bản to hơn mức dùng, và Next log
                    // đúng cảnh báo đó.
                    sizes="(min-width: 90rem) 90rem, 100vw"
                    draggable={false}
                    // Zoom chạy đúng bằng thời lượng slide: đặt dài hơn thì ảnh
                    // bị chuyển đi giữa chừng, hoá ra chỉ zoom được một phần.
                    style={{ transitionDuration: `${intervalMs}ms` }}
                    className={cn(
                      "object-cover transition-transform ease-out motion-reduce:transition-none",
                      i === index ? "scale-100" : "scale-110",
                    )}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Scrim: một dải đáy dốc dài (chỗ đặt chữ) + một dải từ trái. Đủ để chữ
            trắng đọc rõ mà không cần drop-shadow trên từng chữ.
            `pointer-events-none` ở đây và ở dải mây: chúng phủ kín dải ảnh, để
            mặc định thì mọi cú kéo dừng lại ở lớp phủ, không tới được carousel. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 from-10% via-black/30 via-45% to-black/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/5 to-transparent" />
        {/* Đáy: ba lớp mây làm mờ bằng feGaussianBlur — sương chứ không phải
            silhouette cắt nét. Lớp càng cao càng nhạt & nhoè mạnh; lớp trước đặc
            màu nền để mép dưới liền mạch với nội dung trang. */}
        <svg
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full sm:h-24 lg:h-28"
        >
          <defs>
            <filter id="hero-cloud-soft" x="-5%" y="-40%" width="110%" height="180%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="hero-cloud-softer" x="-5%" y="-40%" width="110%" height="180%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <path
            d={CLOUD_HAZE}
            filter="url(#hero-cloud-softer)"
            className="fill-background/35"
          />
          <path
            d={CLOUD_BACK}
            filter="url(#hero-cloud-soft)"
            className="fill-background/60"
          />
          <path
            d={CLOUD_FRONT}
            filter="url(#hero-cloud-soft)"
            className="fill-background"
          />
        </svg>
      </div>

      {/* Scrim đỉnh — CHỈ ở mobile. Từ lg, header `fixed` chìm lên hero đã mang
          sẵn scrim của nó; dưới lg không còn header nào cả, nên thanh back/chia
          sẻ (vòng tròn hairline trắng, không nền) sẽ tan biến trên một tấm ảnh
          sáng. Dải tối rất nhẹ này là thứ duy nhất giữ chúng đọc được. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent lg:hidden"
      />

      {/* Đệm trên:
          - từ lg: chừa 4rem cho header `fixed` chìm lên hero, để thanh trong
            hero (back/chia sẻ) không chui xuống dưới logo;
          - dưới lg: KHÔNG còn header, nên chỉ chừa vùng an toàn của máy
            (`safe-area-inset-top` — tai thỏ / dynamic island khi chạy dạng app)
            cộng một khoảng thở. Nhờ vậy hero lấy lại đúng 64px đã mất và thanh
            điều khiển nằm ngay tầm mắt thay vì trôi xuống giữa ảnh.
          pb đủ lớn để nội dung không đè lên đỉnh mây (mây cao ~60% chiều cao dải).
          Chiều cao theo thiết bị:
          - mobile/tablet: `h-auto` — cao đúng bằng nội dung (~650px). Ép 100svh
            ở đây vừa thừa (điện thoại màn dài thành hero lê thê) vừa rủi ro:
            section có overflow-hidden nên máy màn ngắn sẽ bị CẮT mất dải ảnh.
          - lg trở lên: trọn màn hình, kẹp trần 58rem cho màn rất cao. */}
      {/* Xem ghi chú ở CONTENT_HITS về cách chia vùng kéo / vùng chữ. */}
      <div
        className={cn(
          "pointer-events-none relative mx-auto flex h-auto min-h-[32rem] w-full max-w-7xl flex-col px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.875rem)] sm:px-6 sm:pb-14 lg:h-[100svh] lg:max-h-[58rem] lg:min-h-[38rem] lg:pb-20 lg:pt-[calc(4rem+1.25rem)]",
          CONTENT_HITS,
        )}
      >
        {topBar}

        <div
          className={cn(
            "flex flex-col",
            "min-h-0 flex-1 justify-between gap-8 pt-6",
          )}
        >
          <div
            className={cn(
              "min-w-0",
              "flex flex-1 flex-col justify-center",
            )}
          >
            {children}
          </div>

          {/* Cụm chuyển ảnh, ba hàng canh giữa: chú thích · đường + xe + cột
              mốc · điều khiển. Nguyên tắc: chỉ hàng ảnh được là khối nặng, hai
              hàng kia là chữ trần — thêm nền hay khung cho chúng nữa là cụm này
              bắt đầu cạnh tranh với tên điểm đến ngay phía trên. */}
          <div
            className={cn(
              "shrink-0",
              "flex flex-col items-center text-center",
              // MỘT ảnh thì không có dải. Điểm đến thưa (Tà Xùa) đang hiện một
              // ô thumbnail của đúng tấm ảnh đang phủ kín màn hình, kèm bộ đếm
              // "1" — một bộ điều khiển không điều khiển gì, và nó tự tố rằng
              // nơi này chỉ có một tấm hình.
              n === 1 && "hidden",
            )}
          >
            {/* DẢI ẢNH — MỘT hàng ô, ô cuối là cửa vào thư viện.
                Bản trước là ba hàng chồng nhau: hàng ảnh, một hàng điều khiển
                riêng (tạm dừng ‹ thanh chạy › lưới + số), rồi hàng chú thích.
                Ba hàng cho ba việc vốn cùng nói về một thứ — tấm ảnh đang xem —
                nên cụm cao gần bằng khối chữ ở giữa hero và bắt đầu tranh chỗ
                với nó. Nay gộp còn hai:
                  · việc "xem tất cả" chuyển thành MỘT Ô trong chính dải, cùng
                    cỡ cùng dáng với các ô ảnh — nó là phần tiếp theo của dải
                    chứ không phải một nút lạc loài, và ô đó tự mang luôn con
                    số (+N) nên bộ đếm rời biến mất;
                  · nút tạm dừng nhập vào hàng chú thích, thành một cụm canh
                    giữa "▮▮ Tên ảnh ↗" — đọc như dòng caption của một khung
                    hình đang chạy.
                Ô ĐANG XEM đánh dấu bằng viền CAM (`warm-bright`) thay cho viền
                trắng: trắng đặt trên ảnh trắng thì mất dấu, mà cam đã là màu
                điểm nhấn của hero (vạch hai bên tên tỉnh, nút lịch trình).
                Ô không to lên cũng không đổi dáng — hàng phải giữ nhịp đều. */}
            <div className="flex w-full flex-col items-center gap-3.5">
              {/* `w-full` + `justify-center`: hàng phải NHẬN bề ngang của cha
                  thì các ô mới có áp lực co lại. Để `width:auto` (mặc định
                  trong cột `items-center`) thì hàng rộng bằng max-content — sáu
                  ô × 56px + khe = 376px, và ở màn 320px ô cuối bị cắt cụt ngoài
                  mép thay vì cả hàng thu nhỏ. */}
              <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2.5">
                {shots.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => api?.scrollTo(i)}
                    aria-label={img.alt || `Ảnh ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    className={cn(
                      TILE,
                      i === index
                        ? "shadow-[0_0_0_2px_var(--warm-bright)]"
                        : "shadow-lg shadow-black/40",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      // Cỡ thật của ô, khai đúng theo breakpoint để máy nhỏ
                      // khỏi tải bản ảnh của desktop.
                      sizes="(min-width: 640px) 96px, 56px"
                      className="object-cover"
                    />
                    {/* Làm tối ô CHƯA mở bằng lớp phủ đen, không phải `opacity`:
                        hạ opacity thì ảnh hero phía sau xuyên qua, ô ảnh đục mờ
                        và ngả màu theo nền. Lớp phủ giữ ảnh nguyên nét. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 bg-black transition-opacity duration-500",
                        i === index
                          ? "opacity-0"
                          : "opacity-55 group-hover:opacity-25",
                      )}
                    />
                  </button>
                ))}

                {/* Ô THƯ VIỆN — nền là tấm ảnh ĐẦU TIÊN NGOÀI DẢI, phủ tối.
                    Lấy ảnh thật chứ không phải một ô trống có icon: nó cho thấy
                    "còn nữa" bằng chính thứ đang được hứa hẹn. Hết ảnh ngoài
                    dải (total = n) thì rơi về ô hairline + icon lưới. */}
                <button
                  type="button"
                  onClick={() => {
                    setLbIndex(rest > 0 ? n : index);
                    setLightbox(true);
                  }}
                  aria-label={`Xem tất cả ${total} ảnh`}
                  title={`Xem tất cả ${total} ảnh`}
                  className={cn(TILE, "shadow-lg shadow-black/40")}
                >
                  {more ? (
                    <>
                      <Image
                        src={more.url}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 96px, 56px"
                        className="object-cover"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-black/60 transition-opacity duration-500 group-hover:opacity-75"
                      />
                    </>
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 border border-white/30 bg-white/5 transition-colors group-hover:bg-white/15"
                    />
                  )}
                  <span className="relative flex h-full flex-col items-center justify-center gap-1 text-white">
                    <LayoutGrid className="size-4 shrink-0" aria-hidden />
                    <span className="text-[0.65rem] font-semibold leading-none tabular-nums">
                      {rest > 0 ? `+${rest}` : total}
                    </span>
                  </span>
                </button>
              </div>

              {/* HÀNG DƯỚI — tạm dừng + chú thích trong MỘT cụm canh giữa.
                  Ô luôn cao 20px để cụm không nhảy khi ảnh không có tên. */}
              <div className="flex h-5 items-center justify-center gap-3">
                {n > 1 && (
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
                    // `before:-inset-2`: nới vùng chạm ra 40px mà icon vẫn nhỏ.
                    // Icon 16px làm nút thì trên điện thoại gần như không trúng.
                    className="relative shrink-0 cursor-pointer text-white/60 transition-colors before:absolute before:-inset-2 before:content-[''] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    {paused ? (
                      <Play className="size-3.5" aria-hidden />
                    ) : (
                      <Pause className="size-3.5" aria-hidden />
                    )}
                  </button>
                )}

                {/* `key` theo index → mỗi lần đổi ảnh là mount lại và chạy hiệu
                    ứng hiện dần; không có nó thì chữ bị thay đột ngột. */}
                {active.caption &&
                  (active.href ? (
                    <Link
                      key={index}
                      href={active.href}
                      className="group inline-flex min-w-0 animate-in items-center gap-1.5 fade-in text-sm font-medium text-white/85 transition-colors duration-500 hover:text-white"
                    >
                      <span className="truncate">{active.caption}</span>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <p
                      key={index}
                      className="animate-in truncate fade-in text-sm font-medium text-white/85 duration-500"
                    >
                      {active.caption}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Ảnh {index + 1} trên {n}
        {active.caption ? `: ${active.caption}` : ""}
      </p>

      {lightbox && (
        <HeroLightbox
          images={images}
          index={lbIndex}
          onIndexChange={setLbIndex}
          // Đóng lại: chỉ kéo hero theo nếu ảnh vừa xem nằm trong vòng chạy;
          // ngoài vùng đó thì hero giữ nguyên ảnh cũ.
          onClose={() => {
            setLightbox(false);
            // `true` = nhảy thẳng, không chạy hoạt ảnh trượt qua các ảnh ở giữa
            // (lightbox vừa đóng, không ai nhìn thấy đoạn trượt đó).
            if (lbIndex < n) api?.scrollTo(lbIndex, true);
          }}
        />
      )}
    </section>
  );
}
