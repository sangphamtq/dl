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
  tags: string[];
  // Tên vài quán tiêu biểu + tổng số, để in tên quán thật ở dòng dưới mỗi món.
  eateryNames: string[];
  eateryCount: number;
  images: { url: string; isCover: boolean }[];
};

export type FoodEatery = {
  slug: string;
  name: string;
  category: string | null;
  meals: string[];
};

const MICRO = "text-[0.66rem] font-medium uppercase tracking-[0.16em]";

// Section "Ẩm thực" của trang Place — THỰC ĐƠN CÓ ẢNH TỪNG MÓN.
//
// Mỗi món một hàng: ảnh vuông 144px + tên + chấm dẫn + kiểu món, dòng dưới là
// TÊN QUÁN bán món đó. Xếp hai cột nên sáu món chỉ cao ba hàng.
//
// Cỡ ảnh là chỗ hai bản menu trước sai về hai phía đối nghịch nhau: bản dùng
// thumbnail 56px thì ảnh bé quá, nhìn không đói; bản dồn hết vào một tấm lớn
// thì năm món còn lại chẳng có ảnh nào. 144px là mức vừa: nhận ra món trong
// ảnh, mà vẫn là một HÀNG menu chứ không thành thẻ.
//
// Chấm dẫn kết thúc ở NHÃN KIỂU MÓN, đúng chỗ menu in đặt giá — ở đây không có
// giá (schema Specialty không có), nên kiểu món là thứ hợp lý nhất đứng vào cột
// bên phải đó.
//
// Dòng "Ăn ở …" in tên quán thật thay vì "2 quán": hàng menu rộng ~660px nên có
// chỗ, và đó là câu trả lời khách cần ngay sau khi biết tên món. Đây cũng là chỗ
// duy nhất trên trang cho thấy quan hệ món ↔ quán của mô hình dữ liệu.
//
// Là Server Component: tĩnh hoàn toàn, không carousel, không tốn byte JS nào.
export function FoodMenu({
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
  if (specialties.length === 0 && eateries.length === 0) return null;

  return (
    <div>
      <SectionHeading
        eyebrow="Ẩm thực"
        title={`Ăn gì ở ${placeName}`}
        href={href}
        count={count}
        unit="món & quán"
      />

      {specialties.length > 0 && (
        // Hai cột từ lg: một cột dài suốt bề ngang trang thì dây chấm dẫn dài
        // tới 600px, ra một dải chấm thưa thớt chứ không phải nét dẫn của menu.
        // `grid-cols-1` viết rõ ở mức mặc định: thiếu nó thì cột ngầm là track
        // `auto` co theo max-content — tên món + tên quán không xuống dòng được
        // sẽ đẩy hàng rộng ra ~500px, làm CẢ TRANG cuộn ngang trên điện thoại.
        <ul className="mt-6 grid grid-cols-1 gap-x-14 lg:grid-cols-2">
          {specialties.map((s) => (
            <Row key={s.slug} s={s} href={`${href}#specialty-${s.slug}`} />
          ))}
        </ul>
      )}

      {eateries.length > 0 && (
        <div className="mt-12 border-t border-border/60 pt-6">
          <div className="flex items-baseline justify-between gap-6">
            <h3 className={cn(MICRO, "text-muted-foreground")}>Ăn ở đâu</h3>
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
        </div>
      )}
    </div>
  );
}

// Một hàng menu: ảnh vuông → (kiểu món) tên + chấm dẫn → tên các quán bán món.
function Row({ s, href }: { s: FoodSpecialty; href: string }) {
  return (
    <li>
      <Link
        href={href}
        // Vùng bấm ăn ra hai bên (-mx-3 px-3) để nền hover không dính sát chữ.
        className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-warm/[0.07] lg:gap-5"
      >
        <span className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-muted lg:size-36">
          <Image
            src={coverUrl(s.images, s.slug, 400, 400)}
            alt=""
            fill
            sizes="144px"
            className="object-cover"
          />
        </span>

        <span className="min-w-0 flex-1">
          {/* items-baseline: chấm dẫn phải nằm đúng đường chân chữ của tên món,
              không phải giữa dòng — lệch một chút là nhìn ra ngay.
              DƯỚI sm thì XẾP DỌC: cột chữ chỉ còn ~215px, nhồi cả tên + dây
              chấm + nhãn vào một dòng thì tên món bị xén ngay giữa ("Gà đen (gà
              H'M…") mà dây chấm chỉ còn vài chấm — mất luôn ý nghĩa "menu".
              Bỏ dây chấm, hạ nhãn xuống dòng riêng: tên món được trọn bề ngang. */}
          <span className="flex flex-col items-start sm:flex-row sm:items-baseline">
            <span className="max-w-full truncate font-[family-name:var(--font-display)] text-lg font-bold tracking-tight transition-colors group-hover:text-primary lg:text-xl">
              {s.name}
            </span>
            <span
              aria-hidden
              className="hidden h-0 min-w-4 flex-1 border-b border-dotted border-border sm:mx-3 sm:block"
            />
            {s.tags[0] && (
              <span className={cn(MICRO, "mt-1 shrink-0 text-warm sm:mt-0")}>
                {s.tags[0]}
              </span>
            )}
          </span>

          {s.eateryNames.length > 0 && (
            <span className="mt-1.5 block truncate text-sm text-muted-foreground">
              Ăn ở {s.eateryNames.join(" · ")}
              {s.eateryCount > s.eateryNames.length &&
                ` +${s.eateryCount - s.eateryNames.length}`}
            </span>
          )}
        </span>
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
