"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Search, Star, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/site/section-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { coverUrl } from "@/lib/place-image";
import { Rail } from "@/components/site/rail";
import { RiseInView } from "@/components/site/reveal";

export type DestItem = {
  slug: string;
  name: string;
  tagline: string | null;
  isFeatured: boolean;
  viewCount: number;
  images: { url: string; isCover: boolean }[];
  parentName: string | null;
  region: string;
  counts: { spot: number; eatery: number; stay: number; activity: number };
};

export type ProvinceItem = {
  slug: string;
  name: string;
  region: string;
  isFeatured: boolean;
  childCount: number;
  hasContent: boolean;
};

type SortKey = "featured" | "popular" | "az";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Nổi bật" },
  { key: "popular", label: "Phổ biến" },
  { key: "az", label: "A → Z" },
];

// Cùng khuôn chữ "micro" với StayDirectory/FoodMenu: nhãn trên thẻ và nhãn đầu
// khối đều là chữ hoa nhỏ giãn ký tự, để mọi lưới thẻ trong site đọc ra cùng
// một giọng.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// THANG BO GÓC CỦA RIÊNG TRANG NÀY — cố ý lệch khỏi thang chung trong
// `globals.css` (card mặc định 16px, nút `rounded-full`).
//
// Thẻ điểm đến ở đây là POSTER: một khối ảnh chữ nhật, mép cắt thẳng, xếp thành
// dải như trang catalogue in. Góc bo dù chỉ 12px cũng kéo nó về phía "thẻ giao
// diện". Nhưng khi thẻ đã vuông thì mọi viên thuốc còn lại trong thanh lọc
// (ô tìm kiếm, chip tỉnh, nhóm sắp xếp) trở thành thứ lạc điệu duy nhất trên
// trang — nên chúng đi theo, chỉ giữ 3px để cạnh không cứa mắt ở cỡ nhỏ.
//   3px  điều khiển còn lại: chip tỉnh, nút, ô icon — viết thẳng
//        `rounded-[3px]` tại chỗ dùng;
//   0    khối lớn (thẻ, huy hiệu trên ảnh) và cả thanh lọc dính — vuông hẳn.
// (Từng có một hằng `EDGE` cho 3px; bỏ đi khi thanh lọc chuyển sang toàn nét
// mảnh và không còn góc nào để bo.)

// Bỏ dấu để tìm kiếm không phân biệt dấu/hoa thường.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

// Nhãn miền rút gọn cho nav.
function shortRegion(label: string): string {
  if (label === "Miền Trung & Tây Nguyên") return "Trung";
  return label.replace(/^Miền\s+/, "");
}

function sortItems(items: DestItem[], key: SortKey): DestItem[] {
  const byName = (a: DestItem, b: DestItem) => a.name.localeCompare(b.name, "vi");
  return [...items].sort((a, b) => {
    if (key === "az") return byName(a, b);
    if (key === "popular") return b.viewCount - a.viewCount || byName(a, b);
    // featured
    return (
      Number(b.isFeatured) - Number(a.isFeatured) ||
      b.viewCount - a.viewCount ||
      byName(a, b)
    );
  });
}

// Điểm đến trình bày theo MIỀN, mỗi miền một rail cuộn ngang (kiểu app du lịch)
// rồi tới danh sách tỉnh của miền đó. region đã tính sẵn ở server; còn tìm kiếm
// + sắp xếp.
export function DestinationFilter({
  items,
  provinces,
  regions,
}: {
  items: DestItem[];
  provinces: ProvinceItem[];
  regions: string[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  // -1 = chưa xác định (không tô miền nào) → tránh nháy về miền đầu trước khi
  // biết vị trí cuộn thật khi tải lại trang.
  // Khi bấm chọn miền, scroll mượt đi ngang qua các miền giữa → khóa scroll-spy
  // vào miền đích để nav không nhấp nháy qua miền trung gian.

  // Viên sáng trượt của nav miền: đo từ chính nút đang chọn thay vì ép mọi nút
  // bằng bề rộng nhau. `null` khi chưa đo được (lần render đầu, hoặc chưa xác
  // định miền) — lúc đó không vẽ viên nào, nên nó không bao giờ trượt từ mép
  // trái vào chỗ đúng khi mới tải trang.

  const q = norm(query);
  const matches = (d: DestItem) =>
    !q ||
    norm(d.name).includes(q) ||
    (d.parentName ? norm(d.parentName).includes(q) : false);

  // Mỗi miền: rail điểm đến + danh sách tỉnh (ẩn tỉnh khi đang tìm kiếm).
  // Tỉnh tách làm hai: đã có nội dung (chip bấm được) và đang cập nhật. Trước
  // đây hai loại trộn chung theo bảng chữ cái, nên trong một dải 25 chip thì
  // chip bấm được và chip xám nằm xen kẽ ngẫu nhiên — người lướt không đọc ra
  // được cái nào đi tới đâu. Tách ra thì phần bấm được đứng thành một khối.
  const sections = regions
    .map((r) => {
      const provs = q ? [] : provinces.filter((p) => p.region === r);
      return {
        label: r,
        dests: sortItems(
          items.filter((d) => d.region === r && matches(d)),
          sort,
        ),
        provsOpen: provs.filter((p) => p.hasContent),
        provsSoon: provs.filter((p) => !p.hasContent),
        provCount: provs.length,
      };
    })
    .filter((g) => g.dests.length > 0 || g.provCount > 0);


  return (
    <div>
      {/* THANH ĐIỀU KHIỂN DÍNH — miền · tìm kiếm · sắp xếp.
          Bắc / Trung / Nam là TRỤC DUYỆT CHÍNH: nội dung bên dưới xếp theo
          miền, và "ra bắc hay vào nam" là câu hỏi đầu tiên của người đang chọn
          nơi đi. Nên nó phải là thứ nhìn thấy trước nhất trong thanh, và ở đây
          nó là thứ DUY NHẤT có mảng màu đặc.

          BA HÌNH, BA VAI — không hình nào lặp lại hình nào:
          · miền = ô nền MỰC trượt giữa ba nhãn. Nét gạch chân của bản trước quá
            mảnh cho một trục chính (và trùng hình với gạch chân của nav header
            ngay phía trên); ô đặc thì nhìn thấy từ xa, còn chuyển động trượt
            vẫn giữ nguyên nghĩa "bạn đang ở đâu";
          · tìm kiếm = ô viền mảnh rộng hết chỗ còn lại — thao tác thật sự hay
            dùng trong nhóm tinh chỉnh;
          · sắp xếp = MỘT nút viền mảnh mở menu, thu về đúng bề ngang nhãn đang
            chọn.
          Hai cái sau dùng chung vật liệu với cặp nút ‹ › của rail: cả trang chỉ
          có nền MỰC (thứ đang chọn) và VIỀN HAIRLINE (mọi thứ còn lại). Đã bỏ khung hairline + con dấu nền mực của bản trước:
            khi miền đã dùng mảng đặc thì đây phải nhẹ hẳn đi, nếu không hai
            khối đen trong một thanh mảnh sẽ tranh nhau.

          Đã bỏ số điểm đến sau tên miền — thanh này để ĐI, không phải để đọc
          thống kê; con số vẫn còn ở tiêu đề từng miền ngay bên dưới. */}
      {/* MÉP DƯỚI: một hairline RẤT NHẠT (`border/40`), không phải nét đầy.
          Đây là nét ngang thứ ba xếp chồng trong vòng 100px (đáy header, đáy
          dải hero, rồi đáy thanh), nên nét đầy `border-border` đọc ra thành mấy
          tầng gạch đầu trang — nhưng bỏ hẳn thì lúc thẻ ảnh trôi qua sau thanh,
          mép dưới biến mất và chữ trong thanh nhìn như lơ lửng trên ảnh. 40% là
          mức vừa đủ để có một ranh giới mà không thành một đường kẻ.
          Cũng đã thử và bỏ một dải chuyển sắc cao 1.5rem đổ ra ngoài đáy thanh:
          mềm hơn hairline, nhưng nó là một vật thêm vào một trang hiện chỉ có
          nét và chữ. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/40 bg-background/90 backdrop-blur sm:-mx-6 lg:top-16">
        <div className="flex flex-col gap-1.5 px-4 py-2 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
          {/* MIỀN — nhóm chính. */}
          <div className="-mx-1 flex items-center overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:shrink-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <SectionTabs
              labels={sections.map((g) => shortRegion(g.label))}
              idPrefix="mien"
              ariaLabel="Chuyển nhanh theo miền"
              resetKey={`${query}|${sort}`}
              indicator="solid"
              // Ô mực VUÔNG, theo ngôn ngữ hình của cả trang (thẻ điểm đến,
              // hai lối rẽ trên hero đều mép thẳng). Mặc định của SectionTabs
              // là `rounded-full` cho các trang còn lại.
              shapeClassName="rounded-none"
              tabClassName={cn(MICRO, "h-9 px-4 sm:px-5")}
            />
          </div>

          {/* Tìm kiếm + sắp xếp — nhóm phụ, dạt về mép phải. */}
          <div className="ml-auto flex min-w-0 items-center gap-4 sm:gap-6">
            {/* TÌM KIẾM — VIỀN MẢNH, NỀN TRONG SUỐT, mép vuông.
                Cùng vật liệu với cặp nút ‹ › của rail ngay bên dưới, nên toàn
                trang chỉ còn hai kiểu điều khiển: nền MỰC cho thứ đang được
                chọn (ô miền), viền hairline cho mọi thứ còn lại.
                Bản nền xám trước đó tạo ra kiểu thứ ba, mà xám lại là màu của
                nền trang nên hai ô ấy trông như hai lỗ khoét trên thanh.
                Focus thì viền đậm lên thành màu mực — không cần thêm vòng
                `ring` nào.
                Rộng hết chỗ còn lại: trong hai thao tác tinh chỉnh thì đây là
                cái người ta dùng thật, gõ vài chữ để nhảy thẳng tới một nơi. */}
            <div className="group relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm điểm đến…"
                aria-label="Tìm điểm đến"
                className="h-9 w-full border border-border bg-transparent pl-8 pr-8 text-[0.8125rem] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-foreground [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>

            {/* SẮP XẾP — một nút mở menu, không phải ba nhãn bày sẵn.
                Ba nhãn cạnh nhau chiếm ~200px vĩnh viễn trong một thanh chật,
                cho một thao tác mà phần lớn người dùng không đụng tới lần nào;
                mà chúng lại cùng vật liệu nền xám với ô tìm kiếm ngay bên cạnh
                nên hai nhóm đọc ra như một khối điều khiển bốn ô.
                Nút này thu về đúng bề ngang của nhãn đang chọn — vẫn nói được
                danh sách đang xếp theo gì, và chỉ bung ra khi người ta thật sự
                muốn đổi. Cùng viền mảnh mép vuông với ô tìm kiếm bên cạnh. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Sắp xếp: ${SORTS.find((x) => x.key === sort)?.label}`}
                  className="inline-flex h-9 shrink-0 items-center gap-2 border border-border bg-transparent px-3 text-[0.8125rem] font-medium transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none"
                >
                  {SORTS.find((x) => x.key === sort)?.label}
                  <ChevronDown
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[9rem]">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v) => setSort(v as SortKey)}
                >
                  {/* Bỏ chấm tròn đánh dấu mục đang chọn (`ItemIndicator` mặc
                      định của shadcn) — ẩn ô chứa nó và thu lại phần đệm trái
                      vốn chừa chỗ cho nó. Mục đang chọn nhận ra bằng NÉT CHỮ:
                      đậm và về màu mực, ba mục còn lại nhạt. Cùng cách đánh dấu
                      với nhãn miền và mọi điều khiển khác trên trang, nên không
                      phải học thêm một ký hiệu nào.
                      Vẫn là `RadioItem`, nên vai trò (`menuitemradio`), trạng
                      thái `aria-checked` và điều hướng bàn phím giữ nguyên. */}
                  {SORTS.map((s) => (
                    <DropdownMenuRadioItem
                      key={s.key}
                      value={s.key}
                      className={cn(
                        "pl-2 [&>span:first-child]:hidden",
                        sort === s.key
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span
            aria-hidden
            className="grid size-12 place-items-center rounded-[3px] bg-muted text-muted-foreground"
          >
            <Search className="size-5" />
          </span>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Không tìm thấy điểm đến nào
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thử một tên khác, hoặc tên tỉnh chứa điểm đến đó.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-5 inline-flex h-9 items-center rounded-[3px] border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-16 sm:space-y-20">
          {sections.map((g, i) => {
            const heading = (
              <RiseInView distance={14}>
              <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.25rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                {g.label}
              </h2>
              </RiseInView>
            );
            return (
            <section
              key={g.label}
              id={`mien-${i}`}
              // scroll-mt = chiều cao thanh dính (2 hàng dưới sm, 1 hàng từ sm)
              // cộng header 4rem từ lg — thiếu thì tiêu đề miền chui xuống dưới
              // thanh khi bấm chuyển nhanh.
              className="group/mien scroll-mt-28 sm:scroll-mt-20 lg:scroll-mt-32"
            >
              {/* TIÊU ĐỀ MIỀN — cùng họ chữ với "VIỆT NAM" trên dải hero:
                  serif, nét thường, chữ hoa, giãn ký tự. Hai cấp tên địa lý của
                  trang (tên nước ở bìa, tên miền mở từng chương) vì thế đọc ra
                  là một hệ, còn font sans đậm thì để dành cho tên NƠI trên từng
                  thẻ — ba tầng phân biệt được ngay bằng kiểu chữ.
                  Cỡ nhỏ hơn hẳn bản sans cũ (2.75rem → 2rem): chữ hoa giãn ký
                  tự chiếm bề ngang gấp rưỡi, mà "Miền Trung & Tây Nguyên" là
                  một tên dài.

                  ĐÃ BỎ dòng thống kê đứng cạnh ("12 điểm đến · 25 tỉnh thành").
                  Nó là con số về CHÍNH THỨ ĐANG NẰM NGAY DƯỚI — người đọc thấy
                  dải thẻ và danh sách tỉnh ngay sau đó, đếm giùm họ chỉ thêm
                  một dòng chữ phải đọc. Cũng đã bỏ vạch kẻ ngang từng nối tên
                  miền tới con số ấy, vì lý do cũ vẫn đúng: trang này vốn đã có
                  hai đường ngang bắt buộc, thêm một vạch cho MỖI miền nữa là cứ
                  vài trăm pixel lại một nét cắt ngang.

                  Tiêu đề đi VÀO TRONG `Rail` khi miền có điểm đến, để thanh
                  tiến trình đứng được cùng hàng với nó ở mép phải (xem
                  `rail.tsx`). Miền chưa có điểm đến nào thì không có rail, tiêu
                  đề đứng một mình. */}
              {g.dests.length > 0 ? (
                // RAIL NỞ RA KHI RÊ VÀO — bằng `clip-path`, KHÔNG phải margin.
                //
                // Lúc nghỉ dải thẻ nhìn như nằm gọn trong cột nội dung; đưa
                // chuột vào thì vùng nhìn thấy mở ra tới cách mép khung nhìn
                // 2rem, để lộ thêm thẻ kế tiếp. Thẻ KHÔNG to ra, không dịch đi
                // một pixel nào — chỉ có tấm màn che hai bên rút lại.
                //
                // Vì sao không dùng margin (bản đầu, và nó GIẬT thấy rõ): đổi
                // `margin` là đổi LAYOUT, nên mỗi khung hình trình duyệt phải
                // tính lại vị trí toàn bộ dải thẻ, và embla phải đo lại khung
                // của nó. `clip-path` thì không đụng tới layout — khối vẫn rộng
                // nguyên như vậy suốt, chỉ phần nhìn thấy được thay đổi.
                //
                // Cơ chế: khối LUÔN tràn ra hai bên đúng `--bleed` (margin âm,
                // tĩnh), rồi `clip-path` trên KHUNG CẮT của carousel giấu phần
                // thừa đi; hover thì màn mở và khung trượt sang trái.
                //
                // Màn đặt trên khung cắt chứ KHÔNG trên khối ngoài: khối ngoài
                // bao cả hàng tiêu đề, mà hàng đó có cặp nút ‹ › nằm sát mép
                // phải — cắt ở đúng lề cột nội dung là xén mất viền của chúng.
                // Đặt xuống một tầng thì hàng tiêu đề tự do, chỉ dải thẻ bị che.
                //
                // Mấu chốt để tràn được cả bên TRÁI mà thẻ đầu không bị xén
                // cụt: dải thẻ có một padding trái TĨNH bằng đúng `--bleed`
                // (xem `contentClassName` bên dưới). Bản trước thiếu nó nên chỉ
                // dám tràn một bên.
                // `--bleed` khai bằng `style` chứ không nhét thẳng vào class:
                // biểu thức có `calc(… - …)` cần dấu cách quanh toán tử, mà
                // trong giá trị tuỳ ý của Tailwind thì dấu cách phải viết thành
                // `_` — dễ sai và khó đọc lại.
                //
                // VÙNG NHẬN HOVER LÀ CẢ MIỀN, không phải riêng dải thẻ: cờ
                // `group/mien` nằm trên chính thẻ `<section>`, nên rê vào tiêu
                // đề, vào khoảng trống quanh thẻ, hay xuống tận danh sách tỉnh
                // thành đều giữ màn mở. Đã thử bản hẹp hơn (chỉ dải thẻ, cộng
                // 2rem đệm dọc): ở rìa vùng đó hiệu ứng chớp tắt theo từng
                // pixel chuột, vì người ta hay đưa chuột tới từ phía tiêu đề
                // hoặc từ dưới lên.
                //
                // Mũi tên ‹ › neo theo mép khối rộng nên lúc nghỉ chúng nằm
                // trong vùng bị cắt; không sao, vì chúng chỉ hiện khi rê vào
                // rail, mà lúc đó tấm màn đã mở.
                //
                // Chỉ từ `xl`: hẹp hơn thế thì cột nội dung đã gần bằng khung
                // nhìn, có nở cũng không thêm được pixel nào. Máy cảm ứng không
                // có hover nên không bao giờ thấy hiệu ứng này — đúng ý: ở đó
                // vuốt là thao tác tự nhiên và thẻ đã chiếm gần hết bề ngang.
                <div
                  style={
                    {
                      "--bleed": "max(0px, calc(50vw - 45rem - 0.5rem))",
                    } as React.CSSProperties
                  }
                  className="group/bleed xl:mx-[calc(-1*var(--bleed))]"
                >
                <Rail
                  heading={heading}
                  // Số điểm đến đứng CHUNG KHUNG với thanh tiến trình và cặp
                  // nút, không phải nép cạnh tiêu đề nữa. Cả ba nói về đúng một
                  // thứ — dải thẻ này dài bao nhiêu, đang ở đâu, đi tiếp thế
                  // nào — nên gom lại thành một vật thì đọc ra ngay là bộ điều
                  // khiển của dải; tách ra ba chỗ thì mỗi cái phải tự giải
                  // thích mình là gì.
                  meta={
                    <span className={cn(MICRO, "text-muted-foreground")}>
                      <span className="text-foreground tabular-nums">
                        {g.dests.length}
                      </span>{" "}
                      điểm đến
                    </span>
                  }
                  // Hàng tiêu đề (tên miền ở mép trái, thanh tiến trình ở mép
                  // phải) nằm trong khối đã tràn ra hai bên, nên cần một padding
                  // TĨNH kéo cả hai về đúng lề cột nội dung. Tĩnh, nên chúng
                  // đứng yên khi tấm màn mở ra — thứ động duy nhất là dải thẻ.
                  headingClassName="xl:px-[var(--bleed)]"
                  // Dải thẻ cũng lùi vào đúng lề bằng padding tĩnh, KHÔNG phải
                  // bằng clip: nhờ vậy ở vị trí đầu dải, thẻ số 1 thẳng hàng
                  // với tiêu đề; còn khi đã cuộn, những thẻ trước đó trôi vào
                  // đúng vùng padding này và bị `clip-path` che — mở màn ra là
                  // chúng lộ ra. Đó là lý do hiệu ứng có nghĩa ở CẢ HAI bên:
                  // bên phải cho thẻ sắp tới, bên trái cho thẻ vừa đi qua.
                  contentClassName="xl:pl-[var(--bleed)]"
                  // KHI MÀN MỞ, CẢ DẢI TRƯỢT SANG TRÁI đúng `--bleed`: thẻ đầu
                  // rời lề cột nội dung và chạy ra tận mép vùng vừa mở. Không
                  // có bước này thì lúc đang ở đầu dải, mở màn chỉ để lộ một
                  // khoảng trống bên trái — phần đệm `pl` — trông như rail bị
                  // thụt vào.
                  //
                  // Trượt bằng `translate` (compositor, không đụng layout, embla
                  // không phải đo lại) và áp lên chính KHUNG CẮT của carousel.
                  // Khung đó được nới thêm `--bleed` về bên phải (`mr` âm) đúng
                  // bằng quãng nó sắp trượt đi — nếu không, trượt xong mép phải
                  // khung sẽ tụt vào trong vùng đang nhìn và để hở một dải trống
                  // ở đó.
                  viewportClassName="transition-[clip-path,translate] duration-500 ease-out motion-reduce:transition-none xl:mr-[calc(-1*var(--bleed))] xl:[clip-path:inset(0_calc(2*var(--bleed))_0_var(--bleed))] xl:group-hover/mien:-translate-x-[var(--bleed)] xl:group-hover/mien:[clip-path:inset(0_0_0_var(--bleed))]"
                  itemClassName="basis-[86%] sm:basis-[60%] lg:basis-[44%] xl:basis-[27rem]"
                  // Miền có thể có tới 14 điểm đến, mà rail thì không nói gì
                  // về độ dài của chính nó — mũi tên ‹ › chỉ có trên máy có
                  // chuột, và cũng chỉ cho biết "còn nữa hay hết".
                  progress
                >
                  {g.dests.map((d, di) => (
                    // Lệch pha theo vị trí trong dải, nhưng CHẶN Ở 4 thẻ đầu:
                    // miền có 14 điểm đến mà nhân đều thì thẻ cuối đợi hơn một
                    // giây — trong khi nó nằm ngoài khung nhìn, không ai thấy
                    // nó chạy. Bốn thẻ đầu là đúng số thẻ lọt vào màn.
                    <RiseInView key={d.slug} delay={Math.min(di, 3) * 0.07}>
                      <DestCard d={d} />
                    </RiseInView>
                  ))}
                </Rail>
                </div>
              ) : (
                heading
              )}

              {g.provCount > 0 && (
                <div className="mt-8">
                  <p className={cn(MICRO, "text-muted-foreground")}>
                    Tỉnh thành
                  </p>

                  {g.provsOpen.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.provsOpen.map((p) => (
                        <ProvinceChip key={p.slug} p={p} />
                      ))}
                    </div>
                  )}

                  {/* Tỉnh chưa có nội dung KHÔNG còn là chip. Chip là hình của
                      một thứ bấm được; 14 viên gạch nét đứt không bấm được thì
                      chỉ làm nặng khối mà không dẫn đi đâu. Ở đây chúng về đúng
                      vai trò: một dòng ghi chú, đọc được, không mời bấm.
                      Ngăn bằng DẤU PHẨY, không phải dấu chấm giữa: đây là một
                      dòng văn liệt kê, mà dấu phẩy mới là thứ tiếng Việt dùng
                      để liệt kê trong câu. Dấu chấm giữa hợp với chỗ nối các
                      mẩu thông tin RỜI (kiểu "3 giờ · 120km"), không hợp với
                      một chuỗi tên đọc liền mạch. */}
                  {g.provsSoon.length > 0 && (
                    <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground/70">
                      <span
                        className={cn(MICRO, "mr-2 text-muted-foreground/60")}
                      >
                        Đang cập nhật
                      </span>
                      {g.provsSoon.map((p) => p.name).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProvinceChip({ p }: { p: ProvinceItem }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-card py-1.5 pl-3.5 pr-3 text-sm font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      {p.isFeatured && (
        <Star className="size-3.5 shrink-0 text-warm" aria-hidden />
      )}
      {p.name}
      {p.childCount >= 2 ? (
        <span
          aria-label={`${p.childCount} điểm đến`}
          className="grid h-4 min-w-4 place-items-center rounded-[2px] bg-primary/10 px-1 text-[10px] font-semibold tabular-nums text-primary"
        >
          {p.childCount}
        </span>
      ) : (
        // Giữ lề phải bằng nhau giữa chip có số và chip không — không có ô này
        // thì hai loại chip lệch nhau 4px, nhìn ra ngay khi chúng đứng cạnh.
        <span aria-hidden className="w-0.5" />
      )}
    </Link>
  );
}

// Bốn dữ kiện ở đáy thẻ. Chỉ hiện cái > 0 và giữ đúng thứ tự người ta hỏi khi
// đang CHỌN NƠI: xem gì → ăn gì → ở đâu → làm gì. Số đếm lấy thẳng từ DB nên
// không bao giờ lệch với nội dung thật, khác hẳn một câu văn xuôi phải bảo trì.
const FACTS: { key: keyof DestItem["counts"]; label: string }[] = [
  { key: "spot", label: "địa điểm" },
  { key: "eatery", label: "quán ăn" },
  { key: "stay", label: "chỗ ở" },
  { key: "activity", label: "trải nghiệm" },
];

// Thẻ điểm đến — MỘT KHUÔN ẢNH NGANG, mọi thứ nằm trong đó.
//
// Khuôn poster kiểu catalogue lữ hành: ảnh 3/2, tên nơi đặt GIỮA khung, và một
// bảng dữ kiện hai cột ở đáy. Khác hẳn kiểu "chữ dồn một góc" của bản dọc
// trước đây — ở đây tên nơi là tâm của thẻ đúng nghĩa đen, còn con số thì xếp
// thành bảng nên so sánh được giữa thẻ này với thẻ kia mà không phải đọc câu.
//
// BA QUYẾT ĐỊNH DỄ BỊ "SỬA NHẦM" VỀ SAU:
//   1. Tên nơi để `font-normal`, KHÔNG đậm. Cỡ đã lớn (~28px) và nằm trên nền
//      tối nên đậm thêm chỉ làm nó nặng; nét mảnh mới ra được giọng catalogue.
//   2. Lớp phủ tối ĐỀU CẢ KHUNG (không phải gradient tắt ở 72% như bản dọc):
//      chữ nay nằm giữa ảnh chứ không nấp ở đáy, nên chỗ nào cũng phải đọc được.
//      Bù lại nền đáy được đậm thêm một nấc cho bảng dữ kiện nổi lên.
//   3. Huy hiệu là viên TRẮNG ĐỤC ở góc trên phải — cố ý ngược chất liệu với
//      chữ trắng trên ảnh tối, nhờ vậy nó đọc ra là một con tem dán lên poster
//      chứ không phải một dòng chữ nữa của thẻ.
function DestCard({ d }: { d: DestItem }) {
  // Chỉ giữ ô có số, DỒN LÊN TRƯỚC — nếu để nguyên bốn khe cố định thì một nơi
  // có đúng "địa điểm" và "trải nghiệm" (Tà Xùa) sẽ ra hai ô nằm chéo góc nhau.
  const facts = FACTS.filter((f) => d.counts[f.key] > 0);
  // …rồi bù cho đủ BỐN khe bằng ô vô hình. Bảng đáy vì thế luôn cao đúng hai
  // hàng, kể cả ở nơi chưa có nội dung nào (hiện là 29/31 điểm đến) — nhờ vậy
  // tên nơi của mọi thẻ trong một hàng nằm trên cùng một đường. Bản đầu tiên
  // ẩn hẳn bảng khi rỗng, và cả hàng ba thẻ ra ba độ cao tên khác nhau.
  const blanks = FACTS.length - facts.length;

  return (
    <Link
      href={`/diem-den/${d.slug}`}
      className="group relative block aspect-[3/2] overflow-hidden bg-muted"
    >
      <Image
        src={coverUrl(d.images, d.slug, 900, 600)}
        alt=""
        fill
        sizes="(min-width: 1280px) 31vw, (min-width: 1024px) 44vw, (min-width: 640px) 60vw, 86vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
      />

      {/* Tối đều để chữ đọc được, đậm dần xuống đáy cho bảng dữ kiện.
          LÚC NGHỈ CHỈ ĐỔ 72% lớp này (≈0.43 ở đáy, ≈0.32 ở đỉnh) — thẻ sáng,
          ảnh gần như nguyên vẹn; RÊ VÀO thì lên 100% và thẻ tối lại. Chiều này
          ngược với bản trước (nghỉ đậm, hover nhạt đi 10%), và đây mới là chiều
          đúng: lúc lướt qua cả dải thì ảnh là thứ đáng xem, còn khi đã dừng ở
          một thẻ thì chữ trên nó mới là thứ cần đọc.
          Giữ gradient ở mức đậm rồi hạ bằng `opacity` chứ không viết sẵn hai bộ
          màu: `opacity` chạy trên compositor nên chuyển mượt, mà `background`
          thì không transition được. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0.6)_26%,rgba(0,0,0,0.5)_52%,rgba(0,0,0,0.44)_100%)] opacity-[0.72] transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12"
      />

      {d.isFeatured && (
        // Chỉ ~1/3 số điểm đến có, nên nó còn phân biệt được thẻ này với thẻ
        // kia. Góc TRÊN–PHẢI một mình, đối diện chỗ trống bên trái.
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 bg-white/95 py-1 pl-2 pr-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm">
          {/* Mã màu viết thẳng, KHÔNG dùng `warm-ink`: viên huy hiệu là nền
              TRẮNG cố định ở cả hai theme (giống tone `photo` của CtaButton),
              trong khi `--warm-ink` lật thành cam sáng #ff9a1f trong `.dark` —
              trên nền trắng nó nhạt đi thấy rõ. */}
          <Star className="size-3 shrink-0 text-[#a34c00]" aria-hidden />
          Nổi bật
        </span>
      )}

      <span className="absolute inset-0 flex flex-col p-4 sm:p-5">
        {/* Khối giữa. `flex-1` + `justify-center` nên tên luôn nằm giữa phần
            khung CÒN LẠI sau khi trừ bảng đáy — thẻ có 2 ô hay 4 ô dữ kiện thì
            tên vẫn ở đúng tâm quang học, không phải canh bằng số đo cứng. */}
        {/* `pt-6` chừa đúng vùng huy hiệu góc trên phải. Ở khổ 320px thẻ chỉ
            cao ~165px, khối chữ gần như lấp kín phần giữa nên dòng tỉnh cha
            trồi lên sát đỉnh và CHUI THẲNG VÀO DƯỚI huy hiệu. Vì khối căn
            giữa nên padding này cũng đẩy tên xuống dưới tâm một chút — đúng
            chỗ mắt vẫn quen thấy tên trên poster. */}
        <span className="flex flex-1 flex-col items-center justify-center px-2 pt-6 text-center">
          {/* Tỉnh cha đứng TRÊN tên — mắt đọc "ở đâu → nơi nào", đúng thứ tự
              người ta hỏi. Chữ NGHIÊNG, chữ thường, không icon: nó là một lời
              chú chứ không phải một nhãn phân loại, nên không mang hình của
              chip/huy hiệu như mọi nhãn khác trong site.
              Mali (--font-rounded) chưa nạp bản nghiêng thật nên đây là nghiêng
              giả của trình duyệt — ở cỡ 13px trên nền tối thì không nhìn ra
              khác biệt, và nạp thêm 2 file font cho một dòng chú thì không đáng. */}
          {d.parentName && (
            <span className="max-w-full truncate font-[family-name:var(--font-rounded)] text-[0.8125rem] italic text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
              {d.parentName}
            </span>
          )}

          <span className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-normal leading-[1.18] tracking-[-0.015em] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] sm:text-[1.5rem] lg:text-[1.7rem]">
            {d.name}
          </span>

          {d.tagline && (
            // HAI dòng, 15px — thứ duy nhất trên thẻ mang giọng biên tập, nên
            // nó phải đọc được chứ không chỉ có mặt. Bản trước là một dòng 13px
            // `white/70`: hầu hết tagline dài hơn thế nên câu nào cũng cụt giữa
            // chừng, mà cỡ ấy trên nền ảnh thì phải nhìn kỹ mới ra chữ.
            // ẨN dưới `sm`: ở đó thẻ hẹp tới mức câu bị cắt ngay sau mấy chữ
            // đầu ("Tạm rời xa nhịp sống vội vã để…") — không nói được gì mà
            // vẫn ăn nguyên một dòng của khối chữ vốn đã chật.
            <span className="mt-2 line-clamp-2 max-w-[94%] text-[0.9375rem] leading-snug text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.75)] max-sm:hidden">
              {d.tagline}
            </span>
          )}
        </span>

        {/* Bảng dữ kiện: hai cột, mỗi ô có hairline TRÊN. Hairline (không phải
            viền quanh ô) là thứ khiến bốn con số đọc ra thành một bảng chứ
            không phải bốn viên chip rời. */}
        <span className="grid grid-cols-2 gap-x-5 sm:gap-x-8">
          {facts.map((f) => (
            <span
              key={f.key}
              className="mt-2 border-t border-white/30 pt-1.5 text-[0.75rem] leading-tight text-white/75 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]"
            >
              <span className="font-semibold tabular-nums text-white">
                {d.counts[f.key]}
              </span>{" "}
              {f.label}
            </span>
          ))}
          {/* Ô giữ chỗ: `invisible` chiếm đúng chỗ trong lưới nhưng không vẽ gì
              và cũng biến khỏi cây trợ năng — trình đọc màn hình không gặp một
              ô rỗng nào. KHÔNG có hairline: một nét kẻ không có chữ dưới nó chỉ
              là một vệt lửng lơ trên ảnh. */}
          {Array.from({ length: blanks }, (_, i) => (
            <span
              key={`blank-${i}`}
              aria-hidden
              className="invisible mt-2 pt-1.5 text-[0.75rem] leading-tight"
            >
              &nbsp;
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
}
