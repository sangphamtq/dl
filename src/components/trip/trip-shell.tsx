"use client";

import { useState, type ReactNode } from "react";
import { Backpack, ChevronLeft, ChevronRight, Layers, Map as MapIcon, Route } from "@/components/icons";
import { cn } from "@/lib/utils";
import { MICRO } from "@/components/trip/trip-rail";
import { TripSideNav } from "@/components/trip/trip-side-nav";

// Vỏ tràn viền dùng chung cho trang soạn, trang chỉ-đọc (mẫu / bản chia sẻ) và
// các MỤC khác của một chuyến (ghi chú, đồ mang theo…). Tách ra vì các trang này
// là anh em: để mỗi trang tự dựng khung thì chỉ vài lần sửa là chúng trôi khác
// nhau, mà người dùng đi thẳng từ trang mẫu sang trang soạn nên lệch là lộ ngay.
//
//   ┌ header tràn viền ──────────────────────────────────────┐
//   ├────────┬─────────────────────────┬────────────────────┤
//   │ MỤC    │ dải chọn ngày           │                    │
//   │ ─────  │ các ngày, cuộn          │  bản đồ (dính)     │
//   │ Chưa   │                         │                    │
//   │ xếp  « │                         │                    │
//   └────────┴─────────────────────────┴────────────────────┘
//
// Cột trái HẸP (14rem) và THU GỌN ĐƯỢC thành một thanh dọc mỏng. Nó chứa HAI
// thứ chồng lên nhau: menu các mục (`nav`) ở trên, rồi nội dung theo ngữ cảnh
// của mục đang mở (`aside` — "Chưa xếp ngày" khi đang ở Lịch trình).
//
// Vì sao gộp vào MỘT cột thay vì thêm một rail riêng: xem
// docs/lich-trinh-cong-cu-nhom.md §2. Ngắn gọn — thêm cột thứ tư là ăn vào bề
// ngang của dòng thời gian, đúng thứ đã bị loại một lần ở docs/lich-trinh.md §6.
//
// Bốn lần sai trước đó với cột này, ghi lại để khỏi lặp:
//   1. Khối gập dưới đáy cột lịch trình → phải cuộn qua hết mọi ngày mới tới,
//      phá đúng nguyên tắc "phải thấy được ngay lúc đang xếp ngày".
//   2. Cột rộng 19rem → thấy suốt, nhưng ăn bề ngang của CẢ hai cột kia.
//   3. Thẻ nổi trên bản đồ → SAI VỀ Ý NGHĨA: đây là hàng chờ để xếp việc, thuộc
//      miền LẬP KẾ HOẠCH chứ không phải miền địa lý; mà nó còn che đúng thứ bản
//      đồ sinh ra để hiện.
//      (Chấm mờ `.dl-trip-ghost` thì Ở LẠI bản đồ — "mấy chỗ đã lưu nằm đâu"
//      mới đúng là việc của bản đồ. Hai thứ khác nhau, đừng gộp lại lần nữa.)
//
// Dưới `lg` ba cột không nhét vừa nên đổi bằng các viên chọn khung nhìn. Menu
// các mục KHÔNG nằm trong dải đó — nó là một nút mở tấm trượt ở thanh tiêu đề
// (`TripSectionSheet`), để dưới `lg` chỉ có MỘT tầng điều khiển luôn hiện.

type Pane = "days" | "aside" | "map";

// Hai cột ngoài dính sát MÉP TRÊN khung nhìn: ở các trang lịch trình, header
// của site cố ý KHÔNG dính (xem lib/site-chrome → TRIP_DETAIL), nên không phải
// chừa 4rem cho nó nữa — cuộn qua header là hai cột chiếm trọn màn hình.
const STICKY = "lg:sticky lg:top-0 lg:h-[100dvh]";

// Cột phải dạng công cụ dùng `max-h` chứ KHÔNG `h`.
//
// Vì sao quan trọng: cột dính `top-0` nhưng lúc trang chưa cuộn nó bắt đầu BÊN
// DƯỚI thanh tiêu đề chuyến. Ép `h-[100dvh]` thì đáy cột — nơi ghim nút "Thêm" —
// rơi khỏi khung nhìn đúng bằng chiều cao thanh tiêu đề, và người dùng phải cuộn
// mới thấy nút. Với `max-h`, cột chỉ cao bằng nội dung (các nhóm gấp lại thì rất
// thấp) nên nút nằm ngay dưới nội dung, thấy được luôn; bung nhóm ra thì cột mới
// chạm trần 100dvh và phần danh sách tự cuộn bên trong.
// `self-start` là mảnh ghép thứ hai: ô lưới mặc định GIÃN cho bằng chiều cao
// hàng, nên chỉ `max-h` thôi thì cột vẫn bị kéo dài bằng cột giữa và đáy cột
// (nút "Thêm") lại rơi khỏi khung nhìn.
const RIGHT_STICKY = "lg:sticky lg:top-0 lg:max-h-[100dvh] lg:self-start";

// Icon của cột phải chọn bằng TÊN, không nhận thẳng component.
//
// ⚠️ Bài học lặp lần thứ hai (lần đầu ở prop `nav`, xem
// docs/lich-trinh-cong-cu-nhom.md §10): component React LÀ MỘT HÀM, mà hàm thì
// không qua được ranh giới Server → Client — "Functions cannot be passed
// directly to Client Components". `tsc` KHÔNG bắt được, chỉ mở trang mới thấy.
const RIGHT_ICONS = { map: MapIcon, backpack: Backpack } as const;

// Hai chuỗi class ĐẦY ĐỦ cho mỗi trường hợp chứ không ghép động: Tailwind quét
// mã nguồn theo literal, ghép kiểu `lg:grid-cols-[${w}_...]` sẽ không sinh CSS.
const COLS: Record<string, string> = {
  "open-none": "lg:grid-cols-[14rem_minmax(0,1fr)]",
  "shut-none": "lg:grid-cols-[2.75rem_minmax(0,1fr)]",
  "open-map": "lg:grid-cols-[14rem_minmax(0,1fr)_minmax(24rem,32rem)]",
  "shut-map": "lg:grid-cols-[2.75rem_minmax(0,1fr)_minmax(24rem,32rem)]",
  "open-panel": "lg:grid-cols-[14rem_minmax(0,1fr)_21rem]",
  "shut-panel": "lg:grid-cols-[2.75rem_minmax(0,1fr)_21rem]",
  "open-rail": "lg:grid-cols-[14rem_minmax(0,1fr)_2.75rem]",
  "shut-rail": "lg:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]",
};

export function TripShell({
  header,
  navTripId,
  asideTitle,
  asideCount,
  aside,
  main,
  map,
  right,
  rightTitle,
  rightIcon,
}: {
  header: ReactNode;
  /**
   * Có id ⇒ hiện menu các mục ở đầu cột trái. Trang chỉ-đọc không truyền → cột
   * trái chỉ có `aside`.
   *
   * Nhận ID chứ KHÔNG nhận sẵn node/hàm dựng: menu phải đổi hình theo trạng
   * thái thu gọn, mà trạng thái đó là `useState` của chính component này. Truyền
   * một hàm `(collapsed) => node` thì trang [muc] (Server Component) không gửi
   * qua ranh giới client được — "Functions cannot be passed directly to Client
   * Components".
   */
  navTripId?: string;
  /** Nhãn khối dưới menu: "Chưa xếp ngày" khi soạn, "Gợi ý thêm" khi chỉ đọc. */
  asideTitle?: string;
  asideCount?: number;
  /** Không truyền (mục Ghi chú, Chi phí…) → cột trái chỉ còn menu. */
  aside?: ReactNode;
  main: ReactNode;
  /** Bản đồ — cột phải KHÔNG thu gọn được (nó là nội dung, không phải công cụ). */
  map?: ReactNode;
  /**
   * Cột phải THU GỌN ĐƯỢC — dùng cho bảng công cụ (gợi ý đồ mang theo…).
   * Khác `map` ở chỗ mặc định nó ĐÓNG: đây là thứ mở ra khi cần rồi gấp lại,
   * không phải thứ nhìn suốt. Truyền cả `map` lẫn `right` là không hợp lệ.
   */
  right?: ReactNode;
  rightTitle?: string;
  rightIcon?: keyof typeof RIGHT_ICONS;
}) {
  const [rawPane, setPane] = useState<Pane>("days");
  // Thu gọn cột trái khi cần bề ngang cho dòng thời gian.
  const [asideOpen, setAsideOpen] = useState(true);
  // Cột phải dạng công cụ: MẶC ĐỊNH MỞ. Nó là cách chính để đổ đầy danh sách,
  // nên giấu sau một cú bấm thì phần lớn người dùng không biết nó tồn tại. Ở
  // khổ `lg` nhỏ nhất (1024px) cột giữa còn ~29rem — chật nhưng vẫn đủ cho một
  // hàng checklist, và thu gọn được ngay nếu vướng.
  const [rightOpen, setRightOpen] = useState(true);

  const hasAside = aside != null;
  const RightIcon = RIGHT_ICONS[rightIcon ?? "map"];
  const panes: { id: Pane; label: string; icon: typeof Route; badge?: number }[] = [
    { id: "days", label: "Lịch trình", icon: Route },
    ...(hasAside
      ? [{ id: "aside" as const, label: asideTitle ?? "", icon: Layers, badge: asideCount }]
      : []),
    ...(map ? [{ id: "map" as const, label: "Bản đồ", icon: MapIcon }] : []),
    ...(right
      ? [{ id: "map" as const, label: rightTitle ?? "", icon: RightIcon }]
      : []),
  ];

  // Đổi mục có thể làm cột của pane đang chọn biến mất (đang xem Bản đồ ở mục
  // Lịch trình rồi nhảy sang Ghi chú) — rơi về "days" thay vì màn hình trắng.
  const pane: Pane =
    (rawPane === "map" && !map && !right) || (rawPane === "aside" && !hasAside)
      ? "days"
      : rawPane;

  const rightKey = map ? "map" : right ? (rightOpen ? "panel" : "rail") : "none";
  const cols = COLS[`${asideOpen ? "open" : "shut"}-${rightKey}`];

  return (
    <div className="flex flex-1 flex-col">
      {header}

      {/* Chọn khung nhìn — chỉ dưới lg, và chỉ khi có nhiều hơn một khung.
          Đánh dấu bằng ICON TÔ CAM + chữ đậm, KHÔNG phải viên nền: cùng cách
          PlaceTabs làm, và vì đúng lý do đã ghi ở đó (viên nền biến thanh thành
          "bộ lọc app thương mại điện tử"). */}
      {panes.length > 1 && (
        <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur lg:hidden">
          <div className="flex">
            {panes.map(({ id, label, icon: Icon, badge }) => {
              const on = pane === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPane(id)}
                  aria-pressed={on}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2.5 text-xs transition-colors sm:text-sm",
                    on
                      ? "border-warm font-semibold text-foreground"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", on && "text-warm")} aria-hidden />
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="tabular-nums text-muted-foreground">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Thu gọn/mở cột trái ĐỔI CHIỀU NGANG CÓ CHUYỂN ĐỘNG: `grid-template-columns`
          nội suy được vì cả hai giá trị đều là <length> (14rem ↔ 2.75rem), hai
          track còn lại không đổi. Trước đây nó nhảy một phát — cả ba cột đổi bề
          ngang tức thì, mắt không bám kịp thứ gì đã dịch đi đâu. */}
      <div
        className={cn(
          "flex-1 lg:grid lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out motion-reduce:transition-none",
          cols,
        )}
      >
        {/* ── Cột trái: menu các mục + nội dung theo ngữ cảnh ──── */}
        <aside
          className={cn(
            // overflow-x-hidden: trong lúc cột hẹp lại, nội dung bản mở rộng phải
            // bị CẮT chứ không được đẩy ra thanh cuộn ngang.
            "min-w-0 lg:overflow-y-auto lg:overflow-x-hidden lg:border-r",
            hasAside && "border-b lg:border-b-0",
            STICKY,
            // Dưới `lg` cột này là khung nhìn "aside". Khi mục đang mở không có
            // nội dung ngữ cảnh thì nó không phải một khung nhìn nào cả — menu
            // đã nằm ở tấm trượt trong thanh tiêu đề — nên ẩn hẳn.
            hasAside ? pane !== "aside" && "hidden lg:block" : "hidden lg:block",
          )}
        >
          {/* Thu gọn: còn một thanh dọc mỏng. Dưới `lg` không có chuyện thu gọn
              — ở đó nó là một khung nhìn riêng, luôn đầy đủ. */}
          {!asideOpen && (
            <div className="hidden h-full flex-col items-center gap-2 py-3 lg:flex">
              <button
                type="button"
                onClick={() => setAsideOpen(true)}
                aria-expanded={false}
                aria-label="Mở rộng cột trái"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>

              {navTripId && <TripSideNav tripId={navTripId} collapsed />}

              {hasAside && (
                <button
                  type="button"
                  onClick={() => setAsideOpen(true)}
                  title={`${asideTitle} (${asideCount})`}
                  className="mt-1 grid w-full place-items-center gap-1 border-t pt-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Layers className="size-4 shrink-0" aria-hidden />
                  <span className="text-xs font-semibold tabular-nums">{asideCount}</span>
                  <span className="sr-only">{asideTitle}</span>
                </button>
              )}
            </div>
          )}

          {/* w-56 = 14rem: khoá bề ngang bản mở rộng để trong lúc cột co lại,
              nội dung bị cắt gọn chứ không xuống dòng lung tung rồi giật. */}
          <div className={cn("lg:w-56", !asideOpen && "lg:hidden")}>
            {navTripId && (
              <div className="px-2 py-3">
                <div className="hidden justify-end pb-1 lg:flex">
                  <button
                    type="button"
                    onClick={() => setAsideOpen(false)}
                    aria-label="Thu gọn cột trái"
                    className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                </div>
                <TripSideNav tripId={navTripId} />
              </div>
            )}

            {hasAside && (
              <div className={cn("px-3 pb-5", navTripId ? "border-t pt-4" : "py-5")}>
                <div className="flex items-center gap-1">
                  <h2 className={cn(MICRO, "min-w-0 flex-1 truncate text-muted-foreground")}>
                    {asideTitle}
                    <span className="ml-1.5 tabular-nums text-muted-foreground/60">
                      {asideCount}
                    </span>
                  </h2>
                  {!navTripId && (
                    <button
                      type="button"
                      onClick={() => setAsideOpen(false)}
                      aria-label="Thu gọn"
                      className="hidden size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:grid"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="mt-3">{aside}</div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Cột giữa: nội dung mục đang mở ────────────────────── */}
        <div className={cn("min-w-0 px-4 py-5 sm:px-6", pane !== "days" && "hidden lg:block")}>
          {main}
        </div>

        {/* ── Cột phải dạng công cụ: thu gọn được ───────────────── */}
        {right && (
          <div
            className={cn(
              // KHÔNG `overflow-y-auto` ở đây: nội dung cột tự lo cuộn (nó cần
              // một chân ghim), để cả hai cùng cuộn là sinh HAI thanh cuộn lồng
              // nhau. Cũng KHÔNG `overflow-hidden`: `overflow` khác `visible`
              // biến chính cột này thành khung neo của `position: sticky`, nên
              // chân ghim sẽ dính vào đáy CỘT (có thể nằm dưới nếp gấp) thay vì
              // đáy KHUNG NHÌN. Phần cuộn bên trong đã bị `max-h` chặn rồi.
              "flex flex-col border-t lg:border-l lg:border-t-0",
              RIGHT_STICKY,
              // `lg:flex` chứ không `lg:block`: cột này là flex-column để chân
              // ghim đứng yên — `block` ở media query sẽ đè mất `flex`.
              pane !== "map" && "hidden lg:flex",
            )}
          >
            {/* Thu gọn = một thanh dọc mang icon + nhãn xoay dọc. Dưới `lg` không
                thu gọn: ở đó nó là một khung nhìn riêng, luôn đầy đủ. */}
            {!rightOpen && (
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                aria-expanded={false}
                title={rightTitle}
                className="hidden h-full w-full flex-col items-center gap-3 py-4 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:flex"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                <RightIcon className="size-4 shrink-0" aria-hidden />
                <span className="text-xs [writing-mode:vertical-rl]">{rightTitle}</span>
              </button>
            )}

            <div className={cn("flex min-h-0 flex-auto flex-col", !rightOpen && "lg:hidden")}>
              <div className="hidden shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5 lg:flex">
                <h2 className={cn(MICRO, "min-w-0 truncate text-muted-foreground")}>
                  {rightTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Thu gọn"
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-auto">{right}</div>
            </div>
          </div>
        )}

        {/* ── Cột phải: bản đồ ──────────────────────────────────── */}
        {map && (
          <div
            className={cn(
              "relative min-h-[26rem] border-t lg:border-l lg:border-t-0",
              STICKY,
              pane !== "map" && "hidden lg:block",
            )}
          >
            {map}
          </div>
        )}
      </div>
    </div>
  );
}
