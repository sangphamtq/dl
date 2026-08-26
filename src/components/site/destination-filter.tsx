"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/site/section-tabs";
import { coverUrl } from "@/lib/place-image";
import { Rail } from "@/components/site/rail";

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
//   EDGE  3px  điều khiển: ô nhập, chip, nút, tab
//   (khối lớn — thẻ, ô lối rẽ, huy hiệu trên ảnh — thì VUÔNG HẲN, không class)
const EDGE = "rounded-[3px]";

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
      {/* Thanh điều khiển dính: tìm kiếm · chuyển miền · sắp xếp.
          BA nhóm, HAI hình dạng — cố ý. Bản cũ để miền và sắp xếp trong hai
          track viên thuốc giống hệt nhau, cạnh nhau, nên không đọc ra được cái
          nào đang lọc và cái nào đang nhảy chỗ. Nay:
          · chuyển miền = TAB có gạch chân — nó chỉ "bạn đang ở đâu", đúng việc
            của scroll-spy;
          · sắp xếp = segmented viên nổi kiểu iOS — nó là một lựa chọn của người
            dùng, giữ nguyên tới khi đổi.
          Cũng bỏ luôn viên nền xanh đặc: hai khối xanh cạnh nhau trong một
          thanh mảnh là hai vệt màu tranh nhau, trong khi cả trang lấy ẢNH làm
          chủ. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/85 backdrop-blur sm:-mx-6 lg:top-16">
        {/* HAI HÀNG dưới sm, MỘT hàng từ sm. Nhồi cả ba nhóm vào một hàng ở khổ
            320–390px thì nhóm sắp xếp bị đẩy hẳn ra ngoài mép phải — có mặt
            nhưng không ai thấy để mà bấm. Ô tìm kiếm lên hàng riêng (rộng hết
            khổ, dễ chạm), hai nhóm nút còn lại đứng chung hàng dưới.
            `sm:contents`: từ sm bọc ngoài biến mất khỏi layout nên nav và nhóm
            sắp xếp thành con trực tiếp của hàng — `ml-auto` mới đẩy được nhóm
            sắp xếp về mép phải như cũ. */}
        <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
          {/* Tìm kiếm */}
          <div className="relative sm:w-56 sm:shrink-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm điểm đến…"
              aria-label="Tìm điểm đến"
              className="h-9 w-full rounded-[3px] border border-border bg-card pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          {/* `md:contents` chứ không phải `sm:contents`: ở đúng dải 640–767px
              ba nhóm cộng lại vẫn rộng hơn cột nội dung, mà `contents` thì bọc
              ngoài biến mất nên không còn ai cuộn được — nhóm sắp xếp lại lòi
              ra ngoài mép. Giữ bọc ngoài (cuộn ngang được) tới khi đủ chỗ. */}
          <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:min-w-0 sm:flex-1 md:contents [&::-webkit-scrollbar]:hidden">
            {/* Chuyển nhanh theo miền — VIÊN SÁNG TRƯỢT.
                Bản trước là gạch chân 2px dưới nhãn đang xem: đúng nghĩa nhưng
                đứng cạnh nhóm sắp xếp thì nó là thứ mảnh nhất trong thanh, gần
                như biến mất.
                Ở đây viên nền `primary/10` bám lấy đúng nhãn đang xem và TRƯỢT
                sang nhãn kế khi người dùng cuộn qua miền khác — chuyển động
                không phải trang trí, nó là chính scroll-spy hiện hình. Kích
                thước viên đo từ nút thật (`offsetLeft/offsetWidth`) nên nhãn cứ
                giữ bề rộng tự nhiên: ba nhãn dài ngắn khác nhau mà ép bằng nhau
                thì thanh phình thêm cả trăm pixel ở khổ hẹp.
                Vẫn KHÁC hẳn nhóm sắp xếp bên phải (rãnh xám + viên trắng nổi):
                bên này không có rãnh, chỉ một vệt màu — hai điều khiển cạnh
                nhau không bị đọc nhầm thành một cặp sinh đôi. */}
            <SectionTabs
              labels={sections.map((g) => shortRegion(g.label))}
              idPrefix="mien"
              ariaLabel="Chuyển nhanh theo miền"
              resetKey={`${query}|${sort}`}
              shapeClassName={EDGE}
            />

            {/* Sắp xếp */}
            <div
              role="group"
              aria-label="Sắp xếp"
              className="ml-auto flex h-9 w-fit shrink-0 items-center rounded-[3px] bg-muted p-0.5 sm:gap-0.5 sm:p-1"
            >
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  aria-pressed={sort === s.key}
                  className={cn(
                    "inline-flex h-full items-center whitespace-nowrap rounded-[3px] px-1.5 text-[0.8125rem] font-medium transition-colors sm:px-3",
                    sort === s.key
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
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
          {sections.map((g, i) => (
            <section
              key={g.label}
              id={`mien-${i}`}
              // scroll-mt = chiều cao thanh dính (2 hàng dưới sm, 1 hàng từ sm)
              // cộng header 4rem từ lg — thiếu thì tiêu đề miền chui xuống dưới
              // thanh khi bấm chuyển nhanh.
              className="scroll-mt-28 sm:scroll-mt-20 lg:scroll-mt-32"
            >
              {/* Tiêu đề miền: tên cỡ lớn, con số đứng NGAY CẠNH trên cùng
                  đường chân chữ — đọc liền thành một câu ("Miền Bắc, 12 điểm
                  đến ở 25 tỉnh thành").
                  Đã bỏ vạch kẻ ngang từng nối tên miền tới con số dồn ở mép
                  phải: trang này vốn đã có hai đường ngang bắt buộc (đáy header
                  và đáy thanh lọc dính), thêm một vạch cho MỖI miền nữa là cứ
                  vài trăm pixel lại một nét cắt ngang. Bỏ vạch thì cũng không
                  còn lý do đẩy con số ra mép phải — mà đẩy ra đó ở màn 1440px
                  là để nó đứng một mình cách tên miền cả nghìn pixel. */}
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="min-w-0 font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.035em]">
                  {g.label}
                </h2>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {g.dests.length > 0 && `${g.dests.length} điểm đến`}
                  {g.dests.length > 0 && g.provCount > 0 && " · "}
                  {g.provCount > 0 && `${g.provCount} tỉnh thành`}
                </p>
              </header>

              {g.dests.length > 0 && (
                <Rail
                  // Thẻ NGANG nên mỗi cái ăn gấp đôi bề rộng của bản dọc cũ:
                  // ~3 thẻ mỗi màn ở xl, và cố ý để hé thẻ kế tiếp ở mọi khổ —
                  // đó là thứ duy nhất nói cho người lướt biết rail còn cuộn.
                  itemClassName="basis-[86%] sm:basis-[60%] lg:basis-[44%] xl:basis-[31%]"
                  // Mặc định của Rail là `top-[36%]` — canh cho thẻ có chữ nằm
                  // NGOÀI khung ảnh (ảnh chiếm phần trên, 36% rơi đúng giữa
                  // ảnh). Thẻ ở đây là một khối ảnh đặc, tâm của nó là 50%.
                  // `rounded-none` đè hình tròn mặc định của carousel — nút
                  // tròn nổi trên một thẻ vuông là vật lạc duy nhất còn lại.
                  arrowClassName="top-1/2 -translate-y-1/2 rounded-none"
                >
                  {g.dests.map((d) => (
                    <DestCard key={d.slug} d={d} />
                  ))}
                </Rail>
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
                      vai trò: một dòng ghi chú, đọc được, không mời bấm. */}
                  {g.provsSoon.length > 0 && (
                    <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground/70">
                      <span
                        className={cn(MICRO, "mr-2 text-muted-foreground/60")}
                      >
                        Đang cập nhật
                      </span>
                      {g.provsSoon.map((p) => p.name).join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </section>
          ))}
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

      {/* Tối đều để chữ giữa khung đọc được, đậm dần xuống đáy cho bảng dữ kiện. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.74)_0%,rgba(0,0,0,0.56)_26%,rgba(0,0,0,0.47)_52%,rgba(0,0,0,0.42)_100%)] transition-opacity duration-500 group-hover:opacity-90 motion-reduce:transition-none"
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
            // Một dòng, cắt cụt — thứ duy nhất trên thẻ mang giọng biên tập.
            // Để hai dòng thì nó tranh chỗ với tên và khối giữa mất tâm.
            // ẨN dưới `sm`: ở đó thẻ hẹp tới mức câu bị cắt ngay sau mấy chữ
            // đầu ("Tạm rời xa nhịp sống vội vã để…") — không nói được gì mà
            // vẫn ăn nguyên một dòng của khối chữ vốn đã chật.
            <span className="mt-1.5 line-clamp-1 max-w-[92%] text-[0.8125rem] leading-relaxed text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] max-sm:hidden">
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
