"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  ChefHat,
  Clock,
  UtensilsCrossed,
  ChevronRight,
  Eye,
  Sunrise,
  TriangleAlert,
  Utensils,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
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
      {/* ── Mở đầu: tên + ba dữ kiện tính từ chính dữ liệu ── */}
      <header>
        <p className="text-sm font-semibold text-warm">Ẩm thực</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Ăn uống ở {placeName}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Stat icon={Utensils}>
            <b className="font-semibold text-foreground">{eateries.length}</b> quán
          </Stat>
          {withView > 0 && (
            <Stat icon={Eye}>
              <b className="font-semibold text-foreground">{withView}</b> chỗ ngồi
              có view
            </Stat>
          )}
          {span && (
            <Stat icon={Clock}>
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
        </div>
      </header>

      {/* ── Thanh lọc dính. Ghim ngay dưới PlaceTabs (cao 3rem; từ lg còn cộng
             header 4rem) — bản cũ để `top-28` ở mọi khổ nên trên điện thoại nó
             lửng lơ cách thanh tab 4rem, hở một dải nội dung chạy phía sau. ── */}
      <div className="sticky top-12 z-30 -mx-4 mt-8 border-b border-border/60 bg-background/90 px-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:top-28">
        {/* Hàng chính: trạng thái mở cửa + bữa */}
        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <Chip
            active={openOnly}
            onClick={() => setOpenOnly((v) => !v)}
            count={openCount}
            icon={Clock}
            tone="live"
          >
            Đang mở
          </Chip>
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <Chip active={meal === "all"} onClick={() => chooseMeal("all")}>
            Mọi bữa
          </Chip>
          {mealOptions.map((m) => (
            <Chip key={m} active={meal === m} onClick={() => chooseMeal(m)}>
              {label(MEAL_LABELS, m)}
            </Chip>
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
                <Chip small active={cat === "all"} onClick={() => setCat("all")}>
                  Tất cả
                </Chip>
                {catOptions.map((c) => (
                  <Chip
                    key={c}
                    small
                    active={cat === c}
                    onClick={() => setCat(c)}
                  >
                    {label(EATERY_CATEGORY_LABELS, c)}
                  </Chip>
                ))}
              </>
            )}
            {withView > 0 && (
              <>
                {catOptions.length > 0 && (
                  <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
                )}
                <Chip
                  small
                  active={viewOnly}
                  onClick={() => setViewOnly((v) => !v)}
                  count={withView}
                  icon={Eye}
                >
                  Có view
                </Chip>
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
            <X className="size-3 opacity-60" aria-hidden />
          </button>
        )}
      </p>

      {list.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warm/10 text-warm">
              <ChefHat className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                Trải nghiệm ẩm thực
              </h3>
              <p className="text-xs text-muted-foreground">
                {experiences.length} trải nghiệm · không chỉ ăn, mà xem cách làm ra
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            "top-auto bottom-0 left-0 max-h-[92dvh] translate-x-0 translate-y-0 rounded-3xl rounded-b-none",
            "data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
            "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:max-w-[min(64rem,calc(100vw-3rem))] sm:rounded-b-3xl",
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
                className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                aria-label="Đóng"
              >
                <X className="size-4" aria-hidden />
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
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
      className="group flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-sm shadow-black/5 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
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

        {status && <StatusBadge status={status} />}
        {viewLabel && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
            <Eye className="size-3 shrink-0 text-primary" aria-hidden />
            Nhìn ra {viewLabel.toLowerCase()}
          </span>
        )}
        {menuShot && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
            <UtensilsCrossed className="size-3 shrink-0" aria-hidden />
            Thực đơn
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Kicker: loại món · giờ mở cửa. Giờ cụ thể đứng ngay đây vì huy hiệu
            chỉ nói "đang mở", không nói mở tới mấy giờ. */}
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {category && (
            <span className="font-semibold text-warm">{category}</span>
          )}
          {category && e.openingHours && <span aria-hidden>·</span>}
          {e.openingHours && (
            <span className="tabular-nums">{e.openingHours}</span>
          )}
        </p>

        <h3 className="mt-1 font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {e.name}
        </h3>

        {area && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{area}</span>
          </p>
        )}

        {e.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {e.description}
          </p>
        )}

        {/* Hai dòng "đổi quyết định", đẩy xuống đáy thẻ cho thẳng hàng nhau.
            Không có dòng nào thì không chừa chỗ — nếu không thẻ trống lại thừa
            một khoảng đệm so với thẻ bên cạnh. */}
        <div
          className={cn(
            "mt-auto space-y-1.5",
            (e.bestTime || e.notice) && "pt-3",
          )}
        >
          {e.bestTime && (
            <p className="flex gap-1.5 text-xs font-medium text-primary">
              <Sunrise className="mt-px size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{e.bestTime}</span>
            </p>
          )}
          {e.notice && (
            <p className="flex gap-1.5 text-xs text-warm">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-2">{e.notice}</span>
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// Huy hiệu trạng thái — dùng đúng token có sẵn: primary (xanh) = đang mở,
// warm (cam) = sắp đóng, xám = đang đóng. Không thêm màu mới cho một trạng thái.
function StatusBadge({ status }: { status: OpeningStatus }) {
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
  const s = map[status.kind];
  return (
    <span
      className={cn(
        "absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
        s.tone,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} aria-hidden />
      {s.text}
    </span>
  );
}

// Thẻ trải nghiệm — cùng khuôn thẻ quán để trang giữ một nhịp, chỉ khác ở nhãn
// góc ảnh và dòng đáy dẫn sang trang chi tiết.
function ExperienceCard({ exp }: { exp: FoodExperience }) {
  return (
    <Link
      href={`/hoat-dong/${exp.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm shadow-black/5 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
        <Image
          src={coverUrl(exp.images, exp.slug)}
          alt={exp.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-warm/95 px-2.5 py-1 text-xs font-semibold text-warm-foreground shadow-sm">
          Trải nghiệm
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {exp.name}
        </h3>
        {exp.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {exp.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          {exp.durationText ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {exp.durationText}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            Xem chi tiết
            <ChevronRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Chip lọc dùng chung. `tone="live"` cho "Đang mở": khi tắt vẫn mang màu primary
// nhạt để mắt thấy ngay là có một lối lọc theo thời gian thực ở đây.
function Chip({
  active,
  onClick,
  children,
  count,
  icon: Icon,
  small = false,
  tone = "plain",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  small?: boolean;
  tone?: "plain" | "live";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-colors",
        small ? "px-3 py-1 text-xs" : "px-3.5 py-2 text-sm",
        active
          ? "bg-foreground text-background"
          : tone === "live"
            ? "bg-primary/10 text-primary hover:bg-primary/15"
            : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {Icon && <Icon className={small ? "size-3" : "size-3.5"} aria-hidden />}
      {children}
      {count != null && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-background/60" : "opacity-60",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
