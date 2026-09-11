import Link from "next/link";
import { SectionHeading } from "@/components/site/section-heading";
import {
  FactLine,
  N,
  PhotoBadge,
  Stat,
  StatRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { compositionLine, countByLabel } from "@/lib/listing-summary";

export type SpotPreviewItem = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  categoryLabel: string | null;
  area: string | null; // wardName — khu vực trong điểm đến
  bestTime: string | null;
  notice: string | null;
  price: string | null; // chỉ khi CÓ bán vé (nơi vào tự do để null)
  image: string;
};

/* ──────────────────────────────────────────────────────────────────
   "Địa điểm đáng ghé" — bản xem trước của tab ĐỊA ĐIỂM.

   ĐÃ THAY CẢ MỘT COMPONENT: bản trước (`SpotSpotlight`, ~680 dòng client) là
   một dải tràn viền tự đổi mục 7 giây một lần, ảnh lồng khung mat kiểu ảnh in,
   cột sáu hàng có thanh tiến trình riêng, cộng một carousel Embla thứ hai cho
   khổ hẹp. Ba lý do bỏ, không phải vì nó xấu:

     · **Hai thứ tự chạy trên cùng một trang.** Hero ngay phía trên đã là một
       dải ảnh tự đổi có nút play/pause. Mục thứ hai cũng tự đổi, cũng có
       play/pause, cũng có thanh tiến trình — trang thành một chuỗi băng chuyền
       và không còn chỗ nào đứng yên để mắt nghỉ.
     · **Một BẢN XEM TRƯỚC không được nặng hơn thứ nó xem trước.** Đây là mục
       duy nhất của trang tổng quan phải tải JS, và nó tải nhiều hơn cả tab
       Địa điểm thật (tab đó chỉ có bộ lọc).
     · **Nó nói một thứ tiếng khác.** Năm tab con đã thống nhất: thẻ không
       khung, huy hiệu loại màu trắng, dòng xanh "đẹp nhất lúc…", dòng cam cảnh
       báo. Dải mat + chữ trắng đè ảnh không có chỗ cho bất kỳ dòng nào trong số
       đó — và `bestTime`/`notice` chính là hai thứ đổi kế hoạch mạnh nhất của
       một địa điểm.

   Nay là MỘT THẺ LỚN + DANH SÁCH HÀNG, hai dạng xem của chính tab Địa điểm đặt
   cạnh nhau. Nó cũng là mục duy nhất trên trang có hình thái đó — bốn mục còn
   lại đều là lưới ô đều nhau, nên mục mở đầu có trọng lượng riêng mà không cần
   tràn viền hay tự động chạy.

   Là Server Component: không một byte JS nào.
   ────────────────────────────────────────────────────────────────── */
/** Dữ kiện của TOÀN BỘ danh sách (không phải của mấy mục đang hiện) — xem chú
 *  thích ở chỗ truy vấn trong `page.tsx`. */
export type SpotFacts = {
  categoryLabel: string | null;
  free: boolean;
  paid: boolean;
  noticed: boolean;
};

export function SpotPreview({
  title,
  count,
  allHref,
  spots,
  facts,
}: {
  title: string;
  count?: number;
  allHref: string;
  spots: SpotPreviewItem[];
  facts: SpotFacts[];
}) {
  const items = spots.slice(0, 5);
  const lead = items[0];
  if (!lead) return null;
  const rest = items.slice(1);

  // Dải dữ kiện nói về TOÀN BỘ danh sách mà link "Xem tất cả" dẫn tới, nên đếm
  // trên `facts` chứ không trên 5 mục đang hiện.
  const cats = countByLabel(facts.map((f) => f.categoryLabel));
  const composition = compositionLine(cats, facts.length);
  const paid = facts.filter((f) => f.paid).length;
  const free = facts.filter((f) => f.free).length;
  const noticed = facts.filter((f) => f.noticed).length;

  return (
    <div>
      <SectionHeading
        serif
        title={title}
        href={allHref}
        count={count}
        unit="địa điểm"
      />

      <StatRow>
        <Stat glyph="pin">
          {composition ?? (
            <>
              <N>{count ?? facts.length}</N> địa điểm
            </>
          )}
        </Stat>
        {free > 0 && (
          <Stat glyph="gate">
            <N>{free}</N> vào tự do
          </Stat>
        )}
        {paid > 0 && (
          <Stat glyph="ticket">
            <N>{paid}</N> có bán vé
          </Stat>
        )}
        {noticed > 0 && (
          <Stat glyph="warn">
            <N>{noticed}</N> nơi có lưu ý
          </Stat>
        )}
      </StatRow>

      {/* Thẻ lớn bên trái, danh sách bên phải. Hai cột KHÔNG cân nhau
          (1.4 : 1) — cân nhau thì thành hai khối ngang vai và mất đúng thứ mục
          này cần: một điểm dừng mắt. */}
      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <LeadCard s={lead} />

        {rest.length > 0 && (
          <ul className="border-t border-border/60">
            {rest.map((s) => (
              <li key={s.slug} className="border-b border-border/60">
                <SpotRow s={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* Thẻ dẫn — cùng khuôn thẻ lưới của tab Địa điểm, phóng to. Không phải một
   hình khối mới: chỉ là ảnh 3/2 bo `R_CARD` với tên cỡ lớn hơn một bậc. */
function LeadCard({ s }: { s: SpotPreviewItem }) {
  const subline = s.tagline ?? s.description;
  return (
    <Link href={`/dia-diem/${s.slug}`} className="group block">
      <TilePhoto
        src={s.image}
        ratio="aspect-[4/3] sm:aspect-[3/2]"
        sizes="(min-width: 1024px) 55vw, 92vw"
        priority
      >
        {s.categoryLabel && <PhotoBadge>{s.categoryLabel}</PhotoBadge>}
        {s.price && (
          <PhotoBadge side="right" tone="dark" glyph="ticket">
            {s.price}
          </PhotoBadge>
        )}
      </TilePhoto>

      <TileName size="lead" className="mt-4">
        {s.name}
      </TileName>

      {subline && (
        <p className="mt-2 line-clamp-2 max-w-2xl leading-relaxed text-muted-foreground">
          {subline}
        </p>
      )}

      <div className="mt-3.5 space-y-1.5">
        {s.bestTime && (
          <FactLine glyph="sunrise" tone="time">
            Đẹp nhất: {s.bestTime}
          </FactLine>
        )}
        {s.notice && (
          <FactLine glyph="warn" tone="warn" clamp={2}>
            {s.notice}
          </FactLine>
        )}
        {s.area && <FactLine glyph="pin">{s.area}</FactLine>}
      </div>
    </Link>
  );
}

/* Hàng danh sách — đúng khuôn `SpotListRow` của tab Địa điểm, thu nhỏ: ảnh
   trái, chữ phải, hairline ngăn hàng. Mỗi hàng mang MỘT dòng dữ kiện (giờ vàng
   ưu tiên, không có thì cảnh báo, rồi mới tới khu vực) — cột này hẹp, nhồi ba
   dòng vào thì nó tranh vai với thẻ dẫn bên trái. */
function SpotRow({ s }: { s: SpotPreviewItem }) {
  return (
    <Link href={`/dia-diem/${s.slug}`} className="group flex gap-3.5 py-3.5">
      <TilePhoto
        src={s.image}
        ratio="aspect-[3/2]"
        sizes="112px"
        className="w-24 shrink-0 self-start sm:w-28"
      />

      <div className="min-w-0 flex-1">
        <TileName size="row" className="line-clamp-1">
          {s.name}
        </TileName>
        <div className="mt-1.5">
          {s.bestTime ? (
            <FactLine glyph="sunrise" tone="time">
              {s.bestTime}
            </FactLine>
          ) : s.notice ? (
            <FactLine glyph="warn" tone="warn">
              {s.notice}
            </FactLine>
          ) : s.area ? (
            <FactLine glyph="pin">{s.area}</FactLine>
          ) : s.categoryLabel ? (
            <FactLine glyph="pin">{s.categoryLabel}</FactLine>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
