import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye, Sunrise } from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";

export type FoodVenue = {
  slug: string;
  name: string;
  category: string | null;
  venueKind: string;
  viewType: string | null;
  bestTime: string | null;
  meals: string[];
  wardName: string | null;
  districtName: string | null;
  images: { url: string; isCover: boolean }[];
};

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Kính mờ trên ảnh — cùng chất liệu với huy hiệu của StayDirectory, để hai
// section cạnh nhau đọc như một hệ.
const GLASS = "rounded-full bg-black/35 text-white backdrop-blur-md";

// Số ô của cả section (một hàng ở lg) và số ô tối đa nhường cho quán nước.
const SLOTS = 4;
const DRINK_SLOTS = 2;

// Section "Ẩm thực" của trang Place — MỘT HÀNG BỐN Ô, ảnh làm chủ.
//
// Bản trước là hai khối rời: danh sách CHỮ "Ăn ở đâu" rồi dải ảnh "Quán nước",
// mỗi khối một link "Xem tất cả" — cộng cả link trên tiêu đề là BA link cùng trỏ
// một chỗ, và section mở đầu bằng một danh sách không ảnh giữa trang lấy ảnh làm
// chủ. Nó vốn cân được vì phía trên còn khối "Món phải thử" gánh phần hình ảnh;
// khối đó gỡ đi rồi thì bố cục cũ mất điểm tựa.
//
// Nay gộp thành một hàng ô như "Nơi lưu trú"/"Tham quan": cùng khuôn thẻ, cùng
// chất liệu huy hiệu, một link duy nhất. Ăn hay uống KHÔNG còn tách bằng khối
// riêng — tách bằng nhãn trên từng ô. Trục ăn/uống là thứ cần khi xếp lịch bữa,
// tức là việc của màn hình Ẩm thực đầy đủ; ở bản xem trước câu hỏi chỉ là "quanh
// đây ăn uống chỗ nào đáng ghé".
//
// Huy hiệu "Nhìn ra …" hiện cho MỌI quán có `viewType`, kể cả quán ăn. Trước đây
// view của quán ăn (Hải sản Bờ Kè 24 — "bàn sát biển") bị giấu kín vì nó nằm
// trong khối chữ; giờ nó nói được đúng thứ khách tranh nhau.
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
  eateries: FoodVenue[];
  drinks?: FoodVenue[];
}) {
  const venues = pickVenues(eateries, drinks);
  if (venues.length === 0) return null;

  return (
    <div>
      <SectionHeading
        title={`Ăn uống ở ${placeName}`}
        href={href}
        count={count}
        unit="quán"
      />

      {/* Một hàng: bốn ô từ lg. Hẹp hơn thì hai cột rồi một cột — bốn ô dàn ngang
          trên màn 768px chỉ còn ~180px/ô, nhãn trên ảnh hết chỗ. */}
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {venues.map((v, i) => (
          <VenueTile key={v.slug} v={v} priority={i < SLOTS} href={href} />
        ))}
      </ul>
    </div>
  );
}

// Chọn tối đa 4 ô, GIỮ CHỖ cho quán nước.
//
// Không xếp chung rồi cắt: quán nước đứng cuối theo `order` nên cách đó là gần
// như không bao giờ lọt — đúng ở những nơi mà cảnh mới là lý do người ta tới.
// Quán nước CÓ view ưu tiên trước, vì trong nhóm đó chúng là thứ đáng xem nhất.
function pickVenues(eats: FoodVenue[], drinks: FoodVenue[]): FoodVenue[] {
  const rankedDrinks = [...drinks].sort(
    (a, b) => Number(Boolean(b.viewType)) - Number(Boolean(a.viewType)),
  );
  const picked = rankedDrinks.slice(0, Math.min(DRINK_SLOTS, drinks.length));
  const taken = new Set(picked.map((d) => d.slug));
  // Quán `both` nằm ở cả hai mảng — lọc theo slug kẻo hiện hai lần cùng một ô.
  const rest = eats.filter((e) => !taken.has(e.slug));
  const out = [...rest.slice(0, SLOTS - picked.length), ...picked];
  // Thiếu chỗ vì một bên ít mục → lấy bù từ bên còn lại cho đủ hàng.
  if (out.length < SLOTS) {
    for (const d of rankedDrinks) {
      if (out.length >= SLOTS) break;
      if (!out.some((x) => x.slug === d.slug)) out.push(d);
    }
  }
  return out.slice(0, SLOTS);
}

// Một ô: ảnh 4/3 lồng trong lòng thẻ (+ huy hiệu hướng nhìn nổi trên ảnh) →
// nhãn loại → tên → dòng nhấn ở đáy (giờ vàng với quán view, bữa với quán ăn).
function VenueTile({
  v,
  priority,
  href,
}: {
  v: FoodVenue;
  priority: boolean;
  href: string;
}) {
  const viewLabel = label(VIEW_TYPE_LABELS, v.viewType);
  // Nhãn ưu tiên `category` vì nó cụ thể hơn hẳn ("Cà phê", "Hải sản" đã tự nói
  // ăn hay uống). Chỉ khi không có category — hoặc nó là "other", vô nghĩa — mới
  // rơi về ăn/uống. Trước đây nhánh drink ăn trước nên hai quán cà phê cạnh nhau
  // ra hai nhãn khác nhau, chỉ vì một quán để `both`.
  const kicker =
    (v.category && v.category !== "other"
      ? label(EATERY_CATEGORY_LABELS, v.category)
      : null) ?? (v.venueKind === "eat" ? "Quán ăn" : "Quán nước");
  // Mỗi mẩu thông tin là MỘT CHIP, không nối bằng dấu ngăn: bữa và khu vực là
  // hai loại dữ kiện khác nhau, gộp thành một chuỗi thì mắt phải tự tách ra.
  const facts = [
    ...(v.meals
      .map((m) => label(MEAL_LABELS, m))
      .filter((m): m is string => Boolean(m))
      .slice(0, 2)),
    [v.wardName, v.districtName].filter(Boolean)[0] ?? null,
  ].filter((f): f is string => Boolean(f));

  return (
    <li className="h-full">
      <Link
        href={`${href}#eatery-${v.slug}`}
        className="group flex h-full flex-col rounded-[1.5rem] border border-border/60 bg-card p-2 transition-all duration-200 hover:border-transparent hover:shadow-lg hover:shadow-black/5"
      >
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[1.05rem] bg-muted">
          <Image
            src={coverUrl(v.images, v.slug, 800, 600)}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover"
          />
          {viewLabel && (
            // Thứ DUY NHẤT nằm trên ảnh: hướng nhìn phải đọc được ngay khi mắt
            // còn ở khuôn hình. Hiện cho cả quán ăn có view, không riêng quán nước.
            <span
              className={cn(
                GLASS,
                "absolute left-2.5 top-2.5 inline-flex items-center gap-1 py-1 pl-1.5 pr-2.5 text-[0.7rem] font-semibold",
              )}
            >
              <Eye className="size-4 shrink-0" aria-hidden />
              {viewLabel}
            </span>
          )}
        </span>

        <span className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
          <span className={cn(MICRO, "text-warm")}>{kicker}</span>

          <span className="mt-1 flex items-start gap-2">
            <span className="line-clamp-2 min-w-0 flex-1 font-[family-name:var(--font-display)] text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-lg">
              {v.name}
            </span>
            <ArrowUpRight
              className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
              aria-hidden
            />
          </span>

          {/* Dòng nhấn ở đáy — đúng chỗ thẻ thương mại đặt giá.
              · Có giờ vàng → một dòng `text-primary`: nó là MỘT dữ kiện và là
                thứ quyết định có đi hay không, nên đứng riêng, không thành chip.
              · Không có → các dữ kiện rời (bữa, khu vực) thành CHIP, mỗi mẩu
                một viên. */}
          {v.bestTime ? (
            <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs">
              <Sunrise className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-medium text-primary">
                {v.bestTime}
              </span>
            </span>
          ) : facts.length > 0 ? (
            <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {facts.map((f) => (
                <span
                  key={f}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
