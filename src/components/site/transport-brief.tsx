import { Glyph } from "@/components/site/glyphs";
import { MODE_GLYPH, money } from "@/lib/transport-format";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";

/* Xem trước mục Đi lại. Đây là mục DUY NHẤT của trang không được dùng ảnh
   (CLAUDE.md §Transport) — và cũng là mục duy nhất có dữ liệu so sánh được, nên
   nó dựng thành một BẢNG: thời gian và giá dóng thành hai cột cố định chạy suốt
   các nhóm, để đọc dọc là so được "đi bằng gì rẻ/nhanh hơn".

   Mô tả, nhà xe, hotline và cảnh báo của từng tuyến để dành cho màn hình
   `/di-chuyen` — bản xem trước chỉ trả lời "từ đâu · bằng gì · bao lâu · bao
   nhiêu". */

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

const KICKER =
  "text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function groupByOrigin(items: TransportBriefItem[]) {
  const out: { from: string | null; km: number | null; items: TransportBriefItem[] }[] =
    [];
  for (const t of items) {
    const found = out.find((g) => g.from === t.fromName);
    if (found) {
      found.items.push(t);
      found.km ??= t.distanceKm;
    } else out.push({ from: t.fromName, km: t.distanceKm, items: [t] });
  }
  return out;
}

export function TransportBrief({
  items,
  placeName,
}: {
  items: TransportBriefItem[];
  placeName: string;
}) {
  const rank = (a: TransportBriefItem, b: TransportBriefItem) =>
    Number(b.isRecommended) - Number(a.isRecommended);
  const getTo = groupByOrigin(
    items.filter((t) => t.direction === "getTo").sort(rank),
  );
  const around = items.filter((t) => t.direction === "getAround").sort(rank);
  if (getTo.length === 0 && around.length === 0) return null;

  return (
    // Cả mục giữ CHUNG một khổ: hai khối cùng mép phải thì đọc ra một bảng,
    // không phải hai danh sách rời.
    <div className="max-w-[56rem]">
      {getTo.length > 0 && (
        <div>
          <p className={KICKER}>Đến {placeName}</p>

          <div className="mt-3 border-t border-border/60">
            {getTo.map((g) => (
              <div key={g.from ?? "khac"} className="border-b border-border/60 py-3.5">
                {g.from && (
                  <p className="flex flex-wrap items-baseline gap-x-4">
                    <span className="font-medium leading-snug">{g.from}</span>
                    {g.km != null && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {g.km} km
                      </span>
                    )}
                  </p>
                )}

                <ul className={cn(g.from && "mt-1.5 space-y-1.5")}>
                  {g.items.map((t) => (
                    <Row key={t.id} t={t} plain={!g.from} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {around.length > 0 && (
        <div className={cn(getTo.length > 0 && "mt-10")}>
          <p className={KICKER}>Đi lại tại chỗ</p>

          <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {around.map((t) => {
              const price = money(t.priceFrom, t.priceTo);
              return (
                <li
                  key={t.id}
                  className="flex items-baseline gap-x-4 border-t border-border/60 py-3"
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
                    <Glyph
                      name={MODE_GLYPH[t.mode] ?? "navigation"}
                      className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
                    />
                    <span className={cn("min-w-0", t.isRecommended && "font-medium")}>
                      {t.name}
                    </span>
                    {t.isRecommended && <Popular />}
                  </span>
                  {price && (
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {price}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ t, plain }: { t: TransportBriefItem; plain: boolean }) {
  const price = money(t.priceFrom, t.priceTo);

  return (
    <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <Glyph
          name={MODE_GLYPH[t.mode] ?? "navigation"}
          className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
        />
        <span className={cn("min-w-0", (plain || t.isRecommended) && "font-medium")}>
          {t.name}
        </span>
        {t.isRecommended && <Popular />}
      </span>

      {/* Hai cột số RỘNG CỐ ĐỊNH từ `sm`: cùng một bề rộng ở mọi nhóm thì đọc dọc
          mới so được giữa các tuyến. */}
      <span className="flex items-baseline gap-x-4 pl-6.5 text-sm tabular-nums text-muted-foreground sm:shrink-0 sm:pl-0">
        <span className="text-balance sm:w-32 sm:text-right">{t.duration}</span>
        <span className="font-medium text-foreground sm:w-24 sm:text-right">
          {price}
        </span>
      </span>
    </li>
  );
}

/* "Phổ biến" là ghi chú trung tính, KHÔNG phải cảnh báo — nên để xám, không mượn
   màu cam (quy ước màu, CLAUDE.md §3). */
function Popular() {
  return (
    <span
      className={cn(
        R_BADGE,
        "shrink-0 whitespace-nowrap bg-muted px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
      )}
    >
      Phổ biến
    </span>
  );
}
