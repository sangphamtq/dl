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
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";

export type ExperienceItem = {
  slug: string;
  name: string;
  category: string | null;
  image: string;
  duration: string | null; // "nửa ngày", "2N1Đ"
  season: string | null; // "tháng 10 – 4"
  // Các Spot mà trải nghiệm này diễn ra ở đó (quan hệ M:N Activity↔Spot).
  spotNames: string[];
  spotCount: number;
};

/* ──────────────────────────────────────────────────────────────────
   "Trải nghiệm nổi bật" — bản xem trước của tab TRẢI NGHIỆM. BỐN THẺ DỌC, tĩnh.

   Bản trước là băng ảnh kéo ngang tràn viền. Bỏ vì mục "Địa điểm đáng ghé"
   ngay trên đã là một khối lớn; hai khối liền nhau cùng đòi tương tác thì trang
   thành một chuỗi băng chuyền. Bốn thẻ nằm sẵn trên màn hình đọc xong trong một
   cái nhìn.

   Mỗi thẻ trả lời đúng ba câu hỏi của một trải nghiệm:
     1. LÀ GÌ — ảnh dọc + huy hiệu nhóm trên ảnh + tên;
     2. MÙA NÀO / BAO LÂU — `seasonText` (dòng XANH: đi lúc nào cho đúng) rồi
        `durationText` (xám). Đúng thứ tự và đúng màu của thẻ ở tab Trải nghiệm;
     3. DIỄN RA Ở ĐÂU — tên các `Spot` liên kết, dạng chip nền như `TagLine` bên
        tab kia. Trước đây chúng nối nhau bằng dấu chấm giữa, thứ quy ước
        `design` cấm; mà chúng vốn là những mẩu RỜI nên chip mới là hình đúng.

   Nhãn nhóm chuyển từ một dòng chữ cam dưới ảnh LÊN HUY HIỆU TRẮNG TRÊN ẢNH —
   cùng chỗ, cùng chất liệu với ba mục xem trước còn lại và với năm tab con.

   Là Server Component: tĩnh hoàn toàn, không tốn byte JS nào.
   ────────────────────────────────────────────────────────────────── */
/** Dữ kiện của TOÀN BỘ danh sách (không phải của 4 ô đang hiện) — xem chú thích
 *  ở chỗ truy vấn trong `page.tsx`. */
export type ExperienceFacts = { categoryLabel: string | null; seasonal: boolean };

export function ExperienceGrid({
  title,
  href,
  count,
  unit,
  items,
  facts,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string;
  items: ExperienceItem[];
  facts: ExperienceFacts[];
}) {
  if (items.length === 0) return null;

  const cats = countByLabel(facts.map((f) => f.categoryLabel));
  const composition = compositionLine(cats, facts.length);
  const seasonal = facts.filter((f) => f.seasonal).length;

  return (
    <div>
      <SectionHeading serif title={title} href={href} count={count} unit={unit} />

      <StatRow>
        <Stat glyph="sparkle">
          {composition ?? (
            <>
              <N>{count ?? facts.length}</N> trải nghiệm
            </>
          )}
        </Stat>
        {seasonal > 0 && (
          <Stat glyph="calendar">
            <N>{seasonal}</N> việc có mùa riêng
          </Stat>
        )}
      </StatRow>

      {/* Bậc `md` bị thiếu: mọi chuyển cột của trang đều gác ở `lg`, nên
          768–1023px nhận bố cục điện thoại với đệm desktop — đo được đó là bản
          render CAO NHẤT của cả trang, cao hơn cả ở 390px.
          Đi thẳng `md:grid-cols-4`, KHÔNG qua 3: các lưới này luôn có ĐÚNG 4
          mục, nên 3 cột vẫn là hai hàng (3 + 1 mồ côi) — tức tốn y hệt chiều
          cao của 2 cột mà lại thêm một ô lẻ. */}
      <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 md:grid-cols-4">
        {items.map((it) => (
          <Card key={it.slug} it={it} />
        ))}
      </ul>
    </div>
  );
}

function Card({ it }: { it: ExperienceItem }) {
  return (
    <li>
      <Link href={`/hoat-dong/${it.slug}`} className="group block">
        {/* Ảnh DỌC 4/5 — thứ phân biệt mục này với hai lưới 4/3 bên dưới (Ăn
            uống, Lưu trú). Ba lưới bốn ô liền nhau thì tỉ lệ ảnh là tín hiệu rẻ
            nhất và rõ nhất để chúng không đọc thành một khối. */}
        <TilePhoto
          src={it.image}
          ratio="aspect-[4/5]"
          sizes="(min-width: 768px) 23vw, 46vw"
        >
          {it.category && <PhotoBadge>{it.category}</PhotoBadge>}
        </TilePhoto>

        {/* Chiều cao tối thiểu cho khối tên: tên một dòng và tên hai dòng nằm
            cạnh nhau thì các dòng dữ kiện bên dưới vẫn thẳng hàng. */}
        <div className="mt-3.5 flex min-h-[3.25rem] items-start">
          <TileName className="line-clamp-2">{it.name}</TileName>
        </div>

        {(it.season || it.duration) && (
          <div className="mt-1 space-y-1.5">
            {it.season && (
              <FactLine glyph="calendar" tone="time">
                {it.season}
              </FactLine>
            )}
            {it.duration && <FactLine glyph="clock">{it.duration}</FactLine>}
          </div>
        )}

        {/* Diễn ra ở đâu — tên Spot thật, mỗi tên một chip. Trải nghiệm trải
            nhiều spot (chèo kayak, săn mây) là chuyện thường, nên đây là thông
            tin chứ không phải trang trí. Chip dùng NỀN chứ không viền: cả thẻ
            đã là một link, chip có viền sẽ mời bấm vào thứ không bấm được. */}
        {it.spotNames.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {it.spotNames.map((nme) => (
              <span
                key={nme}
                className={cn(
                  R_BADGE,
                  "max-w-full truncate bg-muted px-2 py-0.5 text-xs text-muted-foreground",
                )}
              >
                {nme}
              </span>
            ))}
            {it.spotCount > it.spotNames.length && (
              <span className="py-0.5 text-xs text-muted-foreground/80">
                +{it.spotCount - it.spotNames.length}
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}
