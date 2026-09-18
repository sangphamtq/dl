import Link from "next/link";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import type { TransportBriefItem } from "@/components/site/transport-brief";
import type { ReviewSummary } from "@/lib/review-meta";
import { parseTicketTiers } from "@/lib/tickets";
import { MODE_GLYPH, money, shortVnd } from "@/lib/transport-format";
import { cn } from "@/lib/utils";

/* Khối "trước khi đi" ngay dưới hero: chốt các câu HỎI CHẶN QUYẾT ĐỊNH (xa bao
   nhiêu, mùa nào, mấy ngày, bao nhiêu tiền, có gì phải biết trước), xếp theo
   mức chặn chứ không theo thứ tự biên tập nhập.

   Mọi dòng dựng từ dữ liệu CÓ CẤU TRÚC mà trang đã truy vấn sẵn — không thêm
   truy vấn, và không nhận văn xuôi tự do: thiếu dữ liệu thì dòng đó biến mất,
   không hiện ô rỗng. */

const MIN_REVIEWS = 3;
// 1–2 nơi có cảnh báo thì ở đâu cũng có; chỉ khi nhiều nơi cùng có thì "phải
// chuẩn bị" mới là đặc điểm của chính điểm đến.
const MIN_NOTICES = 3;
const MAX_ORIGINS = 2;
// Dưới 2 dòng thì không thành một khối.
const MIN_ROWS = 2;

type SpotMoneyFact = {
  ticketFree: boolean;
  ticketTiers: unknown;
  notice: string | null;
};

export type DecisionInput = {
  transports: TransportBriefItem[];
  spots: SpotMoneyFact[];
  reviews: ReviewSummary | null;
  templateDays: number[];
  quickInfo: unknown;
};

const SEASON_LABEL = /^(th[ờo]i [đd]i[ểe]m|m[ùu]a)/i;
const DAYS_LABEL = /^(n[êe]n [đd]i|th[ờo]i gian n[êe]n [đd]i|s[ốo] ng[àa]y)/i;

/* `Place.quickInfo` là Json tự do nên mỗi nơi tự đặt một bộ nhãn khác nhau
   (Phan Thiết 4 ô, Tà Xùa 7 ô, không trùng nhãn nào). Chỉ nhận đúng hai ý có
   chỗ đứng ở đây; các ô còn lại bỏ qua — nhất là "Phương tiện", vì mục Đi lại
   mới là nguồn chân lý và hai chỗ đã từng nói ngược nhau. */
function pickQuick(value: unknown): { season?: string; days?: string } {
  if (!Array.isArray(value)) return {};
  const picked: { season?: string; days?: string } = {};
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const val = typeof o.value === "string" ? o.value.trim() : "";
    if (!label || !val) continue;
    if (!picked.season && SEASON_LABEL.test(label)) picked.season = val;
    else if (!picked.days && DAYS_LABEL.test(label)) picked.days = val;
  }
  return picked;
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function build(input: DecisionInput) {
  const quick = pickQuick(input.quickInfo);

  // Một mục cho mỗi NƠI XUẤT PHÁT, không phải mỗi tuyến: người đọc chỉ quan
  // tâm chặng từ chỗ mình, và `isRecommended` đã nói tuyến nào người ta thật
  // sự đi.
  const origins: TransportBriefItem[] = [];
  const seen = new Set<string>();
  for (const t of [...input.transports]
    .filter((t) => t.direction === "getTo" && t.fromName)
    .sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended))) {
    if (seen.has(t.fromName!)) continue;
    seen.add(t.fromName!);
    if (origins.length < MAX_ORIGINS) origins.push(t);
  }

  const total = input.spots.length;
  const free = input.spots.filter((s) => s.ticketFree).length;
  const prices = input.spots
    .filter((s) => !s.ticketFree)
    .flatMap((s) => parseTicketTiers(s.ticketTiers).map((t) => t.price))
    .filter((p): p is number => p != null && p > 0);
  const noticed = input.spots.filter((s) => s.notice).length;

  const lo = input.templateDays.length ? Math.min(...input.templateDays) : 0;
  const hi = input.templateDays.length ? Math.max(...input.templateDays) : 0;
  const days =
    quick.days ??
    (lo === 0 ? null : lo === hi ? `${lo} ngày` : `${lo} – ${hi} ngày`);

  const saidRaw =
    input.reviews && input.reviews.total >= MIN_REVIEWS
      ? {
          good: input.reviews.highlights.slice(0, 2).map((h) => lower(h.label)),
          bad: input.reviews.caveats.slice(0, 2).map((c) => lower(c.label)),
        }
      : null;
  const said =
    saidRaw && (saidRaw.good.length || saidRaw.bad.length) ? saidRaw : null;

  const rows =
    (origins.length > 0 ? 1 : 0) +
    (quick.season ? 1 : 0) +
    (days ? 1 : 0) +
    (total > 0 ? 1 : 0) +
    (noticed >= MIN_NOTICES ? 1 : 0) +
    (said ? 1 : 0);

  return {
    rows,
    origins,
    restOrigins: seen.size - origins.length,
    season: quick.season,
    days,
    templates: input.templateDays.length,
    total,
    free,
    prices,
    noticed,
    said,
  };
}

/** Trang phải hỏi TRƯỚC: component tự ẩn thì cả dải vẫn còn lại một khung rỗng. */
export function hasPlaceDecision(input: DecisionInput): boolean {
  return build(input).rows >= MIN_ROWS;
}

// `sub` là NHIỀU mẩu rời, không phải một chuỗi đã nối: ngăn bằng khoảng trắng
// rộng thì phải là khoảng cách THẬT giữa hai phần tử — nhiều dấu cách trong một
// chuỗi bị HTML gộp lại thành một, và "150k–290k 200 km" đọc ra thành một cụm.
type Stat = { label: string; value: string; sub: string[]; glyph: GlyphName };

/* Ba con SỐ đứng trước, phần định tính lùi xuống dải dữ kiện bên dưới. Bản đầu
   dàn mọi dòng cùng một cỡ chữ nên không có điểm nhìn — mà số mới là thứ người
   đọc đang đi tìm ở khối này.

   ⚠️ Giá trị lớn phải MANG ĐƠN VỊ để đọc được cạnh nhau (giờ · ngày · tiền):
   một tỉ lệ trần kiểu "6/8" đứng giữa hai cái kia thì không hiểu ngay được. */
function statsOf(d: ReturnType<typeof build>): Stat[] {
  const out: Stat[] = [];

  const lead = d.origins[0];
  if (lead) {
    const price = money(lead.priceFrom, lead.priceTo);
    const km = lead.distanceKm != null ? `${lead.distanceKm} km` : null;
    out.push({
      glyph: MODE_GLYPH[lead.mode] ?? "navigation",
      label: `Từ ${lead.fromName}`,
      value: lead.duration ?? km ?? "—",
      sub: [price, lead.duration ? km : null].filter((x): x is string => !!x),
    });
  }

  if (d.days) {
    out.push({
      glyph: "clock",
      label: "Nên đi",
      value: d.days,
      sub: d.templates > 0 ? [`${d.templates} lịch trình mẫu`] : [],
    });
  }

  if (d.total > 0) {
    const range =
      d.prices.length === 0
        ? null
        : Math.min(...d.prices) === Math.max(...d.prices)
          ? shortVnd(d.prices[0]!)
          : `${shortVnd(Math.min(...d.prices))}–${shortVnd(Math.max(...d.prices))}`;
    out.push(
      d.free === d.total || !range
        ? {
            glyph: "gate",
            label: "Vé vào cửa",
            value: d.free === d.total ? "Miễn phí" : `${d.free}/${d.total}`,
            sub: [d.free === d.total ? `cả ${d.total} địa điểm` : "nơi vào tự do"],
          }
        : {
            glyph: "ticket",
            label: "Vé vào cửa",
            value: range,
            sub: [
              d.free === 0
                ? `cả ${d.total} địa điểm đều bán vé`
                : `${d.free}/${d.total} nơi còn lại vào tự do`,
            ],
          },
    );
  }

  return out;
}

function Fact({
  glyph,
  label,
  children,
}: {
  glyph: GlyphName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <Glyph
        name={glyph}
        className="size-[1.05rem] shrink-0 translate-y-0.5 text-muted-foreground/70"
      />
      <span>{label}</span>
      {children}
    </span>
  );
}

/* Hình thức: CỘT DỮ KIỆN bên phải phần chữ, kiểu trang sách hướng dẫn.
   Dàn ngang hết bề ngang trang thì ba số cách nhau quá xa nên trôi, mà mép phải
   lại so le với khổ chữ 46rem bên dưới — đã thử và bỏ.

   Dưới `lg` cột này nằm CHÈN GIỮA câu mở đầu và đoạn mô tả (thứ tự DOM), nên
   trên điện thoại dữ kiện vẫn đứng trước văn xuôi. */
export function PlaceDecision({
  transportHref,
  className,
  ...input
}: DecisionInput & { transportHref: string; className?: string }) {
  const d = build(input);
  if (d.rows < MIN_ROWS) return null;
  const stats = statsOf(d);

  return (
    <aside className={cn("min-w-0", className)}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Trước khi đi
      </p>

      {stats.length > 0 && (
        // Ngang (2 ô một hàng) ở khổ hẹp, dựng đứng thành sổ dữ kiện từ `lg`.
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-6 lg:mt-5 lg:block lg:gap-0">
          {stats.map((s) => (
            <div
              key={s.label}
              className="min-w-[7.25rem] flex-1 lg:border-t lg:border-border lg:py-4 lg:first:border-t-0 lg:first:pt-0"
            >
              <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <Glyph name={s.glyph} className="size-3.5 shrink-0" />
                <span className="truncate">{s.label}</span>
              </dt>
              <dd>
                <p className="mt-1.5 font-[family-name:var(--font-display)] text-[1.6rem] font-semibold leading-none tracking-tight tabular-nums text-foreground">
                  {s.value}
                </p>
                {s.sub.length > 0 && (
                  <p className="mt-1.5 flex flex-wrap gap-x-4 text-sm leading-6 text-muted-foreground">
                    {s.sub.map((x) => (
                      <span key={x}>{x}</span>
                    ))}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-2.5 border-t border-border pt-4 text-sm text-muted-foreground lg:mt-0 lg:flex-col lg:items-start lg:gap-y-3">
        {d.season && (
          // Xanh = "đi lúc nào cho đúng" (quy ước màu, CLAUDE.md §3).
          <Fact glyph="sunrise" label="Mùa đẹp">
            <b className="font-semibold text-primary-ink">{d.season}</b>
          </Fact>
        )}

        {d.noticed >= MIN_NOTICES && (
          // Cam = cảnh báo.
          <Fact glyph="warn" label="Cần lưu ý">
            <b className="font-semibold text-warm-ink">
              {d.noticed}/{d.total} địa điểm
            </b>
          </Fact>
        )}

        {d.said && (
          <span className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {d.said.good.length > 0 && (
              <Fact glyph="message" label="Khen">
                <b className="font-semibold text-foreground">
                  {d.said.good.join(", ")}
                </b>
              </Fact>
            )}
            {d.said.bad.length > 0 && (
              <span className="inline-flex items-baseline gap-1.5">
                <span>Chê</span>
                <b className="font-semibold text-foreground">
                  {d.said.bad.join(", ")}
                </b>
              </span>
            )}
          </span>
        )}

        {d.restOrigins > 0 && (
          <Link
            href={transportHref}
            className="inline-flex items-center gap-1.5 font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Còn {d.restOrigins} nơi xuất phát khác
            <Glyph name="forward" className="size-4" />
          </Link>
        )}
      </div>
    </aside>
  );
}
