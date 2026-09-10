"use client";

import Link from "next/link";
import Image from "next/image";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import {
  CatChipRow,
  EmptyFilter,
  ViewToggle,
  useCatFilter,
  useListView,
  type ListViewMode,
} from "@/components/site/listing-filter";
import { compositionLine } from "@/lib/listing-summary";
import { coverUrl } from "@/lib/place-image";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

export type SpotListItem = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null; // giá trị enum — khoá lọc & tham số ?cat=
  categoryLabel: string | null; // nhãn tiếng Việt của loại
  bestTime: string | null; // "5h – 8h sáng", "Mùa lúa chín (tháng 9–10)"
  notice: string | null; // cảnh báo truy cập
  price: string | null; // giá vé đã định dạng (null khi vào tự do)
  review: { worthGoing: number; total: number } | null;
  images: { url: string; isCover: boolean }[];
  // Hai trường dưới CHỈ hiện ở dạng danh sách — xem ghi chú ở `SpotListRow`.
  highlights: string[]; // tiêu đề các khối điểm nhấn của địa điểm
  activities: { slug: string; name: string }[]; // hoạt động diễn ra tại đây
};



// Ngưỡng hiện tín hiệu đánh giá. Dưới 3 lượt thì KHÔNG hiện gì.
//
// Đây là chỗ bản cũ sai nặng nhất: nó quy `stance` (love / worthOnce / meh /
// bad) về số sao rồi in 5 ngôi sao lên mọi thẻ. Trên dữ liệu thật của Phan
// Thiết, Bàu Trắng có ĐÚNG MỘT đánh giá "meh" nên thẻ của nó hiện "0,0" kèm
// năm ngôi sao rỗng — một địa điểm có thật bị chấm 0 điểm trước mặt khách vì
// một người thấy bình thường. Chưa kể `review-meta.ts` đã ghi rõ trong chính
// kiểu dữ liệu: `worthGoingPct` mới là "headline thay số sao".
const MIN_REVIEWS = 3;

/* ──────────────────────────────────────────────────────────────────
   Tab ĐỊA ĐIỂM của một điểm đến.
   Trước đây tab này dùng chung `ListingView` với tab Trải nghiệm. Tách ra
   thành section riêng đúng như Ẩm thực / Lưu trú / Di chuyển đã làm — vì hai
   loại trả lời hai câu hỏi khác nhau và có bộ trường khác hẳn nhau (địa điểm
   có `bestTime`, `notice`, vé; hoạt động có thời lượng, mùa).

   Cái tab này phải trả lời: **đi đâu, đi lúc nào, có mất tiền không, có gì
   phải cẩn thận**. Bản cũ chỉ trả lời được câu đầu: thẻ có ảnh, tên, một dòng
   mô tả, năm ngôi sao và chữ "Miễn phí" — trong khi truy vấn đã lấy sẵn
   `bestTime` cho 100% địa điểm mà không hiển thị ở đâu cả.

   Ba việc bản này làm khác:
   · **`bestTime` lên thẳng thẻ.** Với một địa điểm tham quan thì "đẹp nhất lúc
     bình minh" đổi kế hoạch mạnh hơn mọi thứ khác trên thẻ. Cùng khuôn với thẻ
     quán ăn (dòng xanh giờ vàng + dòng cam cảnh báo) — quy ước đã chốt ở
     CLAUDE.md mục Ẩm thực, nay áp cho địa điểm.
   · **`notice` lên thẳng thẻ.** Ở Tà Xùa 5/9 địa điểm có cảnh báo kiểu "lối đi
     hẹp, hai bên là vực, rất trơn sau mưa". Chôn nó trong trang chi tiết nghĩa
     là phải mở từng nơi mới biết nơi nào không nên đi hôm trời mưa.
   · **Giá chỉ nói khi CÓ BÁN VÉ.** 6/8 địa điểm Phan Thiết vào tự do, nên chữ
     "Miễn phí" xanh đậm lặp lại sáu lần chiếm một dòng mà không phân biệt được
     thẻ nào với thẻ nào. Nay số vào-tự-do gộp lên dải dữ kiện ở đầu mục, còn
     thẻ chỉ gắn huy hiệu cho nơi bán vé — tức là gắn cho NGOẠI LỆ.

   Đã bỏ khỏi tab này (còn nguyên ở tab Trải nghiệm): menu **Sắp xếp** và nút
   **Lưới / Danh sách**. Sắp xếp "Đánh giá cao" xếp theo đúng mấy con sao bịa ở
   trên; "Tên A–Z" cho 8 mục thì không giải quyết vấn đề gì; còn kiểu Danh sách
   tồn tại chỉ vì thẻ lưới cũ thiếu dữ kiện — nay thẻ đã mang đủ.
   ────────────────────────────────────────────────────────────────── */
export function SpotSection({
  spots,
  placeName,
  initialView = "grid",
}: {
  spots: SpotListItem[];
  placeName: string;
  initialView?: ListViewMode;
}) {
  const { cats, activeCat, effective, filtered, chooseCat } =
    useCatFilter(spots);
  const [view, chooseView] = useListView(initialView);
  const items = filtered;

  // Dải dữ kiện đếm trên TẬP ĐANG HIỆN, không phải toàn bộ — lọc còn 3 nơi mà
  // dòng trên vẫn ghi 8 thì con số đó nói về một danh sách khác với thứ đang
  // nhìn thấy.
  const paid = items.filter((s) => s.price).length;
  const free = items.length - paid;
  const noticed = items.filter((s) => s.notice).length;

  const composition =
    effective === "all" ? compositionLine(cats, spots.length) : null;

  return (
    <div>
      {/* ── Mở đầu.
             BỎ nhãn nhỏ "Địa điểm" mà hai tab anh em (Ẩm thực, Lưu trú) đang
             có: từ khi danh tính gộp vào thanh tab, mục "Địa điểm" ở đó đang
             sáng ngay trên đầu — thêm một nhãn nữa là nói ba lần cùng một việc
             (tab đang mở · nhãn · tiêu đề).

             Dải dữ kiện đổi NỘI DUNG chứ không chỉ đổi chỗ: mục đầu từng là
             "8 địa điểm", mà con số đó nằm nguyên trong chip "Tất cả 8" ngay
             dưới. Thay bằng THÀNH PHẦN của danh sách ("Phần lớn là biển") —
             thứ chỉ nói được khi nhìn cả tập, và khác nhau ở từng điểm đến:
             Phan Thiết ra "nhiều nhất là biển", Tà Xùa ra "điểm ngắm cảnh".
             Thêm mục "n nơi có lưu ý" (chỉ khi có): ở Tà Xùa là 5/9 nơi, đó là
             thứ đổi kế hoạch mà trước đây phải cuộn hết lưới mới đếm được. ── */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Đi đâu ở {placeName}
        </h2>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {composition ? (
            <Stat glyph="pin">{composition}</Stat>
          ) : (
            <Stat glyph="pin">
              <b className="font-semibold text-foreground">{items.length}</b> địa
              điểm
            </Stat>
          )}
          {free > 0 && (
            <Stat glyph="gate">
              <b className="font-semibold text-foreground">{free}</b> vào tự do
            </Stat>
          )}
          {paid > 0 && (
            <Stat glyph="ticket">
              <b className="font-semibold text-foreground">{paid}</b> có bán vé
            </Stat>
          )}
          {noticed > 0 && (
            <Stat glyph="warn">
              <b className="font-semibold text-foreground">{noticed}</b> nơi có
              lưu ý
            </Stat>
          )}
        </div>
      </header>

      {/* Kiểu xem nép về mép phải hàng tiêu đề: nó là công cụ phụ, không được
          nặng ngang tên mục. */}
      <ViewToggle view={view} onChange={chooseView} />
      </div>

      <CatChipRow
        cats={cats}
        effective={effective}
        total={spots.length}
        onChoose={chooseCat}
      />

      {items.length === 0 ? (
        <EmptyFilter
          categoryLabel={activeCat?.label}
          unit="địa điểm"
          onReset={() => chooseCat("all")}
        />
      ) : view === "grid" ? (
        // MỘT cột ở khổ điện thoại, không phải hai: thẻ nay mang cả giờ đẹp lẫn
        // cảnh báo, nhồi hai thẻ vào 390px thì mỗi dòng còn ~20 ký tự và ảnh —
        // thứ site này lấy làm chủ — teo lại còn hơn 170px.
        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <SpotGridCard key={s.slug} s={s} />
          ))}
        </div>
      ) : (
        <ul className="mt-8 border-t border-border/60">
          {items.map((s) => (
            <li key={s.slug} className="border-b border-border/60">
              <SpotListRow s={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  glyph,
  children,
}: {
  glyph: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph name={glyph} className="size-[1.05rem] shrink-0 text-muted-foreground/70" />
      {children}
    </span>
  );
}

/* Thẻ địa điểm của tab này — ảnh trên, chữ dưới.
   KHÁC `SpotCard` (thẻ poster chữ-đè-lên-ảnh dùng ở dải xem trước ngoài trang
   tổng quan) và đó là chủ ý: poster đã kín chỗ với tên + tagline, không còn
   khe nào cho giờ đẹp và cảnh báo. Giữ chung ngôn ngữ ảnh với poster (khung
   3/2, bo `R_CARD`, huy hiệu loại chữ nhỏ in hoa giãn) nên hai thẻ vẫn đọc ra
   cùng một họ. */
function SpotGridCard({ s }: { s: SpotListItem }) {
  const subline = s.tagline ?? s.description;
  return (
    <Link href={`/dia-diem/${s.slug}`} className="group block">
      <div
        className={cn(
          R_CARD,
          "relative aspect-[3/2] overflow-hidden bg-muted",
        )}
      >
        <Image
          src={coverUrl(s.images, s.slug, 900, 600)}
          alt=""
          fill
          sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 92vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {s.categoryLabel && (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm",
            )}
          >
            {s.categoryLabel}
          </span>
        )}
        {/* Huy hiệu giá CHỈ cho nơi bán vé — xem ghi chú đầu file. */}
        {s.price && (
          <span
            className={cn(
              R_BADGE,
              "absolute right-3 top-3 inline-flex items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-white tabular-nums backdrop-blur-sm",
            )}
          >
            <Glyph name="ticket" className="size-3.5 shrink-0" />
            {s.price}
          </span>
        )}
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {s.name}
      </h3>

      {subline && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {subline}
        </p>
      )}

      <FactLines s={s} />
    </Link>
  );
}

// Ba dòng "đổi quyết định", dùng chung cho cả lưới lẫn danh sách. Cùng khuôn
// với thẻ quán ăn: giờ vàng màu xanh, cảnh báo màu cam. Tín hiệu đánh giá đứng
// cuối và nhạt nhất — nó là bằng chứng xã hội, không phải dữ kiện thực địa.
function FactLines({ s }: { s: SpotListItem }) {
  const worth = s.review && s.review.total >= MIN_REVIEWS ? s.review : null;
  if (!s.bestTime && !s.notice && !worth) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {s.bestTime && (
        <p className="flex gap-1.5 text-xs font-medium text-primary">
          <Glyph name="sunrise" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-1">Đẹp nhất: {s.bestTime}</span>
        </p>
      )}
      {s.notice && (
        <p className="flex gap-1.5 text-xs text-warm">
          <Glyph name="warn" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-2">{s.notice}</span>
        </p>
      )}
      {worth && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <Glyph name="check" className="mt-px size-3.5 shrink-0" />
          <span>
            <b className="font-semibold text-foreground tabular-nums">
              {worth.worthGoing}/{worth.total}
            </b>{" "}
            khách thấy đáng đi
          </span>
        </p>
      )}
    </div>
  );
}


/* Hàng danh sách — ảnh trái, chữ phải.
   Dạng này KHÔNG phải "cùng nội dung xếp khác kiểu": cột chữ rộng gấp ba thẻ
   lưới nên nó gánh thêm hai thứ mà thẻ lưới không có chỗ, và cả hai đều đã nằm
   sẵn trong truy vấn từ trước mà chưa hiển thị ở đâu:
     · **Làm gì ở đây** — các `Activity` gắn với địa điểm này;
     · **Điểm nhấn** — tiêu đề các khối điểm nhấn do biên tập viết.
   Nhờ vậy hai kiểu xem chia việc rõ: LƯỚI để lướt ảnh chọn nhanh, DANH SÁCH để
   đọc kỹ và so sánh. Bản trước hai kiểu hiện gần như y hệt nhau, nên nút đổi
   kiểu chẳng đổi được gì ngoài kích thước ảnh.

   Chip ở đây dùng NỀN chứ không viền: cả hàng đã là một link, chip có viền sẽ
   mời bấm vào một thứ không bấm được. */
function SpotListRow({ s }: { s: SpotListItem }) {
  const subline = s.tagline ?? s.description;
  return (
    <Link
      href={`/dia-diem/${s.slug}`}
      className="group flex gap-4 py-5 sm:gap-6 sm:py-6"
    >
      <div
        className={cn(
          R_CARD,
          // Khổ điện thoại: ảnh nhỏ, hàng nằm ngang — ĐÓ mới là lý do tồn tại
          // của dạng danh sách ở đây. Để ảnh tràn ngang rồi xếp dọc thì hàng
          // gần như trùng khít thẻ lưới, và nút đổi kiểu chẳng đổi được gì.
          "relative aspect-[3/2] w-28 shrink-0 self-start overflow-hidden bg-muted sm:w-52 lg:w-64",
        )}
      >
        <Image
          src={coverUrl(s.images, s.slug, 900, 600)}
          alt=""
          fill
          sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 92vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* Ở khổ hẹp ô ảnh chỉ rộng 112px — hai huy hiệu sẽ đè lên nhau và
            che gần hết ảnh, nên chúng chỉ hiện từ `sm`. Loại và giá vẫn còn
            nguyên ở dạng lưới và ở trang chi tiết. */}
        {s.categoryLabel && (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 hidden bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm sm:block",
            )}
          >
            {s.categoryLabel}
          </span>
        )}
        {s.price && (
          <span
            className={cn(
              R_BADGE,
              "absolute right-3 top-3 hidden items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-white backdrop-blur-sm sm:inline-flex",
            )}
          >
            <Glyph name="ticket" className="size-3.5 shrink-0" />
            {s.price}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
          {s.name}
        </h3>

        {subline && (
          <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
            {subline}
          </p>
        )}

        <FactLines s={s} />

        {/* Hai hàng chip là phần THƯỞNG của cột chữ rộng — dưới `sm` cột chỉ
            còn ~250px nên bốn cái chip rớt thành bốn dòng, hàng cao gấp đôi mà
            không thêm được gì so với dạng lưới. */}
        {s.activities.length > 0 && (
          <TagLine label="Làm gì" items={s.activities.map((a) => a.name)} />
        )}
        {s.highlights.length > 0 && (
          <TagLine label="Điểm nhấn" items={s.highlights} />
        )}
      </div>
    </Link>
  );
}

function TagLine({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-2.5 hidden flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex">
      <span className="text-xs text-muted-foreground/80">{label}</span>
      {items.map((t, i) => (
        <span
          key={i}
          className={cn(
            R_BADGE,
            "bg-muted px-2 py-0.5 text-xs text-muted-foreground",
          )}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
