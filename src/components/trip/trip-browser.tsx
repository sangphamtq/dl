"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  List,
  Route,
  Search,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";

// Bộ duyệt lịch trình mẫu của `/lich-trinh` — phần TƯƠNG TÁC của trang (lọc,
// sắp xếp, đổi kiểu xem, tải thêm). Trang cha vẫn là Server Component và truyền
// xuống danh sách đã lấy sẵn: số mẫu xuất bản đếm trên đầu ngón tay nên lọc ở
// client là đủ, khỏi một vòng server cho mỗi lần bấm chip.
//
// ── MỌI Ô ĐIỀU KHIỂN ĐỀU MỌC TỪ DỮ LIỆU THẬT ────────────────────────────────
// `Trip` KHÔNG có `category` cũng không có `tags`, và cũng không có đánh giá.
// Vì vậy ở đây KHÔNG có hàng chip "sở thích" (Biển đảo · Trekking · Food tour…)
// và KHÔNG có sao/điểm đánh giá trên thẻ — hai thứ đó chỉ dựng được bằng cách
// bịa. Với một site mà cả một mục (`/kiem-tra`, huy hiệu xác minh ở Lưu trú)
// tồn tại để chống thông tin giả thì một hàng "4.8 ★ (128)" bịa là thứ đắt nhất
// có thể mất. Thay vào đó ba trục lọc dưới đây đều đọc thẳng từ dữ liệu:
//   · chip ĐIỂM ĐẾN — nhóm tự nhiên nhất của lịch trình mẫu (mỗi mẫu gắn một Place);
//   · SỐ NGÀY       — câu hỏi đầu tiên của người xếp lịch ("đi mấy ngày");
//   · SẮP XẾP       — nổi bật / ngắn ngày / dài ngày.
// Ô nào chỉ có một giá trị thì TỰ ẨN, khỏi bày một bộ lọc không lọc được gì.
//
// Nút trái tim (lưu lịch trình) trong bản phác cũng chưa dựng: site chưa có
// tính năng lưu chuyến của người khác. Thêm một trái tim không làm gì thì tệ
// hơn là không có.

export type TripCard = {
  slug: string;
  title: string;
  summary: string | null;
  placeName: string | null;
  provinceName: string | null;
  days: number;
  cover: { url: string; alt: string | null } | null;
  dayTitles: string[];
  /** Số điểm dừng của TỪNG ngày, cùng thứ tự với `dayTitles`. */
  dayStops: number[];
};

type SortKey = "featured" | "short" | "long";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Nổi bật" },
  { key: "short", label: "Ít ngày trước" },
  { key: "long", label: "Nhiều ngày trước" },
];

const PAGE = 9;

// Nhãn nhỏ đầu khối — cùng công thức với /blog và /diem-den.
const MICRO = "text-[0.7rem] font-semibold uppercase tracking-[0.14em]";


// Bỏ dấu để tìm kiếm không phân biệt dấu/hoa thường. Cùng hàm với
// destination-filter.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

/** "3 ngày 2 đêm" — số đêm suy từ số ngày, đúng cách người Việt gọi chuyến đi. */
function lengthLabel(days: number): string {
  return days > 1 ? `${days} ngày ${days - 1} đêm` : "1 ngày";
}

export function TripBrowser({ items }: { items: TripCard[] }) {
  const [place, setPlace] = useState("all");
  const [query, setQuery] = useState("");
  const [days, setDays] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visible, setVisible] = useState(PAGE);

  // Mọi thay đổi bộ lọc đều kéo danh sách về trang đầu — nếu không, đang mở 18
  // mục rồi lọc còn 2 thì nút "tải thêm" biến mất mà người dùng không hiểu vì sao.
  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setVisible(PAGE);
    };
  }

  const places = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of items) {
      if (!t.placeName) continue;
      seen.set(t.placeName, (seen.get(t.placeName) ?? 0) + 1);
    }
    return [...seen.entries()].map(([name, count]) => ({ name, count }));
  }, [items]);

  const dayOptions = useMemo(
    () => [...new Set(items.map((t) => t.days))].sort((a, b) => a - b),
    [items],
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    const rows = items.filter((t) => {
      if (place !== "all" && t.placeName !== place) return false;
      if (days !== "all" && String(t.days) !== days) return false;
      if (!q) return true;
      const hay = norm(
        [t.title, t.summary ?? "", t.placeName ?? "", t.provinceName ?? "", ...t.dayTitles].join(" "),
      );
      return hay.includes(q);
    });
    if (sort === "short") return [...rows].sort((a, b) => a.days - b.days);
    if (sort === "long") return [...rows].sort((a, b) => b.days - a.days);
    return rows; // "Nổi bật" = giữ nguyên thứ tự server đã sắp (isFeatured → order)
  }, [items, place, days, query, sort]);

  const shown = filtered.slice(0, visible);
  const filtering = place !== "all" || days !== "all" || query.trim() !== "";

  return (
    <>
      {/* ── Thanh công cụ NỔI, đè lên mép dưới của dải mở đầu ───────────────
          `-mt-7` + `relative z-10`: thanh này là thứ đầu tiên người ta chạm tới
          sau khi đọc tiêu đề, nên nó cưỡi lên ranh giới giữa dải màu và nền
          trắng thay vì xếp hàng bên dưới. */}
      <div className="relative z-10 -mt-7 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-black/5 sm:-mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Ô tìm kiếm có TRẦN bề ngang và cụm ô chọn dồn về mép phải: để ô
              tìm kiếm ăn hết `flex-1` thì ở màn 1440 nó thành một ô trống dài
              1000px — trông như thanh công cụ bị hỏng chứ không như một ô nhập. */}
          <div className="relative sm:w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => reset(setQuery)(e.target.value)}
              placeholder="Tìm lịch trình…"
              aria-label="Tìm lịch trình"
              className="h-11 w-full rounded-xl bg-transparent pl-10 pr-9 text-sm outline-none placeholder:text-muted-foreground/80 focus:bg-muted/50 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => reset(setQuery)("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:ml-auto">
          {dayOptions.length > 1 && (
            <>
              <Divider />
              <Picker
                icon={<CalendarDays className="size-4" aria-hidden />}
                label="Số ngày"
                value={days}
                onChange={reset(setDays)}
                options={[
                  { value: "all", label: "Mọi độ dài" },
                  ...dayOptions.map((d) => ({ value: String(d), label: `${d} ngày` })),
                ]}
              />
            </>
          )}

          <Divider />
          <Picker
            icon={<Route className="size-4" aria-hidden />}
            label="Sắp xếp"
            value={sort}
            onChange={reset((v: string) => setSort(v as SortKey))}
            options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
          />
          </div>
        </div>
      </div>

      {/* ── Chip điểm đến ───────────────────────────────────────────────────
          Trục lọc chính, và là trục DUY NHẤT có thật trong dữ liệu: mỗi mẫu gắn
          một `Place`. Chỉ hiện khi có từ hai điểm đến trở lên. */}
      {places.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active={place === "all"} onClick={() => reset(setPlace)("all")}>
            Tất cả
          </Chip>
          {places.map((p) => (
            <Chip
              key={p.name}
              active={place === p.name}
              onClick={() => reset(setPlace)(p.name)}
            >
              {p.name}
              <span className="ml-1.5 tabular-nums opacity-60">{p.count}</span>
            </Chip>
          ))}
        </div>
      )}

      {/* ── Số kết quả + đổi kiểu xem ───────────────────────────────────── */}
      <div className="mt-7 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold tabular-nums text-foreground">
            {filtered.length}
          </strong>{" "}
          lịch trình{filtering ? " phù hợp" : ""}
        </p>
        <div className="flex items-center gap-1.5">
          <ViewButton
            active={view === "grid"}
            onClick={() => setView("grid")}
            label="Xem dạng lưới"
          >
            <LayoutGrid className="size-4" aria-hidden />
          </ViewButton>
          <ViewButton
            active={view === "list"}
            onClick={() => setView("list")}
            label="Xem dạng danh sách"
          >
            <List className="size-4" aria-hidden />
          </ViewButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Route className="mx-auto size-9 text-muted-foreground/40" aria-hidden />
          <p className="mt-4 font-semibold tracking-tight">
            Không có lịch trình nào khớp
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Thử bỏ bớt bộ lọc, hoặc tự xếp một lịch trình theo đúng ý bạn.
          </p>
          <button
            type="button"
            onClick={() => {
              setPlace("all");
              setDays("all");
              setQuery("");
              setVisible(PAGE);
            }}
            className="mt-5 inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <ul
          className={cn(
            "mt-5",
            view === "grid"
              ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col divide-y divide-border",
          )}
        >
          {shown.map((t, i) => (
            // Kiểu danh sách ngăn nhau bằng kẻ chỉ chứ không phải khoảng cách:
            // thẻ đã bỏ vỏ hộp, nên nếu chỉ cách nhau một khe thì bảng ngày của
            // mục trên chạy thẳng vào dòng nhãn của mục dưới.
            <li key={t.slug} className={cn(view === "list" && "py-6 first:pt-0 last:pb-0")}>
              <TripCardView t={t} view={view} priority={i === 0} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > visible && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
          >
            Tải thêm lịch trình
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

function Divider() {
  return <span aria-hidden className="hidden h-7 w-px bg-border sm:block" />;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Ô chọn trong thanh công cụ. Dùng `<select>` THẬT của trình duyệt, không dựng
 * menu riêng: trên điện thoại nó mở bộ chọn của hệ điều hành (quen tay, cuộn
 * được bằng ngón cái), và bàn phím/trình đọc màn hình có sẵn mọi thứ. Lớp chữ
 * hiển thị nằm dưới, `<select>` trong suốt phủ lên trên để bắt sự kiện.
 */
function Picker({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative flex h-11 items-center gap-2 rounded-xl px-3 text-sm transition-colors focus-within:bg-muted/50 sm:px-4">
      <span className="text-muted-foreground">{icon}</span>
      <span className="whitespace-nowrap font-medium">{current.label}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-lg border transition-colors",
        active
          ? "border-primary/40 bg-primary/8 text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/**
 * Thẻ lịch trình.
 *
 * ── VÌ SAO THẺ KHÔNG CÓ HỘP ─────────────────────────────────────────────────
 * Bản trước là đúng khuôn mặc định của mọi trang liệt kê trên đời: hộp trắng bo
 * góc có viền và bóng khi rê chuột, ảnh dán trên nóc, một viên kính "3 ngày 2
 * đêm" ở góc ảnh, rồi tên → hai dòng mô tả → hàng chip màu → hàng chân có icon
 * bên trái và con số bên phải. Không có mảnh nào trong đó nói rằng thứ đang xem
 * là một LỊCH TRÌNH; thay ảnh và chữ là nó thành thẻ khách sạn, thẻ khoá học,
 * thẻ bất động sản.
 *
 * Bản này bỏ hết phần vỏ và để nội dung tự đứng:
 *   · KHÔNG viền, KHÔNG bóng, KHÔNG nền thẻ — ảnh và chữ đặt thẳng trên nền
 *     trang, đúng quy ước đã chốt ở popup Quán ăn: hộp là để dành cho thứ khác
 *     hẳn về vật liệu, không phải để gói mọi thứ lại cho gọn;
 *   · KHÔNG viên kính trên ảnh — độ dài chuyến về nằm trong dòng nhãn cùng với
 *     tỉnh, một dòng chữ thay cho một miếng dán;
 *   · hàng chip màu đổi thành BẢNG NGÀY có kẻ chỉ: mỗi dòng là một ngày thật
 *     (số · tên ngày · số điểm dừng). Đây là thứ duy nhất một lịch trình có mà
 *     thẻ điểm đến hay quán ăn không có, và nó cũng là thứ người ta thật sự
 *     dùng để so hai lịch trình với nhau.
 * Tổng số điểm dừng ở hàng chân cũ bỏ luôn: cột phải của bảng đã liệt kê từng
 * ngày, cộng lại là ra.
 */
function TripCardView({
  t,
  view,
  priority,
}: {
  t: TripCard;
  view: "grid" | "list";
  priority?: boolean;
}) {
  const list = view === "list";
  const where = t.provinceName ?? t.placeName;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col",
        list && "sm:flex-row sm:gap-5",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-2xl bg-muted",
          list ? "aspect-[3/2] sm:w-60 lg:w-72" : "aspect-[3/2]",
        )}
      >
        {t.cover ? (
          <Image
            src={t.cover.url}
            alt={t.cover.alt ?? ""}
            fill
            priority={priority}
            sizes={
              list
                ? "(min-width: 1024px) 18rem, (min-width: 640px) 15rem, 100vw"
                : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            }
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          // Mẫu chưa có ảnh bìa: KHÔNG mượn ảnh giữ chỗ. Đã thử `coverUrl()`
          // (picsum theo slug) và bỏ — mẫu Tà Xùa, một chuyến LÊN NÚI SĂN MÂY,
          // nhận về một tấm bờ biển bão tố.
          // Thay vào đó vẽ đúng thứ có thật: chuyến này dài mấy ngày, bằng chính
          // hoạ tiết tuyến đường (chấm nối nét đứt) của dự án.
          <span className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: Math.min(t.days, 5) }).map((_, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && (
                  <span className="w-8 border-t border-dashed border-foreground/20 sm:w-12" />
                )}
                <span className="grid size-10 place-items-center rounded-full border border-foreground/20 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-foreground/30 sm:size-12 sm:text-base">
                  {i + 1}
                </span>
              </span>
            ))}
          </span>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10"
        />
      </div>

      <div className={cn("flex flex-1 flex-col", list ? "min-w-0 pt-4 sm:pt-0" : "pt-3.5")}>
        {/* Độ dài chuyến + tỉnh gộp thành MỘT dòng nhãn. Bản trước tách làm hai:
            một viên kính trên ảnh và một hàng chân có icon định vị — hai chỗ,
            hai chất liệu, cho hai dữ kiện cùng cỡ. */}
        <p className={cn(MICRO, "flex min-w-0 items-center gap-2")}>
          <span className="shrink-0 text-primary">{lengthLabel(t.days)}</span>
          {where && (
            <>
              <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
              <span className="truncate text-muted-foreground">{where}</span>
            </>
          )}
        </p>

        <h3 className="mt-1.5 flex items-start gap-1.5">
          <Link
            href={`/lich-trinh/${t.slug}`}
            className="text-balance font-[family-name:var(--font-display)] text-lg font-bold leading-snug tracking-tight transition-colors after:absolute after:inset-0 group-hover:text-primary"
          >
            {t.title}
          </Link>
          <ArrowUpRight
            className="mt-1 size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
            aria-hidden
          />
        </h3>

        {t.summary && (
          <p className="mt-1.5 line-clamp-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {t.summary}
          </p>
        )}

        {/* Bảng ngày — kẻ chỉ mảnh, không hộp. `mt-auto` đẩy nó xuống đáy để
            các thẻ trong cùng một hàng lưới có bảng thẳng hàng nhau dù tên
            chuyến dài ngắn khác nhau.
            `max-w-xl` chỉ có tác dụng ở kiểu DANH SÁCH, nơi cột chữ rộng cả
            nghìn pixel: không chặn thì tên ngày và số điểm dừng dạt về hai mép,
            cách nhau gần 900px. Ở lưới thì cột vốn đã hẹp hơn mức này. */}
        {t.dayTitles.length > 0 && (
          <ol className="mt-auto max-w-xl pt-3.5">
            {t.dayTitles.map((title, i) => (
              <li
                key={i}
                className="flex items-baseline gap-2.5 border-t border-border/70 py-2 last:pb-0"
              >
                <span className="w-4 shrink-0 font-[family-name:var(--font-display)] text-[0.7rem] font-bold tabular-nums text-primary/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {title}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {t.dayStops[i]} điểm
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}
