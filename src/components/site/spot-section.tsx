"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { coverUrl } from "@/lib/place-image";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";
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

export type SpotViewMode = "grid" | "list";

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
  initialView?: SpotViewMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cat, setCat] = useState<string>(() => searchParams.get("cat") ?? "all");
  const [view, setView] = useState<SpotViewMode>(initialView);

  // Kiểu xem là SỞ THÍCH của người dùng nên lưu cookie và để server render đúng
  // ngay từ lần tải đầu (khỏi nháy một nhịp lưới rồi mới đổi sang danh sách).
  // Dùng chung khoá `listingView` với tab Trải nghiệm — chọn một lần, cả hai tab
  // cùng theo.
  const chooseView = (v: SpotViewMode) => {
    setView(v);
    document.cookie = `listingView=${v};path=/;max-age=31536000;samesite=lax`;
  };

  // Loại có thật trong dữ liệu + số mục; nhiều nhất lên trước.
  const cats = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const s of spots) {
      if (!s.category || !s.categoryLabel) continue;
      const cur = map.get(s.category);
      if (cur) cur.count += 1;
      else map.set(s.category, { label: s.categoryLabel, count: 1 });
    }
    return [...map.entries()]
      .map(([value, v]) => ({ value, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
  }, [spots]);

  // `?cat=` lạ (link cũ, gõ tay, loại đã bị gỡ khỏi dữ liệu) thì coi như KHÔNG
  // lọc, thay vì hiện một trang trống có tên loại bỏ ngỏ trong ngoặc kép.
  const activeCat = cats.find((c) => c.value === cat);
  const effective = activeCat ? cat : "all";

  const items = useMemo(
    () =>
      effective === "all"
        ? spots
        : spots.filter((s) => s.category === effective),
    [spots, effective],
  );

  // Dải dữ kiện đếm trên TẬP ĐANG HIỆN, không phải toàn bộ — lọc còn 3 nơi mà
  // dòng trên vẫn ghi 8 thì con số đó nói về một danh sách khác với thứ đang
  // nhìn thấy.
  const paid = items.filter((s) => s.price).length;
  const free = items.length - paid;

  // Giữ loại đang lọc trong URL để chia sẻ/quay lại còn đúng. Dùng GIÁ TRỊ enum
  // (beach, temple…) chứ không phải nhãn tiếng Việt.
  const chooseCat = (v: string) => {
    setCat(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === "all") params.delete("cat");
    else params.set("cat", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div>
      {/* ── Mở đầu: cùng khuôn với tab Ẩm thực / Lưu trú (nhãn nhỏ → tên →
             dải dữ kiện tính từ chính dữ liệu, ngăn bằng khoảng trắng rộng
             chứ không phải dấu chấm giữa). ── */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <header>
        <p className="text-sm font-semibold text-warm">Địa điểm</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Đi đâu ở {placeName}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Stat glyph="pin">
            <b className="font-semibold text-foreground">{items.length}</b> địa
            điểm
          </Stat>
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
        </div>
      </header>

      {/* Kiểu xem nép về mép phải hàng tiêu đề: nó là công cụ phụ, không được
          nặng ngang tên mục. Nhiều nút chung một khung có viền thì bo ở KHUNG +
          `overflow-hidden`, nút con để vuông — bo từng nút thì nền của nút đang
          chọn thành mảng lửng lơ bên trong khung. */}
      <div
        role="group"
        aria-label="Kiểu hiển thị"
        className={cn(
          R_CTRL,
          "flex shrink-0 items-center overflow-hidden border border-border",
        )}
      >
        <ViewBtn
          glyph="grid"
          label="Lưới ảnh"
          active={view === "grid"}
          onClick={() => chooseView("grid")}
        />
        <ViewBtn
          glyph="rows"
          label="Danh sách"
          active={view === "list"}
          onClick={() => chooseView("list")}
        />
      </div>
      </div>

      {/* ── Lọc theo loại cảnh. Chip HAIRLINE VUÔNG (R_CTRL 4px) theo đúng bộ
             điều khiển của trang cha `/diem-den` và của `/ban-do`, không phải
             viên tròn xám. ── */}
      {cats.length > 1 && (
        <div className="hide-scrollbar -mx-4 mt-7 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex items-center gap-2 sm:flex-wrap">
            <CatChip
              active={effective === "all"}
              onClick={() => chooseCat("all")}
              count={spots.length}
            >
              Tất cả
            </CatChip>
            {cats.map((c) => (
              <CatChip
                key={c.value}
                active={effective === c.value}
                onClick={() => chooseCat(c.value)}
                count={c.count}
              >
                {c.label}
              </CatChip>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span
            aria-hidden
            className={cn(
              R_CARD,
              "grid size-12 place-items-center bg-muted text-muted-foreground",
            )}
          >
            <Glyph name="search" className="size-5" />
          </span>
          <p className="mt-4 text-lg font-semibold tracking-tight">
            {activeCat
              ? `Chưa có địa điểm nào thuộc loại “${activeCat.label}”`
              : "Chưa có địa điểm nào ở đây"}
          </p>
          <button
            type="button"
            onClick={() => chooseCat("all")}
            className={cn(
              R_CTRL,
              "mt-5 inline-flex h-9 items-center border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary",
            )}
          >
            Xem tất cả địa điểm
          </button>
        </div>
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

// Chip lọc loại: nhãn + số mục. Con số là lý do dùng chip thay vì segmented —
// biết trước bấm vào còn bao nhiêu thì không ai phải thử từng loại.
function CatChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        R_CTRL,
        "inline-flex h-9 shrink-0 items-center gap-1.5 border px-3.5 text-[0.8125rem] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {children}
      <span className={cn("tabular-nums", active ? "opacity-60" : "opacity-50")}>
        {count}
      </span>
    </button>
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


function ViewBtn({
  glyph,
  active,
  onClick,
  label,
}: {
  glyph: GlyphName;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-10 place-items-center transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Glyph name={glyph} className="size-4" />
    </button>
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
