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

export type ActivityListItem = {
  slug: string;
  name: string;
  description: string | null;
  category: string | null; // giá trị enum — khoá lọc & tham số ?cat=
  categoryLabel: string | null;
  duration: string | null; // "2 ngày 1 đêm", "nửa buổi"
  season: string | null; // "Tháng 10 – 4", "Quanh năm"
  price: string | null; // giá tham gia đã định dạng (null = không thu phí)
  operator: string | null; // đơn vị khai thác
  spots: { slug: string; name: string }[]; // diễn ra ở những địa điểm nào
  images: { url: string; isCover: boolean }[];
};

/* ──────────────────────────────────────────────────────────────────
   Tab TRẢI NGHIỆM của một điểm đến.
   Trước đây tab này dùng `ListingView` — một component "danh sách listing
   chung chung" mà thẻ của nó chỉ có ảnh, tên, một dòng mô tả và giá. Với một
   HOẠT ĐỘNG thì đó là ba câu hỏi bị bỏ trống:

     · **đi mất bao lâu** — `durationText` có ở 17/19 hoạt động trong dữ liệu
       thật ("2 ngày 1 đêm" khác hẳn "30–60 phút", và nó quyết định xem việc đó
       có nhét vừa chuyến hay không);
     · **mùa nào làm được** — `seasonText` có ở 15/19 ("Tháng 2 – 4" cho hoa đỗ
       quyên, "Tháng 10 – 4" cho săn mây). Đi sai mùa là đi hụt;
     · **làm ở đâu** — quan hệ M:N `Activity ↔ Spot` là XƯƠNG SỐNG của phần này
       theo CLAUDE.md, mà tab lại không hiện lấy một cái tên.

   Cả ba đều đã nằm trong DB từ đầu. Thẻ ở đây mang hai cái đầu; cái thứ ba là
   phần thưởng của dạng DANH SÁCH (cột chữ rộng gấp ba), đúng như tab Địa điểm
   dùng cột rộng để hiện "Làm gì" — hai tab là hai chiều của cùng một quan hệ.

   Khung (lọc theo loại · đổi kiểu xem · trạng thái rỗng) dùng chung với tab
   Địa điểm qua `listing-filter.tsx`; chỉ nội dung thẻ là khác.
   ────────────────────────────────────────────────────────────────── */
export function ActivitySection({
  activities,
  placeName,
  initialView = "grid",
}: {
  activities: ActivityListItem[];
  placeName: string;
  initialView?: ListViewMode;
}) {
  const { cats, activeCat, effective, filtered, chooseCat } =
    useCatFilter(activities);
  const [view, chooseView] = useListView(initialView);
  const items = filtered;

  // Dải dữ kiện đếm trên TẬP ĐANG HIỆN — lọc còn 3 mà dòng trên vẫn ghi 10 thì
  // con số đó nói về một danh sách khác với thứ đang nhìn thấy.
  const paid = items.filter((a) => a.price).length;
  const organized = items.filter((a) => a.operator).length;
  const composition =
    effective === "all" ? compositionLine(cats, activities.length) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <header>
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Chơi gì ở {placeName}
          </h2>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Stat glyph="sparkle">
              {composition ?? (
                <>
                  <b className="font-semibold tabular-nums text-foreground">
                    {items.length}
                  </b>{" "}
                  hoạt động
                </>
              )}
            </Stat>
            {paid > 0 && (
              <Stat glyph="ticket">
                <b className="font-semibold tabular-nums text-foreground">
                  {paid}
                </b>{" "}
                có thu phí
              </Stat>
            )}
            {organized > 0 && (
              <Stat glyph="check">
                <b className="font-semibold tabular-nums text-foreground">
                  {organized}
                </b>{" "}
                có đơn vị tổ chức
              </Stat>
            )}
          </div>
        </header>

        <ViewToggle view={view} onChange={chooseView} />
      </div>

      <CatChipRow
        cats={cats}
        effective={effective}
        total={activities.length}
        onChoose={chooseCat}
      />

      {items.length === 0 ? (
        <EmptyFilter
          categoryLabel={activeCat?.label}
          unit="hoạt động"
          onReset={() => chooseCat("all")}
        />
      ) : view === "grid" ? (
        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <ActivityCard key={a.slug} a={a} />
          ))}
        </div>
      ) : (
        <ul className="mt-8 border-t border-border/60">
          {items.map((a) => (
            <li key={a.slug} className="border-b border-border/60">
              <ActivityRow a={a} />
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
      <Glyph
        name={glyph}
        className="size-[1.05rem] shrink-0 text-muted-foreground/70"
      />
      {children}
    </span>
  );
}

/* Hai dòng "đổi quyết định" của một hoạt động, dùng chung cho lưới và danh sách.
   MÙA để màu xanh, THỜI LƯỢNG để xám — cùng luật với thẻ địa điểm bên tab kia:
   dòng xanh luôn là "đi lúc nào cho đúng". Nhờ vậy hai tab đọc ra cùng một
   ngôn ngữ dù nói về hai loại dữ liệu khác nhau. */
function FactLines({ a }: { a: ActivityListItem }) {
  if (!a.season && !a.duration) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {a.season && (
        <p className="flex gap-1.5 text-xs font-medium text-primary">
          <Glyph name="calendar" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-1">{a.season}</span>
        </p>
      )}
      {a.duration && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <Glyph name="clock" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-1">{a.duration}</span>
        </p>
      )}
    </div>
  );
}

function Cover({ a, sizes }: { a: ActivityListItem; sizes: string }) {
  return (
    <>
      <Image
        src={coverUrl(a.images, a.slug, 900, 600)}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {a.categoryLabel && (
        <span
          className={cn(
            R_BADGE,
            "absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm",
          )}
        >
          {a.categoryLabel}
        </span>
      )}
      {/* Huy hiệu giá CHỈ cho hoạt động có thu phí — phần lớn hoạt động là việc
          tự làm được, dán "Miễn phí" lên gần hết thẻ thì chữ đó thành nền. Số
          nơi có thu phí đã gộp lên dải dữ kiện đầu mục. */}
      {a.price && (
        <span
          className={cn(
            R_BADGE,
            "absolute right-3 top-3 inline-flex items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-white backdrop-blur-sm",
          )}
        >
          <Glyph name="ticket" className="size-3.5 shrink-0" />
          {a.price}
        </span>
      )}
    </>
  );
}

function ActivityCard({ a }: { a: ActivityListItem }) {
  return (
    <Link href={`/hoat-dong/${a.slug}`} className="group block">
      <div className={cn(R_CARD, "relative aspect-[3/2] overflow-hidden bg-muted")}>
        <Cover
          a={a}
          sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 92vw"
        />
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {a.name}
      </h3>

      {a.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {a.description}
        </p>
      )}

      <FactLines a={a} />
    </Link>
  );
}

/* Hàng danh sách — ảnh trái, chữ phải. Cột chữ rộng gấp ba thẻ lưới nên gánh
   thêm hai thứ lưới không có chỗ: **diễn ra ở đâu** (quan hệ M:N tới `Spot`) và
   **đơn vị tổ chức**. Đó là lý do tồn tại của dạng này, không phải "cùng nội
   dung xếp khác kiểu".

   Chip dùng NỀN chứ không viền: cả hàng đã là một link, chip có viền sẽ mời bấm
   vào một thứ không bấm được. */
function ActivityRow({ a }: { a: ActivityListItem }) {
  return (
    <Link
      href={`/hoat-dong/${a.slug}`}
      className="group flex gap-4 py-5 sm:gap-6 sm:py-6"
    >
      <div
        className={cn(
          R_CARD,
          // Khổ điện thoại: ảnh nhỏ, hàng nằm ngang — đó mới là lý do tồn tại
          // của dạng danh sách. Ảnh tràn ngang rồi xếp dọc thì hàng gần như
          // trùng khít thẻ lưới.
          "relative aspect-[3/2] w-28 shrink-0 self-start overflow-hidden bg-muted sm:w-52 lg:w-64",
        )}
      >
        {/* Ở khổ hẹp ô ảnh chỉ rộng 112px — hai huy hiệu sẽ đè lên nhau và che
            gần hết ảnh, nên chúng chỉ hiện từ `sm`. */}
        <div className="hidden sm:contents">
          <Cover
            a={a}
            sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 112px"
          />
        </div>
        <div className="contents sm:hidden">
          <Image
            src={coverUrl(a.images, a.slug, 400, 267)}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
          {a.name}
        </h3>

        {a.description && (
          <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
            {a.description}
          </p>
        )}

        <FactLines a={a} />

        {a.spots.length > 0 && (
          <TagLine label="Diễn ra ở" items={a.spots.map((s) => s.name)} />
        )}
        {a.operator && <TagLine label="Đơn vị" items={[a.operator]} />}
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
