import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import {
  PreviewAllRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { SectionHeading } from "@/components/site/section-heading";
import { MEAL_LABELS, label } from "@/lib/listing-labels";
import { R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

/* Xem trước tab Ăn uống, dựng theo NHỊP MỘT NGÀY: sáng → trưa → cà phê → tối →
   ăn đêm, mỗi bữa đúng một quán. Đây là trục riêng của phần ăn — `meals[]` là
   trục lọc chính của mục này và trên dữ liệu thật nó được điền ĐỦ (15/15 quán
   Phan Thiết, 7/7 quán Tà Xùa). Nhờ xếp theo bữa, quán nước tự có chỗ ở ô
   "Cà phê" mà không phải tách thành khối riêng.

   `snack` KHÔNG có ô riêng: trên dữ liệu thật mọi quán ăn vặt đều kiêm một bữa
   khác (8/15 quán Phan Thiết có `snack`), nên để nó thành ô chỉ làm loãng dải. */

const DAY = ["breakfast", "lunch", "cafe", "dinner", "latenight"] as const;

// Lưới theo ĐÚNG số ô tìm được: Tailwind không nhận class dựng động.
const COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export type FoodVenue = {
  slug: string;
  name: string;
  meals: string[];
  /** null = chưa có ảnh THẬT; đừng rơi về ảnh stock. */
  image: string | null;
};

type Slot = { meal: string; venue: FoodVenue };

function pickSlots(venues: FoodVenue[]): Slot[] {
  const used = new Set<string>();
  const out: Slot[] = [];
  for (const meal of DAY) {
    const v = venues.find((x) => !used.has(x.slug) && x.meals.includes(meal));
    if (!v) continue;
    used.add(v.slug);
    out.push({ meal, venue: v });
  }
  return out;
}

export function FoodMenu({
  placeName,
  href,
  count,
  eateries,
  drinks = [],
  moreImages = [],
}: {
  placeName: string;
  href: string;
  count?: number;
  eateries: FoodVenue[];
  drinks?: FoodVenue[];
  /** Ứng viên ảnh cho dòng "Xem tất cả" — kèm `slug` để lọc ra quán ĐÃ hiện:
   *  ô nào hiện là do `pickSlots` chọn theo bữa, trang không biết trước. */
  moreImages?: { slug: string; url: string }[];
}) {
  const pool = [...eateries];
  for (const d of drinks) if (!pool.some((x) => x.slug === d.slug)) pool.push(d);

  const slots = pickSlots(pool);
  if (slots.length === 0) return null;

  // Không quán nào có ảnh thật (Tà Xùa) ⇒ bỏ hẳn ảnh, dải thành một bảng thực
  // đơn bằng chữ: `coverUrl` rơi về ảnh stock ngẫu nhiên, mà năm tấm ảnh lạ dán
  // tên năm quán có thật thì sai hơn là không có ảnh.
  const withPhotos = slots.some((s) => s.venue.image);
  const shown = new Set(slots.map((s) => s.venue.slug));

  return (
    <div>
      <SectionHeading
        serif
        title={`Ăn uống ở ${placeName}`}
        href={href}
        count={count}
        unit="quán"
      />

      <ul
        className={cn(
          "mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-6",
          COLS[slots.length] ?? "lg:grid-cols-5",
        )}
      >
        {slots.map((s, i) => (
          <Cell
            key={s.venue.slug}
            slot={s}
            href={href}
            withPhoto={withPhotos}
            priority={i < 3}
            // Ô lẻ cuối trải hết bề ngang ở khổ hẹp, khỏi đứng trơ nửa hàng.
            wide={slots.length % 2 === 1 && i === slots.length - 1}
            className={cn(
              slots.length % 2 === 1 &&
                i === slots.length - 1 &&
                "col-span-2 sm:col-span-1",
            )}
          />
        ))}
      </ul>

      {/* Khép lại một ngày ăn bằng chính vật liệu của trang: một hairline và
          một dòng, không phải mảng màu trải ngang. */}
      <div className="mt-6 border-t border-border/60">
        <PreviewAllRow
          href={href}
          more={Math.max(0, (count ?? slots.length) - slots.length)}
          unit="quán nữa"
          allLabel="quán ăn & quán nước"
          images={moreImages.filter((m) => !shown.has(m.slug)).map((m) => m.url)}
          thumb="wide"
        />
      </div>
    </div>
  );
}

function Cell({
  slot,
  href,
  withPhoto,
  priority,
  wide,
  className,
}: {
  slot: Slot;
  href: string;
  withPhoto: boolean;
  priority: boolean;
  wide: boolean;
  className?: string;
}) {
  const v = slot.venue;

  return (
    <li className={className}>
      {/* Quán ăn KHÔNG có trang chi tiết riêng — neo thẳng vào mục trong tab. */}
      <Link href={`${href}#eatery-${v.slug}`} className="group block">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label(MEAL_LABELS, slot.meal)}
        </p>

        {withPhoto &&
          (v.image ? (
            <TilePhoto
              src={v.image}
              // Ô lẻ cuối trải 2 cột ở khổ hẹp: để nguyên 3:2 thì nó cao vọt
              // lên gấp đôi các ô kia và nuốt cả dải.
              ratio={cn("aspect-[3/2]", wide && "aspect-[2/1] sm:aspect-[3/2]")}
              className="mt-2"
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 31vw, 46vw"
              priority={priority}
            />
          ) : (
            <span
              className={cn(
                R_CARD,
                "mt-2 grid place-items-center bg-muted",
                wide ? "aspect-[2/1] sm:aspect-[3/2]" : "aspect-[3/2]",
              )}
            >
              <Glyph name="bowl" className="size-6 text-muted-foreground/40" />
            </span>
          ))}

        <TileName className="mt-2.5 line-clamp-2">{v.name}</TileName>
      </Link>
    </li>
  );
}
