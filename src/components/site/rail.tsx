"use client";

import { Children, useEffect, useState } from "react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";

// Carousel ngang (Embla): kéo chuột/vuốt được sẵn, thêm nút ‹ › trên desktop.
// itemClassName: bề rộng mỗi card (vd "w-72", "w-44").
// arrowClassName: canh lại vị trí nút ‹ › (vd "top-1/2 -translate-y-1/2" cho card cao).
export function Rail({
  children,
  itemClassName,
  arrowClassName,
  progress = false,
  heading,
  headingClassName,
  contentClassName,
  viewportClassName,
  meta,
}: {
  children: React.ReactNode;
  itemClassName?: string;
  arrowClassName?: string;
  /**
   * Hiện thanh tiến trình mảnh dưới rail. Bật ở những rail DÀI mà người dùng
   * không đoán được còn bao nhiêu mục phía sau (vd danh sách điểm đến của một
   * miền). Rail ngắn, vừa đủ một màn thì để tắt — thanh sẽ tự ẩn, nhưng khỏi
   * phải đo làm gì.
   */
  progress?: boolean;
  /**
   * Tiêu đề của rail. Truyền vào ĐÂY thay vì đặt bên ngoài để thanh tiến trình
   * đứng được cùng hàng với nó — `RailProgress` phải nằm trong `<Carousel>` mới
   * đọc được embla API.
   */
  heading?: React.ReactNode;
  /** Class cho HÀNG tiêu đề (tiêu đề + thanh tiến trình) — dùng để bù lại lề
   *  khi khối rail được kéo rộng hơn container. */
  headingClassName?: string;
  /** Class cho hàng thẻ (bên trong khung cắt của carousel). */
  contentClassName?: string;
  /** Class cho khung cắt của carousel (lớp `overflow-hidden`). */
  viewportClassName?: string;
  /** Một mẩu chữ ngắn đứng chung khung với thanh tiến trình và cặp nút. */
  meta?: React.ReactNode;
}) {
  // HAI CHỖ ĐẶT MŨI TÊN, chọn theo việc rail có hàng tiêu đề hay không.
  //
  // 1. CÓ tiêu đề → cặp nút đứng CẠNH NHAU ở cuối hàng đó. Kiểu phủ lên hai mép
  //    dải (bản 2) chỉ hợp khi rail hẹp; ở đây dải rộng cả nghìn pixel nên hai
  //    nút cách nhau gần hết màn hình — bấm ‹ rồi muốn bấm › là phải kéo chuột
  //    ngang qua toàn bộ dải. Đứng cạnh nhau thì bấm tiếp mà không phải rời tay.
  //    Nhãn phụ · thanh tiến trình · cặp mũi tên, đứng chung một hàng và cùng
  //    canh giữa. KHÔNG khung ngoài, KHÔNG vạch ngăn: đã thử bản đóng khung ba
  //    ngăn và nó ra một cái widget — thứ hình dạng mà chỗ nào trên mạng cũng
  //    có, lại còn khiến hai mũi tên lệch khỏi tâm vì chúng cao 32px trong khi
  //    hai ngăn kia cao theo chữ.
  //    Nay nhãn và thanh giữ liên hệ bằng KHOẢNG CÁCH, còn hai mũi tên nằm
  //    trong một khung viền mảnh chung, ngăn giữa bằng một vạch dọc — khung chỉ
  //    bao ĐÚNG CẶP NÚT nên nó nói "hai cái này là một cặp bấm được", chứ không
  //    gói cả nhãn lẫn thanh vào thành một widget như bản trước.
  //    Đã thử bản mũi tên trần không khung: sạch, nhưng hai dấu ‹ › lửng lơ
  //    giữa khoảng trắng thì không ra vật bấm được, và cũng chẳng còn gì để
  //    cân với khối chữ bên trái.
  //    Rê vào thì ô đảo thành nền mực chữ trắng — cùng ngôn ngữ với ô miền
  //    đang chọn trên thanh lọc. Hết đường thì mũi tên nhạt đi, không biến mất.
  // 2. KHÔNG có tiêu đề → giữ nguyên bản cũ: nút kính tròn nổi trên hai mép
  //    dải, chỉ hiện khi rê vào. Sáu rail khác trong site dùng bản này.
  const arrowInline =
    "static hidden size-9 shrink-0 translate-y-0 rounded-none border-0 bg-transparent text-foreground opacity-100 shadow-none transition-colors hover:bg-foreground hover:text-background disabled:cursor-default disabled:bg-transparent disabled:text-muted-foreground/30 sm:inline-flex";
  const arrowOverlay =
    "left-3 top-[36%] hidden size-10 border-0 bg-black/45 text-white opacity-0 shadow-lg backdrop-blur-md transition-all pointer-events-none hover:bg-black/65 hover:text-white disabled:cursor-default disabled:bg-black/25 disabled:opacity-0 disabled:pointer-events-auto group-hover/rail:pointer-events-auto group-hover/rail:opacity-100 sm:inline-flex";
  const arrowBase = heading ? arrowInline : arrowOverlay;

  return (
    <Carousel
      opts={{ align: "start", dragFree: true }}
      plugins={[WheelGesturesPlugin()]}
      className="group/rail mt-6"
    >
      {heading && (
        // Tiêu đề và thanh tiến trình trên CÙNG MỘT ĐƯỜNG CHÂN CHỮ, hai đầu
        // hàng. Thanh vì thế nói độ dài của dải NGAY TỪ ĐẦU — trước khi người
        // ta đặt tay vào kéo — chứ không phải một phản hồi chỉ thấy sau khi đã
        // kéo rồi. Nó cũng lấp đúng khoảng trống ở nửa phải hàng tiêu đề.
        <div
          className={cn(
            "mb-5 flex items-end justify-between gap-6",
            headingClassName,
          )}
        >
          <div className="min-w-0">{heading}</div>
          <div className="hidden shrink-0 items-center gap-5 sm:flex">
            {meta}
            {progress && <RailProgress />}
            <ArrowPair
              className={cn(arrowBase, arrowClassName)}
              nextClassName={cn(
                arrowBase,
                "left-auto right-auto",
                arrowClassName,
              )}
            />
          </div>
        </div>
      )}
      {/* Mũi tên ‹ › neo `absolute`, nên chúng phải nằm trong một khối chỉ bao
          DẢI THẺ. Trước đây chúng là con trực tiếp của `<Carousel>` (thẻ
          `relative` duy nhất) — từ khi hàng tiêu đề chuyển vào trong Carousel,
          `top-1/2` thành giữa của "tiêu đề + thẻ", tức là mũi tên tụt xuống
          dưới tâm ảnh vài chục pixel. */}
      <div className="relative">
        <CarouselContent
          className={cn("-ml-4", contentClassName)}
          viewportClassName={viewportClassName}
        >
          {Children.map(children, (child) => (
            <CarouselItem className={itemClassName}>{child}</CarouselItem>
          ))}
        </CarouselContent>
        {!heading && (
          <>
            <CarouselPrevious className={cn(arrowBase, arrowClassName)} />
            <CarouselNext
              className={cn(arrowBase, "left-auto right-3", arrowClassName)}
            />
          </>
        )}
      </div>
      {progress && !heading && <RailProgress />}
    </Carousel>
  );
}

// Cặp nút ‹ ›, TỰ BIẾN MẤT khi dải không có gì để cuộn.
//
// Miền nào mới có ba bốn điểm đến thì cả dải nằm gọn trong khung: hai nút lúc
// đó vĩnh viễn mờ và bấm không ăn, mà một điều khiển chết nằm ngay cạnh tiêu đề
// còn tệ hơn là không có nó. Thanh tiến trình cũng tự ẩn theo cùng lý do (xem
// `RailProgress`), nên khi ít nội dung thì hàng tiêu đề chỉ còn tên miền và số
// đếm — đúng thứ cần có ở đó.
function ArrowPair({
  className,
  nextClassName,
}: {
  className?: string;
  nextClassName?: string;
}) {
  const { canScrollPrev, canScrollNext } = useCarousel();
  if (!canScrollPrev && !canScrollNext) return null;

  return (
    <div className="flex items-center divide-x divide-border border border-border">
      <CarouselPrevious className={className} />
      <CarouselNext className={nextClassName} />
    </div>
  );
}

// Thanh tiến trình của rail — một RÃNH NGẮN với đoạn cam trượt trong đó.
//
// Mảnh (2px) và ngắn: nó đứng cạnh cặp nút ‹ › trong cùng một cụm, nên phải là
// thứ nhẹ nhất ở đó — một dấu hiệu để liếc, không phải một điều khiển. Bản
// trước dày 3px và lệch đáy để canh với chân chữ tiêu đề; từ khi cụm bên phải
// canh giữa theo cặp nút thì nó về giữa như mọi thứ khác trong cụm.
//
// Vì sao cần: rail kéo được nhưng không nói gì về ĐỘ DÀI. Mũi tên ‹ › chỉ hiện
// trên máy có chuột và cũng chỉ cho biết "còn nữa hay hết", không cho biết còn
// BAO NHIÊU. Người vuốt trên điện thoại thì không có cả manh mối đó.
//
// Đoạn cam nói HAI điều cùng lúc: BỀ NGANG của nó là tỉ lệ phần đang nhìn thấy
// trên toàn dải (14 điểm đến thì đoạn ngắn, 5 thì đoạn dài — nhìn là biết dải
// còn dài bao nhiêu), và VỊ TRÍ của nó là chỗ đang đứng.
//
// Hai bản trước và lý do bỏ:
//   · rãnh chạy HẾT bề ngang — thành một nét kẻ ngang dưới mỗi miền, đúng thứ
//     trang này đã cố tránh (xem chú thích ở tiêu đề miền trong
//     `destination-filter.tsx`);
//   · MỘT VẠCH CHO MỖI MỤC — đếm được, nhưng 14 vạch rời trông ra một dãy ô
//     đánh dấu, và với danh sách dài hơn nữa thì vạch mảnh tới mức thành nhiễu.
//
// MÀU CAM là điểm màu duy nhất trong cả vùng danh sách (trang này gần như đen
// trắng: ảnh, chữ mực, nét xám). Nó nhỏ tới mức không tranh với ảnh, nhưng đủ
// để mắt bắt được ngay rằng nét này ĐANG ĐỘNG theo tay mình.
//
// Tự ẩn khi mọi mục đã nằm gọn trong khung: lúc đó không có gì để cuộn.
function RailProgress() {
  const { api } = useCarousel();
  const [view, setView] = useState<{ pos: number; ratio: number } | null>(null);

  useEffect(() => {
    if (!api) return;
    const measure = () => {
      const root = api.rootNode();
      const container = api.containerNode();
      const ratio = Math.min(1, root.clientWidth / container.scrollWidth);
      // `scrollProgress()` vượt ra ngoài [0,1] khi kéo quá đà ở hai đầu.
      const pos = Math.min(1, Math.max(0, api.scrollProgress()));
      setView({ pos, ratio });
    };
    measure();
    api.on("scroll", measure).on("reInit", measure);
    return () => {
      api.off("scroll", measure).off("reInit", measure);
    };
  }, [api]);

  if (!view || view.ratio >= 0.999) return null;

  const width = view.ratio * 100;
  return (
    <div aria-hidden className="h-[2px] w-14 shrink-0 overflow-hidden bg-border sm:w-20">
      <div
        className="h-full bg-warm"
        style={{
          width: `${width}%`,
          // `translateX` tính theo bề ngang của CHÍNH đoạn cam, nên phải quy đổi
          // quãng chạy (100 − width) sang đơn vị đó.
          transform: `translateX(${(view.pos * (100 - width) * 100) / width}%)`,
        }}
      />
    </div>
  );
}
