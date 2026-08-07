import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Eye, Sunrise } from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";

export type FoodEatery = {
  slug: string;
  name: string;
  category: string | null;
  meals: string[];
};

// Quán nước — khác `FoodEatery` ở chỗ thứ đáng nói là CẢNH và GIỜ, không phải
// kiểu món với bữa ăn.
export type FoodDrink = {
  slug: string;
  name: string;
  viewType: string | null;
  bestTime: string | null;
  images: { url: string; isCover: boolean }[];
};

const MICRO = "text-[0.66rem] font-medium uppercase tracking-[0.16em]";

// Section "Ẩm thực" của trang Place — xem trước quán ăn + quán nước.
//
// Khối "Món phải thử" (hàng menu có ảnh từng món) ĐÃ GỠ cùng lúc với việc tắt
// hiển thị phần món ăn trên toàn trang công khai — dữ liệu `Specialty` vẫn còn
// nguyên trong DB, chỉ là không render ở đâu nữa. Cần dựng lại thì lấy trong
// lịch sử git, đừng viết lại từ đầu.
//
// Hai khối còn lại cố tình KHÁC hình thức nhau: quán ăn chỉ cần tên + kiểu nên
// là danh sách chữ, tiết kiệm chiều cao; quán view bán CẢNH — một dòng chữ
// "Rooftop Hoàng Hôn · Cà phê" không nói được gì, nên khối đó là dải ảnh.
//
// Là Server Component: tĩnh hoàn toàn, không carousel, không tốn byte JS nào.
export function FoodMenu({
  placeName,
  href,
  count,
  eateries,
  drinks = [],
}: {
  placeName: string;
  href: string;
  count?: number;
  eateries: FoodEatery[];
  drinks?: FoodDrink[];
}) {
  if (eateries.length === 0 && drinks.length === 0) return null;

  const eateriesBlock = eateries.length > 0 && (
    <SubBlock key="quan-an" title="Ăn ở đâu" href={href}>
      <ul className="mt-1 grid grid-cols-1 gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
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
                  {eateryMeta(e)}
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
    </SubBlock>
  );

  const drinksBlock = drinks.length > 0 && (
    <SubBlock key="quan-nuoc" title="Quán nước & cà phê" href={href}>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drinks.map((d) => (
          <DrinkTile key={d.slug} d={d} href={`${href}#eatery-${d.slug}`} />
        ))}
      </ul>
    </SubBlock>
  );

  return (
    <div>
      <SectionHeading
        eyebrow="Ẩm thực"
        title={`Ăn uống ở ${placeName}`}
        href={href}
        count={count}
        unit="quán"
      />

      <div className="mt-6 space-y-10">
        {eateriesBlock}
        {drinksBlock}
      </div>
    </div>
  );
}

// Khối con: nhãn micro bên trái + "Xem tất cả" bên phải.
function SubBlock({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/60 pt-6">
      <div className="flex items-baseline justify-between gap-6">
        <h3 className={cn(MICRO, "text-muted-foreground")}>{title}</h3>
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
      {children}
    </div>
  );
}

// Ô quán nước: ảnh cảnh + huy hiệu hướng nhìn, tên và giờ vàng nằm dưới ảnh.
// Giờ vàng để `text-primary` vì đó là thông tin quyết định có đi hay không —
// tới sai giờ thì cảnh chẳng còn gì để xem.
function DrinkTile({ d, href }: { d: FoodDrink; href: string }) {
  const viewLabel = label(VIEW_TYPE_LABELS, d.viewType);
  return (
    <li>
      <Link href={href} className="group block">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={coverUrl(d.images, d.slug, 600, 450)}
            alt=""
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {viewLabel && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
              <Eye className="size-3 shrink-0 text-primary" aria-hidden />
              {viewLabel}
            </span>
          )}
        </span>
        <span className="mt-2.5 block truncate font-semibold tracking-tight transition-colors group-hover:text-primary">
          {d.name}
        </span>
        {d.bestTime && (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sunrise className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{d.bestTime}</span>
          </span>
        )}
      </Link>
    </li>
  );
}

// Dòng meta của một quán: loại + hai bữa đầu. Hai bảng nhãn có chỗ trùng chữ
// (category `cafe` và bữa `cafe` đều ra "Cà phê") nên phải khử trùng, kẻo ra
// "Cà phê · Cà phê".
function eateryMeta(e: FoodEatery): string {
  const parts = [
    e.category ? label(EATERY_CATEGORY_LABELS, e.category) : null,
    ...e.meals.slice(0, 2).map((m) => label(MEAL_LABELS, m)),
  ].filter((p): p is string => Boolean(p));
  return [...new Set(parts)].join(" · ");
}
