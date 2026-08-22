import {
  Bus,
  Car,
  TrainFront,
  Plane,
  Ship,
  Bike,
  Footprints,
  CarTaxiFront,
  Navigation,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export type TransportBriefItem = {
  id: string;
  name: string;
  direction: string;
  mode: string;
  fromName: string | null;
  duration: string | null;
  distanceKm: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  isRecommended: boolean;
};

// Mục "Đi lại" trên trang TỔNG QUAN điểm đến.
//
// VÌ SAO NÓ TỒN TẠI: thanh tab của trang vẫn quảng cáo "Di chuyển 10" nhưng
// trang tổng quan chưa bao giờ có mục ấy — `transport` chỉ xuất hiện trong phép
// tính `hasAnyContent`. Bảng mục lục của trang liệt kê một chương mà trang không
// có, và đó lại đúng là chương trả lời câu hỏi đến TRƯỚC "ăn gì": tới đây bằng
// cách nào.
//
// HAI HÌNH THÁI, LẤY TỪ CHÍNH DỮ LIỆU — không phải hai biến thể của một khuôn:
//   · `getTo` có `fromName` (TP.HCM · Nha Trang · Đà Lạt · Hà Nội), `duration`,
//     `distanceKm`, khoảng giá → BẢNG TUYẾN GOM THEO ĐIỂM XUẤT PHÁT. Cùng một
//     đích, nhiều nơi đi, và người đọc dò theo "tôi đang ở đâu" trước.
//   · `getAround` không có điểm xuất phát, phần lớn chỉ có tên + giá theo ngày
//     → TẬP LỰA CHỌN, không có gì để so theo tuyến. Danh sách trần.
//
// KHÔNG DÙNG ẢNH (CLAUDE.md chốt): phương tiện nhận ra bằng icon nhanh hơn bằng
// ảnh, và mọi mục khác trên trang đã lấy ảnh làm chủ — thêm một lưới ảnh nữa là
// thêm một bản sao của cùng một khuôn.
//
// Là Server Component: tĩnh hoàn toàn, không tốn byte JS nào.

const MODE_ICON: Record<string, typeof Bus> = {
  car: Car,
  bus: Bus,
  train: TrainFront,
  plane: Plane,
  boat: Ship,
  motorbike: Bike,
  bike: Bike,
  taxi: CarTaxiFront,
  grab: CarTaxiFront,
  walk: Footprints,
  cyclo: Bike,
  shuttle: Bus,
  other: Navigation,
};

/**
 * Tiền VND ở dạng NGẮN: "150–290k", "2,5–3,5tr", "từ 12k", "đến 800k".
 *
 * Bảng tuyến sống nhờ việc quét dọc được, mà "150.000 – 290.000đ" thì một ô giá
 * đã dài bằng cả tên phương tiện — mắt hết so được.
 *
 * Dưới 1.000đ in NGUYÊN SỐ: `Math.round(n / 1000)` cho ra "0k", một cái giá SAI
 * hiển thị trên trang mà toàn bộ giá trị là dữ kiện thực địa đúng.
 * Chỉ có `priceTo` thì phải có chữ "đến" — một con số trần đọc ra là giá cố
 * định, trong khi nó là trần của một khoảng.
 */
function money(from: number | null, to: number | null): string | null {
  if (from == null && to == null) return null;
  const unit = (n: number) => {
    if (n >= 1_000_000)
      return `${(n / 1_000_000).toFixed(1).replace(/[.,]0$/, "").replace(".", ",")}tr`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return `${n}đ`;
  };
  if (from != null && to != null)
    return from === to ? unit(from) : `${unit(from)}–${unit(to)}`;
  if (from != null) return `từ ${unit(from)}`;
  return `đến ${unit(to as number)}`;
}

/** Gom các cách đi theo điểm xuất phát, giữ thứ tự lần đầu xuất hiện. */
function groupByOrigin(items: TransportBriefItem[]) {
  const out: { from: string | null; items: TransportBriefItem[] }[] = [];
  for (const t of items) {
    const found = out.find((g) => g.from === t.fromName);
    if (found) found.items.push(t);
    else out.push({ from: t.fromName, items: [t] });
  }
  return out;
}

export function TransportBrief({ items }: { items: TransportBriefItem[] }) {
  // Cách phổ biến lên đầu — `isRecommended` là dữ liệu hỗ trợ QUYẾT ĐỊNH, biên
  // tập bật nó để nói "đây là cách người ta thật sự đi".
  const rank = (a: TransportBriefItem, b: TransportBriefItem) =>
    Number(b.isRecommended) - Number(a.isRecommended);
  const getTo = groupByOrigin(items.filter((t) => t.direction === "getTo").sort(rank));
  const around = items.filter((t) => t.direction === "getAround").sort(rank);
  if (getTo.length === 0 && around.length === 0) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
      {/* ── Cách đến nơi — BẢNG TUYẾN, GOM THEO NƠI ĐI ────────────────── */}
      {getTo.length > 0 && (
        <div className="min-w-0">
          {/* Nhãn nửa mục — KHÔNG phải chữ hoa 0.6rem giãn ký tự:
              `section-heading.tsx` ghi rõ trang đã gỡ idiom eyebrow khỏi cả 16
              mục, dựng lại nó ở đây — lại còn bằng cỡ chữ nhỏ nhất trang — là
              mang về đúng thứ vừa bỏ.
              `text-lg/600` chứ không `text-sm/600`: nhãn này QUẢN các khoá nhóm
              bên dưới (16px/500), nên nó phải lớn hơn chúng. Bản trước để 14px
              là đảo ngược thứ bậc — nhãn của cả nửa mục nhỏ hơn thứ nó quản, và
              hai tầng dính vào nhau đọc thành một. Ba tầng nay là
              18/600 → 16/500 → 16/400. */}
          <h3 className="text-lg font-semibold text-foreground">Cách đến nơi</h3>

          <div className="mt-4 border-t border-border">
            {getTo.map((g) => (
              <div key={g.from ?? "khac"} className="border-b border-border py-3.5">
                {/* ĐIỂM XUẤT PHÁT là khoá của nhóm, in MỘT LẦN.
                    Bản trước để mỗi dòng tự lặp lại nơi đi, nên hai dòng đầu
                    cùng đọc "TP.HCM (Sài Gòn)" ở nét đậm nhất còn thứ phân biệt
                    chúng — limousine hay tàu hoả — lại nằm ở dòng phụ mờ: khoá
                    thì lặp, còn dữ kiện phân biệt thì bị giáng xuống. */}
                {g.from && (
                  <p className="font-medium leading-snug">{g.from}</p>
                )}

                <ul className={cn(g.from && "mt-2 space-y-2")}>
                  {g.items.map((t) => {
                    const Icon = MODE_ICON[t.mode] ?? Navigation;
                    const price = money(t.priceFrom, t.priceTo);
                    return (
                      <li
                        key={t.id}
                        // Dưới sm cột giờ/giá XUỐNG DÒNG thay vì ép cùng hàng:
                        // ở 390px chuỗi "~2 giờ bay + ~2,5 giờ xe" chiếm nửa
                        // hàng và cắt cụt chính nội dung của dòng
                        // ("Bay tới Cam Ranh / Tân Sơn…").
                        className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                      >
                        <span className="flex min-w-0 items-baseline gap-2.5">
                          <Icon
                            className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className={cn(!g.from && "font-medium")}>
                              {t.name}
                            </span>
                            {t.isRecommended && (
                              <span className="ml-2 whitespace-nowrap text-xs font-semibold text-warm-ink">
                                Phổ biến
                              </span>
                            )}
                          </span>
                        </span>

                        {/* Giờ và giá — căn phải từ sm để các dòng thẳng cột và
                            so được theo chiều dọc. `tabular-nums` giữ bề ngang
                            chữ số không nhảy giữa các hàng. */}
                        <span className="shrink-0 pl-6.5 text-sm tabular-nums text-muted-foreground sm:pl-0 sm:text-right">
                          {t.duration}
                          {t.duration && price && (
                            <span aria-hidden className="px-1.5 text-border">
                              ·
                            </span>
                          )}
                          {price}
                          {!t.duration && !price && t.distanceKm != null
                            ? `${t.distanceKm} km`
                            : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Đi lại tại chỗ — TẬP LỰA CHỌN ─────────────────────────────── */}
      {around.length > 0 && (
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Đi lại tại chỗ</h3>
          {/* DANH SÁCH TRẦN, không viên chip.
              Bản trước dùng `rounded-full border bg-card` — đó đúng là hình của
              CONTROL BẤM ĐƯỢC trên site này (thanh tab, dải chip lọc ở mục Ẩm
              thực), nên năm mục tĩnh đọc ra như năm bộ lọc không chịu hoạt động.
              Bỏ khung và nền là hết hứa hẹn sai, mà vẫn khác hẳn bảng tuyến bên
              trái: bên kia có kẻ ngăn dòng và cột phải căn lề, bên này không. */}
          <ul className="mt-4 space-y-2.5">
            {around.map((t) => {
              const Icon = MODE_ICON[t.mode] ?? Navigation;
              const price = money(t.priceFrom, t.priceTo);
              return (
                <li key={t.id} className="flex items-baseline gap-2.5">
                  <Icon
                    className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm">{t.name}</span>
                    {price && (
                      <span className="ml-2 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {price}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
