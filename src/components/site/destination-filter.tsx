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
  /** Chỉ có ở thẻ dựng từ một TỈNH — xem `provinceAsCard`. */
  isProvince?: boolean;
  /** Số điểm đến trong tỉnh (chỉ dùng cho thẻ tỉnh). */
  childCount?: number;
  /** Tên vài nơi trong tỉnh — điểm đến con trước, địa điểm sau. */
  childNames?: string[];
  /** Tổng số nơi trong tỉnh (để biết còn bao nhiêu cái chưa nêu tên). */
  childTotal?: number;
};

export type ProvinceItem = {
  slug: string;
  name: string;
  region: string;
  isFeatured: boolean;
  /** "Tỉnh này tự nó là một điểm đến" — xem `Place.treatAsDestination`. */
  treatAsDestination: boolean;
  childCount: number;
  childNames: string[];
  /** Tổng số điểm đến con + địa điểm trong tỉnh. */
  childTotal: number;
  hasContent: boolean;
  tagline: string | null;
  viewCount: number;
  images: { url: string; isCover: boolean }[];
  counts: { spot: number; eatery: number; stay: number; activity: number };
};

// Một TỈNH được gắn cờ `treatAsDestination` cũng lên dải thẻ, đứng chung với
// các điểm đến của miền.
//
// Cờ đó, KHÔNG PHẢI `isFeatured`, mới là câu trả lời đúng cho "tỉnh này có tự
// đứng thành một chuyến đi không". Bản đầu mượn `isFeatured` và sai ngay ở dữ
// liệu thật: Quảng Ninh đang nổi bật vì nó CHỨA Hạ Long, chứ bản thân nó không
// phải nơi người ta đặt vé tới.
//
// Vì sao đứng chung mà không phải một dải riêng: với người đang chọn nơi đi,
// "Hà Giang" và "Sa Pa" là hai lựa chọn NGANG HÀNG — cái nào cũng là một chuyến
// đi. Ranh giới tỉnh/điểm đến là chuyện của mô hình dữ liệu, không phải chuyện
// của họ. Thẻ tự nói mình là tỉnh bằng nhãn ở góc trên, thế là đủ.
//
// Tỉnh nổi bật VẪN CÒN trong dải chip bên dưới: chip là danh sách ĐẦY ĐỦ các
// tỉnh của miền, thiếu một cái thì người đang dò theo bảng chữ cái sẽ tưởng nó
// không tồn tại. Hai chỗ, hai việc — dải thẻ để mời, chip để tra.
function provinceAsCard(p: ProvinceItem): DestItem {
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    isFeatured: p.isFeatured,
    viewCount: p.viewCount,
    images: p.images,
    // Tỉnh là node gốc, không có nơi nào ở trên nó để ghi.
    parentName: null,
    region: p.region,
    counts: p.counts,
    isProvince: true,
    childCount: p.childCount,
    childNames: p.childNames,
    childTotal: p.childTotal,
  };
}

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
      const provCards = provinces
        .filter((p) => p.region === r && p.treatAsDestination)
        .map(provinceAsCard)
        .filter(matches);
      return {
        label: r,
        dests: sortItems(
          [...items.filter((d) => d.region === r && matches(d)), ...provCards],
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
                      // Quãng nở của dải, chặn bởi HAI thứ:
                      //   1. chỗ trống thật giữa cột nội dung và mép khung nhìn
                      //      (`50vw - 45rem - 0.5rem`);
                      //   2. lượng NỘI DUNG CÒN ẨN của chính dải này, chia đôi
                      //      cho hai bên: `(số thẻ × 27rem − 90rem) / 2`.
                      // Vế 2 mới là vế quan trọng ở màn rất rộng. Trước đó chỉ
                      // có vế 1, nên trên màn 2560px dải nở ra 552px mỗi bên
                      // trong khi một miền bốn thẻ chỉ có 288px nội dung thừa —
                      // mở xong thì hở nguyên một mảng trắng bên phải. Nay nở
                      // đúng bằng phần còn giấu được: bốn thẻ nở 144px mỗi bên,
                      // ba thẻ (nội dung hẹp hơn cột) ra số âm → `max(0px, …)`
                      // ghim về 0 và dải không nở gì cả, đúng như nó nên thế.
                      // 27rem là bề rộng thẻ, 90rem là `max-w-7xl` của trang —
                      // đổi một trong hai thì phải đổi ở đây.
                      "--bleed":
                        "max(0px, min(calc(50vw - 45rem - 0.5rem), calc((var(--items) * 27rem - 90rem) / 2)))",
                      "--items": String(g.dests.length),
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
                  // Từ `xl` bề rộng thẻ là SỐ CỐ ĐỊNH (27rem), không phải
                  // phần trăm. Đây là điều kiện để khối nở ra mà thẻ KHÔNG to
                  // theo: bề rộng tính bằng phần trăm thì mỗi lần khối giãn là
                  // mọi thẻ phình ra và người đọc vẫn thấy đúng bấy nhiêu thẻ.
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
  // Thẻ tỉnh: số điểm đến trong tỉnh đứng ĐẦU bảng — đó là thứ đầu tiên người
  // ta muốn biết về một tỉnh ("trong đó có những đâu"), trước cả số quán ăn hay
  // chỗ ở gắn thẳng vào tỉnh.
  // BẢNG ĐÁY THẺ nói hai thứ khác nhau tuỳ loại nơi:
  //   · ĐIỂM ĐẾN → bốn con số (địa điểm · quán ăn · chỗ ở · trải nghiệm), vì
  //     một điểm đến là một nơi cụ thể, thứ đáng biết là trong đó có bao nhiêu
  //     thứ để làm;
  //   · TỈNH → TÊN các điểm đến bên trong, vì một tỉnh là một cái túi chứa
  //     nhiều nơi, và câu hỏi đầu tiên đúng là "trong đó có những đâu". Đếm
  //     "3 điểm đến" thì vẫn phải bấm vào mới biết là những đâu.
  // Cả hai dùng CHUNG khuôn bảng hai cột có hairline, nên hai loại thẻ vẫn là
  // một họ — chỉ nội dung trong ô đổi.
  const names = d.isProvince ? (d.childNames ?? []) : [];
  const total = d.childTotal ?? d.childCount ?? 0;
  const SLOTS = FACTS.length; // bốn ô, bằng đúng hai hàng của bảng

  // BA dòng là vừa đúng chiều cao của bảng hai hàng bên thẻ điểm đến, nên hai
  // loại thẻ vẫn cao bằng nhau và tên nơi thẳng hàng. Quá ba thì dòng cuối gom
  // phần còn lại.
  const CHIP_SLOTS = 3;
  const chips =
    total > CHIP_SLOTS
      ? [
          ...names.slice(0, CHIP_SLOTS - 1),
          `+${total - (CHIP_SLOTS - 1)} nơi`,
        ]
      : names.slice(0, CHIP_SLOTS);

  const rows: { key: string; text: React.ReactNode }[] =
    names.length > 0
      ? // Quá bốn nơi thì ô cuối nhường cho phần còn lại, nếu không danh sách
        // sẽ cụt lửng mà không ai biết là còn nữa.
        (total > SLOTS
          ? [
              ...names.slice(0, SLOTS - 1),
              `+${total - (SLOTS - 1)} nơi khác`,
            ]
          : names.slice(0, SLOTS)
        ).map((n, i) => ({
          key: `${i}-${n}`,
          text:
            total > SLOTS && i === SLOTS - 1 ? (
              <span className="text-white/60">{n}</span>
            ) : (
              <span className="font-medium text-white">{n}</span>
            ),
        }))
      : [
          ...(d.isProvince && total
            ? [
                {
                  key: "child",
                  text: (
                    <>
                      <span className="font-semibold tabular-nums text-white">
                        {total}
                      </span>{" "}
                      điểm đến
                    </>
                  ),
                },
              ]
            : []),
          ...facts.map((f) => ({
            key: f.key,
            text: (
              <>
                <span className="font-semibold tabular-nums text-white">
                  {d.counts[f.key]}
                </span>{" "}
                {f.label}
              </>
            ),
          })),
        ].slice(0, SLOTS);

  // …rồi bù cho đủ BỐN khe bằng ô vô hình. Bảng đáy vì thế luôn cao đúng hai
  // hàng, kể cả ở nơi chưa có gì để liệt kê — nhờ vậy tên nơi của mọi thẻ trong
  // một hàng nằm trên cùng một đường.
  const blanks = SLOTS - rows.length;

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
        className="object-cover"
      />

      {/* RÊ VÀO THÌ THẺ ĐỔI BA THỨ, không cái nào là phóng ảnh:
            · vành trong sáng lên (white/12 → /55) — đường viền là ngôn ngữ của
              cả trang này (thanh lọc, nút ‹ ›, chip tỉnh đều là nét), nên thẻ
              cũng nên nói "đang chọn tôi" bằng một đường nét;
            · tên nơi có gạch chân — quy ước link lâu đời nhất, và đúng thứ hai
              lối rẽ trên hero đang dùng;
            · lớp phủ đậm thêm MỘT NẤC (80% → 92%), không lên hết 100%: vừa đủ
              để chữ nổi hơn mà ảnh không tối sập lại.
          Đã bỏ `scale-[1.04]` của bản trước: ảnh gốc vốn đã phải phóng để phủ
          khổ thẻ, phóng thêm 4% nữa là mất nét thấy rõ — mà nó cũng chẳng nói
          được gì về việc thẻ này bấm được. */}

      {/* BÓNG CHỮ Ở ĐÂY PHẢI MẢNH — chỉ một tầng, blur 2–3px.
          Đã có một bản dùng bóng hai tầng (tầng rộng blur 12–16px, đậm 0.7–0.8)
          để bù cho lớp phủ vừa hạ xuống, và nó tạo ra một QUẦNG TỐI thấy rõ
          quanh mỗi dòng chữ — trên một tấm ảnh thì cái quầng đó đọc ra là vết
          bẩn, không phải bóng. Chữ ở đây nằm trên vùng ĐÃ CÓ lớp phủ lo phần
          nền rồi, nên bóng chỉ cần đủ tách nét chữ khỏi chi tiết ảnh ngay sát
          nó. (Khác hero: ở đó lớp phủ rất nhạt nên bóng phải gánh nhiều hơn.)

          Lớp phủ TẮT DẦN LÊN ĐỈNH, không phải tối đều.
          Bản trước giữ tận 44% ở mép trên — tức một phần ba thẻ bị dằn tối mà
          chẳng có chữ nào ở đó, và cả dải đọc ra là một hàng ảnh xám. Nay đỉnh
          gần như trong (0.04), rồi đậm dần xuống: ~0.37 ở tầm tên nơi, 0.67 ở
          đáy cho bảng dữ kiện. Chỗ nào có chữ mới có nền, chỗ nào không thì trả
          lại cho ảnh.
          LÚC NGHỈ đổ 80% lớp này; RÊ VÀO lên 100% và thẻ tối lại — lúc lướt qua
          cả dải thì ảnh là thứ đáng xem, còn khi đã dừng ở một thẻ thì chữ trên
          nó mới là thứ cần đọc.
          Giữ gradient ở mức đậm rồi hạ bằng `opacity` chứ không viết sẵn hai bộ
          màu: `opacity` chạy trên compositor nên chuyển mượt, mà `background`
          thì không transition được. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12 transition-[box-shadow] duration-300 group-hover:ring-white/55 motion-reduce:transition-none"
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
          {/* Điểm đến ghi TỈNH CHA; tỉnh thì không có gì ở trên nó nên ghi
              thẳng "Tỉnh" — vừa lấp đúng chỗ đó, vừa nói cho người đọc biết thẻ
              này dẫn tới một trang tỉnh chứ không phải một điểm đến. */}
          {(d.parentName ?? d.isProvince) && (
            <span className="max-w-full truncate font-[family-name:var(--font-rounded)] text-[0.8125rem] italic text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              {d.parentName ?? "Tỉnh"}
            </span>
          )}

          <span className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-normal leading-[1.18] tracking-[-0.015em] text-white underline-offset-[6px] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:text-[1.5rem] lg:text-[2rem]">
            {d.name}
          </span>

          {d.tagline && (
            <span className="mt-2 line-clamp-2 max-w-[94%] text-[0.9375rem] leading-snug text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] max-sm:hidden">
              {d.tagline}
            </span>
          )}
        </span>

        {/* ĐÁY THẺ nói hai thứ khác nhau tuỳ loại nơi, và mỗi thứ một HÌNH:
              · ĐIỂM ĐẾN → bảng hai cột có hairline. Bốn con số so sánh được
                giữa thẻ này với thẻ kia, mà muốn so thì chúng phải thẳng cột;
              · TỈNH → hàng VIÊN KÍNH, mỗi tên một viên. Tên nơi không phải để
                so sánh theo cột, nó là những mục RỜI — và một viên có mép rõ
                ràng thì đọc ra ngay là "một cái tên", trong khi xếp tên vào ô
                của bảng thì mắt cứ chờ một con số đi kèm.
                Viên dùng kính mờ chứ không viền: trên ảnh, một đường viền mảnh
                lúc rơi vào vùng sáng thì mất hẳn, còn kính thì luôn tự tách
                mình khỏi nền. Cùng vật liệu với huy hiệu trên hero. */}
        {names.length > 0 ? (
          // Danh sách các nơi trong tỉnh, dựng lại ĐÚNG BẰNG VẬT LIỆU CỦA BẢNG
          // bên thẻ điểm đến: cùng hairline trên mỗi ô, cùng cỡ chữ, cùng cách
          // chia cột. Chỉ khác hai điều — ba cột thay vì hai, và trong ô là một
          // cái TÊN thay vì một con số.
          //
          // Nhờ vậy hai loại thẻ đứng cạnh nhau đọc ra là một họ: nét kẻ ngang
          // ở cùng độ cao, chữ cùng cỡ, chỉ nội dung khác. Ba cột cũng là thứ
          // tự phân biệt: mắt thấy ba ô hẹp thay vì hai ô rộng là biết ngay bên
          // này đang liệt kê chứ không đang đếm.
          //
          // Đã thử và bỏ: xếp tên vào đúng bảng HAI cột của thẻ kia (mắt cứ
          // chờ một con số đi kèm mỗi ô); viên kính mỗi tên một viên (bốn mảng
          // mờ rải trên ảnh, đọc ra là tag); dòng có nét dẫn cam (thành một
          // danh sách gạch đầu dòng, lạc khỏi ngôn ngữ bảng của thẻ).
          <span className="grid min-h-[3.5rem] grid-cols-3 content-start gap-x-3 sm:gap-x-4">
            {chips.map((n, i) => (
              <span
                key={`${i}-${n}`}
                className={cn(
                  "mt-2 truncate border-t border-white/30 pt-1.5 text-[0.75rem] leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
                  total > CHIP_SLOTS && i === chips.length - 1
                    ? "text-white/60"
                    : "font-medium text-white",
                )}
              >
                {n}
              </span>
            ))}
          </span>
        ) : (
          <span className="grid grid-cols-2 gap-x-5 sm:gap-x-8">
            {rows.map((r) => (
              <span
                key={r.key}
                className="mt-2 truncate border-t border-white/30 pt-1.5 text-[0.75rem] leading-tight text-white/75 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]"
              >
                {r.text}
              </span>
            ))}
            {/* Ô giữ chỗ: `invisible` chiếm đúng chỗ trong lưới nhưng không vẽ
                gì và cũng biến khỏi cây trợ năng. KHÔNG có hairline: một nét kẻ
                không có chữ dưới nó chỉ là một vệt lửng lơ trên ảnh. */}
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
        )}
      </span>
    </Link>
  );
}
