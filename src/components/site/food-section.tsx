"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { FilterChip } from "@/components/site/listing-filter";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import { coverUrl } from "@/lib/place-image";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";
import {
  formatMinutes,
  hoursSpan,
  openingStatus,
  parseOpeningHours,
  vietnamMinutesNow,
  type OpeningStatus,
} from "@/lib/opening-hours";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  EateryDetail,
  type EateryDetailData,
} from "@/components/site/eatery-detail";

export type FoodExperience = {
  slug: string;
  name: string;
  description: string | null;
  durationText: string | null;
  images: { url: string; isCover: boolean }[];
};

// ═══════════════════════════════════════════════════════════════════════════
// MÀN HÌNH ẨM THỰC — MỘT danh sách quán, một bộ điều khiển.
//
// Câu hỏi thật của người mở tab này, theo đúng thứ tự hay gặp:
//   ❶ "giờ này còn chỗ nào mở?"  ❷ "bữa nào?"  ❸ "kiểu gì / có chỗ ngồi ngắm
//   cảnh không?".  Bố cục bám đúng ba câu đó.
//
// ❶ được trả lời bằng `openingHours` — thứ vốn nằm im trong drawer. Dữ liệu
//    biên tập đang ở dạng đọc được ("16:00 – 23:00", "5:30 – 10:00, 15:00 –
//    19:00"), nên mỗi thẻ mang một huy hiệu trạng thái tính theo GIỜ VIỆT NAM,
//    kèm một chip lọc "Đang mở". Đây là thông tin đắt nhất của cả trang: 20h
//    thì hơn nửa danh sách đã đóng cửa, mà bản cũ không hé lộ điều đó ở đâu cả.
//
// KHÔNG còn chia hai khối "Ăn ở đâu" / "Quán nước & cà phê" theo `venueKind`.
// Trục đó không sạch trong dữ liệu thật: "Hải sản Bờ Kè 24" và "Ốc nướng Bờ Kè"
// là `eat` nhưng có `viewType = sea` — quán view đúng nghĩa mà bị nhốt ngoài
// mục quán view; ngược lại "Chè Thái" là `drink` nhưng không có view nên mọi
// chip hướng nhìn đều loại nó ra. Quán `both` thì đếm hai lần (13 + 4 = 17 cho
// 15 quán). Việc "đến để ăn hay để ngồi" đã được trục BỮA diễn đạt chính xác
// hơn (`cafe` là một bữa), còn cảnh đẹp thành MỘT BỘ LỌC ("Có view") + huy hiệu
// trên thẻ — nên quán ăn sát biển cuối cùng cũng được khoe view của nó.
//
// Cũng đã bỏ thanh nhảy dính 3 chip + scroll-spy: một danh sách thì không có gì
// để nhảy giữa, và 15 mục không đáng ba tầng điều khiển.
// ═══════════════════════════════════════════════════════════════════════════
export function FoodSection({
  placeName,
  eateries,
  experiences,
}: {
  placeName: string;
  eateries: EateryDetailData[];
  experiences: FoodExperience[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [meal, setMeal] = useState(() => searchParams.get("meal") ?? "all");
  const [cat, setCat] = useState("all");
  const [viewOnly, setViewOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  // Mở quán nào, và mở thẳng vào tab nào (rê chuột xem thực đơn rồi bấm thì
  // vào luôn tab Thực đơn).
  const [selected, setSelected] = useState<{
    slug: string;
    tab: "anh" | "menu";
  } | null>(null);

  // Đồng hồ chỉ chạy Ở CLIENT: server không biết "bây giờ" của người xem, mà
  // trang lại được cache. Render lần đầu không có huy hiệu, hydrate xong mới
  // hiện — huy hiệu nằm đè trên ảnh nên không đẩy bố cục.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(vietnamMinutesNow());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Giờ mở cửa đọc sẵn một lần cho cả danh sách.
  const hours = useMemo(
    () => new Map(eateries.map((e) => [e.slug, parseOpeningHours(e.openingHours)])),
    [eateries],
  );
  const statusOf = (slug: string): OpeningStatus | null =>
    now == null ? null : openingStatus(hours.get(slug) ?? null, now);

  // ── Trục lọc: chỉ hiện giá trị THẬT SỰ có trong dữ liệu ──
  const mealOptions = useMemo(() => {
    const present = new Set(eateries.flatMap((e) => e.meals));
    return Object.keys(MEAL_LABELS).filter((m) => present.has(m));
  }, [eateries]);

  // Bỏ chip kiểu nào trùng tên với một chip bữa (`cafe` → "Cà phê" ở cả hai
  // bảng nhãn): hai viên chữ giống hệt nhau trên cùng màn hình thì người dùng
  // không thể biết chúng khác gì.
  const catOptions = useMemo(() => {
    const shownMeals = new Set(mealOptions.map((m) => label(MEAL_LABELS, m)));
    const present = new Set(eateries.map((e) => e.category).filter(Boolean));
    return Object.keys(EATERY_CATEGORY_LABELS).filter(
      (c) => present.has(c) && !shownMeals.has(label(EATERY_CATEGORY_LABELS, c)),
    );
  }, [eateries, mealOptions]);

  const withView = useMemo(
    () => eateries.filter((e) => e.viewType).length,
    [eateries],
  );
  const openCount = useMemo(() => {
    if (now == null) return null;
    return eateries.filter((e) => {
      const s = openingStatus(hours.get(e.slug) ?? null, now);
      return s?.kind === "open" || s?.kind === "closingSoon";
    }).length;
  }, [eateries, hours, now]);

  // Khung giờ chung — dữ kiện thật thay cho đoạn văn giới thiệu viết tay.
  // Thành phần theo KIỂU MÓN + số quán có lưu ý — hai thứ chỉ thấy được khi
  // nhìn cả danh sách. Đếm trên TOÀN BỘ quán, không theo bộ lọc: đây là câu mô
  // tả cả tab, còn con số theo bộ lọc thì dòng kết quả bên dưới đã lo.
  const composition = useMemo(
    () =>
      compositionLine(
        countByLabel(
          eateries.map((e) => label(EATERY_CATEGORY_LABELS, e.category)),
        ),
        eateries.length,
      ),
    [eateries],
  );
  const noticed = useMemo(
    () => eateries.filter((e) => e.notice).length,
    [eateries],
  );

  const span = useMemo(
    () => hoursSpan(eateries.map((e) => e.openingHours)),
    [eateries],
  );

  const list = eateries.filter((e) => {
    if (meal !== "all" && !e.meals.includes(meal)) return false;
    if (cat !== "all" && e.category !== cat) return false;
    if (viewOnly && !e.viewType) return false;
    if (openOnly) {
      const s = statusOf(e.slug);
      if (s?.kind !== "open" && s?.kind !== "closingSoon") return false;
    }
    return true;
  });

  const activeFilters =
    Number(meal !== "all") + Number(cat !== "all") + Number(viewOnly) + Number(openOnly);
  const clearAll = () => {
    chooseMeal("all");
    setCat("all");
    setViewOnly(false);
    setOpenOnly(false);
  };

  // Bữa đang lọc lưu vào URL (?meal=) để giữ khi chia sẻ / quay lại.
  function chooseMeal(m: string) {
    setMeal(m);
    const params = new URLSearchParams(searchParams.toString());
    if (m === "all") params.delete("meal");
    else params.set("meal", m);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const bySlug = useMemo(
    () => new Map(eateries.map((e) => [e.slug, e])),
    [eateries],
  );

  // Deep-link từ trang khác (vd card "Quán ăn gần đây" ở /dia-diem):
  // #eatery-<slug> → mở đúng drawer khi vào trang.
  useEffect(() => {
    const m = window.location.hash.match(/^#eatery-(.+)$/);
    if (!m) return;
    const slug = decodeURIComponent(m[1]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bySlug.has(slug)) setSelected({ slug, tab: "anh" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ đọc hash lúc mount

  const active = selected ? bySlug.get(selected.slug) : undefined;

  return (
    <div>
      {/* ── Mở đầu: tên + dữ kiện tính từ chính dữ liệu.
             BỎ nhãn nhỏ "Ẩm thực": thanh tab ngay trên đã có mục đó đang sáng.
             Mục đầu của dải đổi từ "n quán" sang THÀNH PHẦN — con số đó đã nằm
             ở dòng kết quả ngay dưới bộ lọc (và còn đúng theo bộ lọc, trong khi
             con số ở đây thì không). ── */}
      <header>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ăn uống ở {placeName}
        </h2>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Stat glyph="bowl">
            {composition ?? (
              <>
                <b className="font-semibold text-foreground">
                  {eateries.length}
                </b>{" "}
                quán
              </>
            )}
          </Stat>
          {withView > 0 && (
            <Stat glyph="eye">
              <b className="font-semibold text-foreground">{withView}</b> chỗ ngồi
              có view
            </Stat>
          )}
          {span && (
            <Stat glyph="clock">
              mở từ{" "}
              <b className="font-semibold text-foreground">
                {formatMinutes(span.earliest)}
              </b>{" "}
              đến{" "}
              <b className="font-semibold text-foreground">
                {formatMinutes(span.latest)}
              </b>
            </Stat>
          )}
          {noticed > 0 && (
            <Stat glyph="warn">
              <b className="font-semibold text-foreground">{noticed}</b> quán có
              lưu ý
            </Stat>
          )}
        </div>
      </header>

      {/* ── Thanh lọc dính. Ghim ngay dưới PlaceTabs (cao 3rem; từ lg còn cộng
             header 4rem) — bản cũ để `top-28` ở mọi khổ nên trên điện thoại nó
             lửng lơ cách thanh tab 4rem, hở một dải nội dung chạy phía sau. ── */}
      <div className="sticky top-12 z-30 -mx-4 mt-8 border-b border-border/60 bg-background/90 px-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:top-28">
        {/* Hàng chính: trạng thái mở cửa + bữa */}
        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <FilterChip
            active={openOnly}
            onClick={() => setOpenOnly((v) => !v)}
            count={openCount}
            glyph="clock"
            tone="live"
          >
            Đang mở
          </FilterChip>
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <FilterChip active={meal === "all"} onClick={() => chooseMeal("all")}>
            Mọi bữa
          </FilterChip>
          {mealOptions.map((m) => (
            <FilterChip key={m} active={meal === m} onClick={() => chooseMeal(m)}>
              {label(MEAL_LABELS, m)}
            </FilterChip>
          ))}
        </div>

        {/* Hàng phụ: kiểu món + có view */}
        {(catOptions.length > 0 || withView > 0) && (
          <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto pb-3">
            {catOptions.length > 0 && (
              <>
                <span className="shrink-0 pr-0.5 text-xs font-medium text-muted-foreground/70">
                  Kiểu
                </span>
                <FilterChip small active={cat === "all"} onClick={() => setCat("all")}>
                  Tất cả
                </FilterChip>
                {catOptions.map((c) => (
                  <FilterChip
                    key={c}
                    small
                    active={cat === c}
                    onClick={() => setCat(c)}
                  >
                    {label(EATERY_CATEGORY_LABELS, c)}
                  </FilterChip>
                ))}
              </>
            )}
            {withView > 0 && (
              <>
                {catOptions.length > 0 && (
                  <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
                )}
                <FilterChip
                  small
                  active={viewOnly}
                  onClick={() => setViewOnly((v) => !v)}
                  count={withView}
                  glyph="eye"
                >
                  Có view
                </FilterChip>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Dòng kết quả ── */}
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          <b className="font-semibold tabular-nums text-foreground">
            {list.length}
          </b>{" "}
          quán
        </span>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            Bỏ lọc
            <Glyph name="close" className="size-3 opacity-60" />
          </button>
        )}
      </p>

      {list.length > 0 ? (
        <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EateryCard
              key={e.slug}
              eatery={e}
              status={statusOf(e.slug)}
              onOpen={(tab) => setSelected({ slug: e.slug, tab })}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            {openOnly && now != null
              ? `Giờ này (${formatMinutes(now)}) không quán nào còn mở.`
              : "Không có quán nào khớp bộ lọc này."}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả {eateries.length} quán
          </button>
        </div>
      )}

      {/* ── Trải nghiệm ẩm thực: tour / lớp học — đích khác (trang chi tiết
             hoạt động), nên tách khối riêng ở cuối. ── */}
      {experiences.length > 0 && (
        <section className="mt-16 border-t border-border/60 pt-10">
          <div className="flex items-center gap-3">
            <span className={cn(R_CARD, "grid size-10 shrink-0 place-items-center bg-warm/10 text-warm")}>
              <Glyph name="chef" className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                Trải nghiệm ẩm thực
              </h3>
              <p className="text-xs text-muted-foreground">
                <b className="font-semibold text-foreground">
                  {experiences.length}
                </b>{" "}
                trải nghiệm — không chỉ ăn, mà xem cách làm ra
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((x) => (
              <ExperienceCard key={x.slug} exp={x} />
            ))}
          </div>
        </section>
      )}

      {/* Popup chi tiết. Dưới `sm` dán đáy màn hình và trượt lên (một tay cầm
          máy vẫn với tới được); từ `sm` là popup giữa màn, rộng để chứa bố cục
          hai cột ảnh | nội dung. */}
      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full max-w-none gap-0 overflow-hidden border-0 p-0 shadow-2xl",
            // Bo góc theo bộ chung của trang (`R_CARD` 6px) thay cho 24px:
            // popup là một KHỐI BAO, cùng hạng với thẻ quán ngay sau lưng nó.
            "top-auto bottom-0 left-0 max-h-[92dvh] translate-x-0 translate-y-0 rounded-t-[6px]",
            "data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
            "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:max-w-[min(64rem,calc(100vw-3rem))] sm:rounded-b-[6px]",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0",
          )}
        >
          {active && (
            <>
              <EateryDetail
                data={active}
                status={statusOf(active.slug)}
                initialTab={selected?.tab}
              />
              {/* Nút đóng tự dựng: nút mặc định là chữ X trần, đặt trên ảnh sẽ
                  chìm — cái này có nền mờ nên đọc được trên mọi tấm ảnh. */}
              <DialogClose
                className={cn(R_CTRL, "absolute right-3 top-3 z-10 grid size-9 place-items-center bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background")}
                aria-label="Đóng"
              >
                <Glyph name="close" className="size-4" />
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
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

// ── Thẻ quán: MỘT ngôn ngữ cho mọi quán (ăn, uống, hay cả hai) ──
// Ảnh 4/3 làm chủ; huy hiệu trạng thái ở góc trái, hướng nhìn ở góc phải —
// hai thứ quyết định "ghé hay bỏ qua" nằm ngay trên ảnh, không phải đọc mới thấy.
//
// Quán có ảnh thực đơn: rê chuột vào thì ảnh bìa mờ đi và TẤM THỰC ĐƠN hiện ra.
// Ba điều kèm theo, thiếu cái nào là hỏng:
//  · Huy hiệu "Thực đơn" luôn hiện (không chỉ khi hover) — điện thoại không có
//    hover, mà đó mới là phần lớn khách. Rê chuột chỉ là phần thưởng thêm.
//  · Đổi ảnh bằng CSS thuần (`group-hover`), không state React → không có
//    chuyện nháy khi chuột lướt ngang qua lưới.
//  · Bấm trong lúc đang xem thực đơn thì popup mở thẳng tab Thực đơn. Rê chuột
//    ra menu rồi bấm lại thấy ảnh quán thì hoá ra lừa. Trạng thái hover giữ
//    trong `useRef` — chỉ đọc lúc bấm, nên không gây render lại.
function EateryCard({
  eatery: e,
  status,
  onOpen,
}: {
  eatery: EateryDetailData;
  status: OpeningStatus | null;
  onOpen: (tab: "anh" | "menu") => void;
}) {
  const area = e.wardName || null;
  const category = e.category ? label(EATERY_CATEGORY_LABELS, e.category) : null;
  const viewLabel = label(VIEW_TYPE_LABELS, e.viewType);
  const dimmed = status?.kind === "opensLater" || status?.kind === "closed";
  const menuShot = e.menuImages[0];
  const peeking = useRef(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(peeking.current && menuShot ? "menu" : "anh")}
      onMouseEnter={() => (peeking.current = true)}
      onMouseLeave={() => (peeking.current = false)}
      onFocus={() => (peeking.current = true)}
      onBlur={() => (peeking.current = false)}
      aria-label={`Xem chi tiết ${e.name}`}
      className="group block w-full text-left"
    >
      <div
        className={cn(
          R_CARD,
          "relative aspect-[3/2] overflow-hidden bg-muted",
        )}
      >
        <Image
          src={coverUrl(e.images, e.slug)}
          alt={e.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            // Quán đã đóng cửa lùi lại một bước — vẫn xem được, nhưng mắt
            // không bị nó tranh chỗ với những nơi đang mở.
            dimmed && "saturate-[0.7]",
          )}
        />

        {/* Tấm thực đơn hiện đè lên khi rê chuột / focus bàn phím. Nền tối +
            `contain` giống hệt tab Thực đơn trong popup — cùng một vật, cùng
            một cách trình bày. */}
        {menuShot && (
          <span
            className="absolute inset-0 bg-foreground/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          >
            <Image
              src={menuShot.url}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain p-3"
            />
          </span>
        )}

        {/* Huy hiệu LOẠI MÓN ở góc trái — cùng chỗ, cùng khuôn với thẻ Địa
            điểm và Trải nghiệm. Trước đây chỗ này là huy hiệu trạng thái mở
            cửa, còn loại món nằm dưới ảnh dạng chữ; đổi vì hai lý do: ba tab
            danh sách phải đọc ra cùng một họ, và trạng thái mở cửa vốn là một
            DÒNG TIN có giờ đi kèm chứ không phải một cái nhãn. */}
        {category && (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm",
            )}
          >
            {category}
          </span>
        )}
        {viewLabel && (
          <span
            className={cn(
              R_BADGE,
              "absolute right-3 top-3 inline-flex items-center gap-1 bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold text-neutral-900 shadow-sm backdrop-blur-sm",
            )}
          >
            <Glyph name="eye" className="size-3.5 shrink-0" />
            Nhìn ra {viewLabel.toLowerCase()}
          </span>
        )}
        {menuShot && (
          <span
            className={cn(
              R_BADGE,
              "absolute bottom-3 left-3 inline-flex items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-sm",
            )}
          >
            <Glyph name="bowl" className="size-3.5 shrink-0" />
            Thực đơn
          </span>
        )}
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {e.name}
      </h3>

      {area && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Glyph name="pin" className="size-3.5 shrink-0" />
          <span className="truncate">{area}</span>
        </p>
      )}

      {e.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {e.description}
        </p>
      )}

      {/* Các dòng "đổi quyết định". Dòng TRẠNG THÁI đứng đầu vì nó là tin sống
          — và nó cõng luôn giờ mở cửa, thứ trước đây phải nằm riêng ở kicker
          ngăn bằng dấu chấm giữa (trái quy ước dải phân cách). */}
      <div className="mt-3 space-y-1.5">
        {(status || e.openingHours) && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {status && <StatusLine status={status} />}
            {e.openingHours && (
              <span className="tabular-nums text-muted-foreground">
                {e.openingHours}
              </span>
            )}
          </p>
        )}
          {e.bestTime && (
            <p className="flex gap-1.5 text-xs font-medium text-primary">
              <Glyph name="sunrise" className="mt-px size-3.5 shrink-0" />
              <span className="line-clamp-1">{e.bestTime}</span>
            </p>
          )}
          {e.notice && (
            <p className="flex gap-1.5 text-xs text-warm">
              <Glyph name="warn" className="mt-px size-3.5 shrink-0" />
              <span className="line-clamp-2">{e.notice}</span>
            </p>
          )}
      </div>
    </button>
  );
}

// Huy hiệu trạng thái — dùng đúng token có sẵn: primary (xanh) = đang mở,
// warm (cam) = sắp đóng, xám = đang đóng. Không thêm màu mới cho một trạng thái.
/* Trạng thái mở cửa dạng DÒNG TIN (chấm màu + chữ), thay cho huy hiệu góc ảnh.
   Cùng bảng màu với dòng trạng thái ở popup — `statusView()` là một nguồn duy
   nhất cho cả hai chỗ. */
function StatusLine({ status }: { status: OpeningStatus }) {
  const s = statusView(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", s.tone)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", s.dot)}
        aria-hidden
      />
      {s.text}
    </span>
  );
}

function statusView(status: OpeningStatus) {
  const map = {
    open: { text: "Đang mở", tone: "text-primary", dot: "bg-primary" },
    closingSoon: {
      text: `Sắp đóng · ${formatMinutes(status.kind === "closingSoon" ? status.closesAt : 0)}`,
      tone: "text-warm",
      dot: "bg-warm",
    },
    opensLater: {
      text: `Mở lúc ${formatMinutes(status.kind === "opensLater" ? status.opensAt : 0)}`,
      tone: "text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
    closed: {
      text: "Đã đóng cửa",
      tone: "text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
  } as const;
  return map[status.kind];
}

// Thẻ trải nghiệm — cùng khuôn thẻ quán để trang giữ một nhịp, chỉ khác ở nhãn
// góc ảnh và dòng đáy dẫn sang trang chi tiết.
function ExperienceCard({ exp }: { exp: FoodExperience }) {
  return (
    <Link
      href={`/hoat-dong/${exp.slug}`}
      className="group block"
    >
      <div
        className={cn(R_CARD, "relative aspect-[3/2] overflow-hidden bg-muted")}
      >
        <Image
          src={coverUrl(exp.images, exp.slug)}
          alt={exp.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span
          className={cn(
            R_BADGE,
            "absolute left-3 top-3 bg-warm/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-warm-foreground shadow-sm",
          )}
        >
          Trải nghiệm
        </span>
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {exp.name}
      </h3>
      {exp.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {exp.description}
        </p>
      )}
      {exp.durationText && (
        <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground">
          <Glyph name="clock" className="mt-px size-3.5 shrink-0" />
          {exp.durationText}
        </p>
      )}
    </Link>
  );
}

