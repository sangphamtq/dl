import Link from "next/link";
import {
  FactLine,
  N,
  PhotoBadge,
  Stat,
  StatRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { cn } from "@/lib/utils";
import { R_BADGE } from "@/lib/radius";
import { coverUrl } from "@/lib/place-image";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
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
  images: { url: string; isCover: boolean }[];
};

// Số ô của cả section (một hàng ở lg) và số ô tối đa nhường cho quán nước.
const SLOTS = 4;
const DRINK_SLOTS = 2;

// Section "Ẩm thực" của trang Place — MỘT HÀNG BỐN Ô, ảnh làm chủ.
//
// ĐÃ THỬ VÀ BỎ — dải ĐÊM + bảng thực đơn xếp dòng. Mục này từng được dựng lại
// thành đỉnh của mạch cuộn: nền tối (bọc `class="dark"` ở `<Band night>`), ảnh
// ngang 14rem, tên cỡ display, cột giờ căn phải. Lý lẽ khi đó: ba mục liền nhau
// (Trải nghiệm · Ăn uống · Lưu trú) là ba lưới 4 ô giống hệt, và Ăn uống là mục
// duy nhất có trục THỜI GIAN để xếp thành bảng.
// NGƯỜI DÙNG BÁC BỎ: không muốn nó tối, và không muốn nó nổi hơn các mục khác.
// Quyết định đã chốt — mục này là một dải NGANG HÀNG, cùng khuôn thẻ với
// StayDirectory/ExperienceGrid. Đừng dựng lại dải tối ở đây.
// (Đánh đổi đã biết và đã chấp nhận: nửa dưới trang trở lại ba lưới 4 ô cùng
// hình. Muốn phá khuôn đó thì phải phá ở chỗ khác, không phải ở đây.)
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
/** Dữ kiện của TOÀN BỘ danh sách quán (không phải của 4 ô đang hiện) — xem chú
 *  thích ở chỗ truy vấn trong `page.tsx`. */
export type FoodFacts = {
  categoryLabel: string | null;
  hasView: boolean;
  hasBestTime: boolean;
};

export function FoodMenu({
  placeName,
  href,
  count,
  facts,
  eateries,
  drinks = [],
}: {
  placeName: string;
  href: string;
  count?: number;
  facts: FoodFacts[];
  eateries: FoodVenue[];
  drinks?: FoodVenue[];
}) {
  const venues = pickVenues(eateries, drinks);
  if (venues.length === 0) return null;

  // Dữ kiện mở đầu — cùng khuôn "glyph + số đậm" với dải mở đầu của năm tab
  // con, và đếm trên TOÀN BỘ danh sách quán (xem `facts`). Hai con số này là
  // thứ chỉ thấy khi nhìn cả danh sách: bao nhiêu chỗ ngồi được ngắm cảnh, và
  // bao nhiêu chỗ có giờ vàng riêng.
  const withView = facts.filter((f) => f.hasView).length;
  const withBest = facts.filter((f) => f.hasBestTime).length;
  // Mục đầu nói THÀNH PHẦN, không đếm lại: con số tổng đã nằm nguyên trong nhãn
  // link ngay bên phải ("Xem tất cả 15 quán").
  const composition = compositionLine(
    countByLabel(facts.map((f) => f.categoryLabel)),
    facts.length,
  );

  return (
    <div>
      <SectionHeading
        serif
        title={`Ăn uống ở ${placeName}`}
        href={href}
        count={count}
        unit="quán"
      />

      <StatRow>
        <Stat glyph="bowl">
          {composition ?? (
            <>
              <N>{count ?? facts.length}</N> quán ăn &amp; quán nước
            </>
          )}
        </Stat>
        {withView > 0 && (
          <Stat glyph="eye">
            <N>{withView}</N> chỗ ngồi có view
          </Stat>
        )}
        {withBest > 0 && (
          <Stat glyph="sunrise">
            <N>{withBest}</N> nơi có giờ đẹp riêng
          </Stat>
        )}
      </StatRow>

      {/* Một hàng: bốn ô từ lg. Hẹp hơn thì hai cột rồi một cột — bốn ô dàn ngang
          trên màn 768px chỉ còn ~180px/ô, nhãn trên ảnh hết chỗ. */}
      {/* `grid-cols-2 md:grid-cols-4` — KHỚP với ExperienceGrid và
          StayDirectory sau đợt layout. Bản cũ `grid-cols-1 sm:grid-cols-2
          lg:grid-cols-4` để bậc chuyển cột ở `lg`, nên quãng 768–1023px nhận
          bố cục điện thoại với đệm desktop; và 4 mục ở 3 cột vẫn là hai hàng
          (3 + 1 mồ côi) nên đi thẳng 4 cột. */}
      <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 md:grid-cols-4">
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

/* Một ô — THẺ KHÔNG KHUNG, đúng khuôn thẻ của tab Ẩm thực: ảnh 4/3 bo `R_CARD`
   mang huy hiệu loại (trái) và hướng nhìn (phải) → tên → dòng nhấn.

   Bản trước bọc cả ô trong `border border-border bg-card p-2` rồi lồng ảnh vào
   trong. Bỏ khung vì hai lẽ: quy ước `design` để viền cho thứ BẤM ĐƯỢC phân
   biệt với thứ không, mà ở đây cả bốn ô đều bấm được nên viền không phân biệt
   gì; và năm tab con đã bỏ khung từ đợt trước — giữ lại ở riêng bản xem trước
   thì cùng một quán hiện ra hai hình khác nhau ở hai trang. */
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
    ...v.meals
      .map((m) => label(MEAL_LABELS, m))
      .filter((m): m is string => Boolean(m))
      .slice(0, 2),
    v.wardName,
  ].filter((f): f is string => Boolean(f));

  return (
    <li>
      <Link href={`${href}#eatery-${v.slug}`} className="group block">
        <TilePhoto
          src={coverUrl(v.images, v.slug, 800, 600)}
          sizes="(min-width: 768px) 23vw, 46vw"
          priority={priority}
        >
          <PhotoBadge>{kicker}</PhotoBadge>
          {/* Hướng nhìn sang góc PHẢI: góc trái đã là chỗ của huy hiệu loại ở
              cả bốn mục xem trước, hai huy hiệu chồng một góc thì cái sau che
              cái trước trên ô hẹp 170px. */}
          {viewLabel && (
            <PhotoBadge side="right" tone="mark" glyph="eye">
              {viewLabel}
            </PhotoBadge>
          )}
        </TilePhoto>

        <div className="mt-3.5 flex min-h-[3.25rem] items-start">
          <TileName className="line-clamp-2">{v.name}</TileName>
        </div>

        {/* Dòng nhấn:
            · có giờ vàng → một dòng XANH (cùng màu, cùng glyph với thẻ quán ăn
              ở tab Ẩm thực và với `bestTime` của địa điểm) — nó là thứ quyết
              định có đi hay không nên đứng riêng;
            · không có → bữa và khu vực thành chip, mỗi mẩu một viên. */}
        {v.bestTime ? (
          <div className="mt-1">
            <FactLine glyph="sunrise" tone="time">
              {v.bestTime}
            </FactLine>
          </div>
        ) : facts.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <span
                key={f}
                className={cn(
                  R_BADGE,
                  "max-w-full truncate bg-muted px-2 py-0.5 text-xs text-muted-foreground",
                )}
              >
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </li>
  );
}
