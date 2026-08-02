import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { EATERY_CATEGORY_LABELS, MEAL_LABELS, label } from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";

export type FoodSpecialty = {
  slug: string;
  name: string;
  tag: string | null;
  eateryCount: number;
  images: { url: string; isCover: boolean }[];
};

export type FoodEatery = {
  slug: string;
  name: string;
  category: string | null;
  meals: string[];
};

// Khổ từng ô của khảm (desktop): ô đầu chiếm nửa trái và cao hết hai hàng, bốn
// ô còn lại lấp phần phải. Hàng trên 5+4+3, hàng dưới 5+3+4 — cùng tổng 12 cột
// nhưng chia khác nhau, nên khảm không đọc ra là một cái lưới.
const CELLS = [
  "lg:col-span-5 lg:row-span-2",
  "lg:col-span-4",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-4",
];

// Section "Ẩm thực" của trang Place — KHẢM ẢNH TĨNH + danh sách quán.
//
// Ba mục liền nhau phía trên đều là chuyển động ngang: dải Địa điểm tự đổi
// mục, băng Trải nghiệm kéo ngang. Mục này CỐ Ý đứng yên và xếp theo khối hai
// chiều — vừa là quãng nghỉ cho mắt, vừa hợp việc người ta làm với đồ ăn: nhìn
// một lượt cả mâm rồi mới chọn, chứ không lật từng món.
//
// Chất liệu: khe hẹp 8px + bo góc lớn 28px + chữ display cỡ lớn nằm thẳng trên
// ảnh, lớp phủ chỉ ăn vào đáy. Bản trước dùng viên nhãn nền trắng đặt trên ảnh
// — đọc thì rõ nhưng ra dáng "thẻ có widget dán lên", cũ. Chữ đặt thẳng lên ảnh
// và để ảnh sáng hết mức là cách mọi trang ẩm thực tử tế đang làm.
//
// Là Server Component: mục này không có tương tác nào (không carousel, không
// state) nên không tốn một byte JS nào ở client.
export function FoodMosaic({
  placeName,
  href,
  count,
  specialties,
  eateries,
}: {
  placeName: string;
  href: string;
  count?: number;
  specialties: FoodSpecialty[];
  eateries: FoodEatery[];
}) {
  const tiles = specialties.slice(0, CELLS.length);
  if (tiles.length === 0 && eateries.length === 0) return null;

  return (
    <div>
      <SectionHeading
        eyebrow="Ẩm thực"
        title={`Ăn gì ở ${placeName}`}
        href={href}
        count={count}
        unit="món & quán"
      />

      {/* Khe HẸP (8px) để năm ô đọc ra là MỘT khối được sắp, không phải năm cái
          thẻ rời đặt cạnh nhau. Chiều cao hai hàng đặt cứng ở lg để ô lớn bên
          trái ra khổ dọc; dưới lg bỏ lưới 12 cột, về hai cột và để tỉ lệ khung
          lo chiều cao. */}
      <div className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-12 lg:grid-rows-[14rem_14rem]">
        {tiles.map((s, i) => (
          <Tile
            key={s.slug}
            s={s}
            href={`${href}#specialty-${s.slug}`}
            big={i === 0}
            className={CELLS[i]}
          />
        ))}
      </div>

      {eateries.length > 0 && (
        // "Ăn ở đâu" — CHỮ, không ảnh. Phần trên đã là một mảng ảnh dày; thêm
        // một lưới thẻ ảnh nữa thì hai nửa tranh nhau. Ở đây người đọc chỉ cần
        // biết có những quán nào, mở tên nào ra thì xem tiếp trong drawer.
        <div className="mt-10 border-t border-border/60 pt-6">
          <div className="flex items-baseline justify-between gap-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ăn ở đâu
            </h3>
            <Link
              href={href}
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Xem tất cả
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          {/* Mỗi quán một hàng HAI DÒNG (tên trên, meta dưới), không phải tên
              trái – meta phải: meta dài ngắn khác nhau, canh phải thì mép giữa
              lởm chởm và cả khối đọc ra như một cái bảng tra. */}
          <ul className="mt-1 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {eateries.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`${href}#eatery-${e.slug}`}
                  className="group flex items-center gap-4 border-b border-border/50 py-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold tracking-tight transition-colors group-hover:text-primary">
                      {e.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {meta(e)}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Dòng meta của một quán: loại + hai bữa đầu. Hai bảng nhãn có chỗ trùng chữ
// (category `cafe` và bữa `cafe` đều ra "Cà phê") nên phải khử trùng, kẻo ra
// "Cà phê · Cà phê". Chỉ lấy hai bữa: hàng này để liếc, không phải để tra giờ
// mở cửa — cái đó nằm trong drawer.
function meta(e: FoodEatery): string {
  const parts = [
    e.category ? label(EATERY_CATEGORY_LABELS, e.category) : null,
    ...e.meals.slice(0, 2).map((m) => label(MEAL_LABELS, m)),
  ].filter((p): p is string => Boolean(p));
  return [...new Set(parts)].join(" · ");
}

function Tile({
  s,
  href,
  big,
  className,
}: {
  s: FoodSpecialty;
  href: string;
  big: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      // Bo góc LỚN (28px). Mức 12–16px quen thuộc là thứ làm khối ảnh trông
      // như thẻ bootstrap; lớn hẳn lên thì ra khối mềm, hợp với ảnh đồ ăn.
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] bg-muted",
        // Ô lớn chiếm cả hai cột ở màn hẹp; các ô còn lại vuông.
        big ? "col-span-2 aspect-[16/10]" : "aspect-square",
        "lg:aspect-auto lg:h-full",
        className,
      )}
    >
      <Image
        src={coverUrl(s.images, s.slug)}
        alt=""
        fill
        sizes={
          big
            ? "(min-width: 1024px) 42vw, 100vw"
            : "(min-width: 1024px) 28vw, 50vw"
        }
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
      />

      {/* Lớp phủ chỉ ăn vào phần ĐÁY ảnh (tan hết ở 62%): đủ đỡ chữ mà vẫn giữ
          nguyên phần ảnh phía trên — ảnh món ăn phải sáng mới thèm được, đổ tối
          cả tấm là mất. Đậm thêm một nấc khi rê chuột. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.34)_28%,transparent_62%)] transition-opacity duration-300 group-hover:opacity-90" />

      {/* Nút mũi tên tròn hiện khi rê chuột — dấu hiệu "bấm được" đặt đúng chỗ
          mắt nhìn tới, thay cho việc phải viết chữ "Xem chi tiết". */}
      <span
        aria-hidden
        className="absolute right-3 top-3 grid size-9 translate-y-1 place-items-center rounded-full bg-background/95 text-foreground opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
      >
        <ArrowUpRight className="size-4" />
      </span>

      <div className={cn("absolute inset-x-0 bottom-0 p-4", big && "p-5 lg:p-6")}>
        {/* Nhãn phân loại CHỈ ở ô lớn: năm ô mà ô nào cũng hai tầng chữ thì
            khảm thành một mớ chữ nhỏ. Ô nhỏ để mỗi cái tên. */}
        {big && s.tag && (
          <span className="mb-2 inline-block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-warm-bright [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            {s.tag}
          </span>
        )}
        <h3
          className={cn(
            "font-[family-name:var(--font-display)] font-extrabold leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]",
            big
              ? "text-balance text-2xl lg:text-4xl"
              : "line-clamp-2 text-base lg:text-xl",
          )}
        >
          {s.name}
        </h3>
        {big && s.eateryCount > 0 && (
          <p className="mt-2 text-sm text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            Ăn ở {s.eateryCount} quán
          </p>
        )}
      </div>
    </Link>
  );
}
