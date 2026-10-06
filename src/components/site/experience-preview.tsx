import Image from "next/image";
import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import { SectionHeading } from "@/components/site/section-heading";
import {
  FactLine,
  PhotoBadge,
  PreviewAllRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";

/* Xem trước tab Trải nghiệm. CỐ Ý không phải một lưới ảnh đều nhau như lưới địa
   điểm ngay trên: `Spot` là một CHỖ nên tấm ảnh chính là nội dung, còn
   `Activity` là một VIỆC — thứ chốt quyết định là BAO LÂU · BAO NHIÊU TIỀN ·
   MÙA NÀO. Nên ở đây là MỘT việc dẫn cỡ lớn + chỉ mục các việc còn lại kèm ảnh
   nhỏ, giá dóng về mép phải để so được giữa các dòng.

   Mỗi mục chỉ giữ đúng bốn thứ: ảnh · tên · (bao lâu + mùa) · giá. Tên spot,
   đơn vị khai thác… để dành cho tab và trang chi tiết. */

export type ExperienceItem = {
  slug: string;
  name: string;
  category: string | null;
  /** null = chưa có ảnh THẬT; đừng rơi về ảnh stock. */
  image: string | null;
  description: string | null;
  duration: string | null;
  season: string | null;
  /** Nhãn giá dựng từ `ticketTiers` ("Từ 150.000đ"), null khi không rõ. */
  price: string | null;
  free: boolean;
};

export function ExperiencePreview({
  title,
  href,
  count,
  unit,
  items,
  moreImages = [],
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string;
  items: ExperienceItem[];
  /** Ảnh bìa của các trải nghiệm chưa có chỗ, cho dòng "Xem tất cả". */
  moreImages?: string[];
}) {
  if (items.length === 0) return null;

  const more = Math.max(0, (count ?? items.length) - items.length);
  const leadIndex = items.findIndex((i) => i.image);
  const lead = leadIndex >= 0 ? items[leadIndex]! : null;
  const rows = lead ? items.filter((_, i) => i !== leadIndex) : items;

  return (
    <div>
      <SectionHeading serif title={title} href={href} count={count} unit={unit} />

      <div className="mt-7 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        {lead && <Lead it={lead} />}

        <div className={cn("min-w-0", !lead && "lg:col-span-2")}>
          {(rows.length > 0 || href) && (
            <ul
              className={cn(
                "border-t border-border/60",
                // Không nơi nào có ảnh thật (Tà Xùa) ⇒ không có ô dẫn, cũng
                // không dựng cột ảnh toàn khung xám: chỉ mục chạy hai cột.
                !lead && "lg:columns-2 lg:gap-x-10",
              )}
            >
              {rows.map((it) => (
                // `break-inside-avoid`: ở bản hai cột CSS, không khai thì một
                // dòng có thể bị cắt làm đôi giữa hai cột.
                <li
                  key={it.slug}
                  className="break-inside-avoid border-b border-border/60"
                >
                  <Row it={it} withThumb={!!lead} />
                </li>
              ))}

              {/* Thành viên CUỐI của bộ, không phải nút dán thêm: cùng hairline,
                  cùng cột ảnh và cùng cột phải với các dòng trên. */}
              {href && (
                <li className="break-inside-avoid border-b border-border/60">
                  <PreviewAllRow
                    href={href}
                    more={more}
                    unit="trải nghiệm nữa"
                    allLabel="trải nghiệm"
                    images={moreImages}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Lead({ it }: { it: ExperienceItem }) {
  return (
    <Link href={`/hoat-dong/${it.slug}`} className="group block">
      <TilePhoto
        src={it.image!}
        ratio="aspect-[4/3]"
        sizes="(min-width: 1024px) 320px, 100vw"
      >
        {it.category && <PhotoBadge>{it.category}</PhotoBadge>}
        {/* Huy hiệu chỉ cho giá CÓ SỐ: "Miễn phí" không cần nhấn, nó nằm ở dòng
            giá như mọi việc khác. */}
        {!it.free && it.price && (
          <PhotoBadge side="right" tone="mark" glyph="ticket">
            {it.price}
          </PhotoBadge>
        )}
      </TilePhoto>

      <TileName className="mt-3.5 line-clamp-2">{it.name}</TileName>

      {it.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {it.description}
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {it.season && (
          <FactLine glyph="calendar" tone="time">
            {it.season}
          </FactLine>
        )}
        {it.duration && <FactLine glyph="clock">{it.duration}</FactLine>}
      </div>
    </Link>
  );
}

function Row({ it, withThumb }: { it: ExperienceItem; withThumb: boolean }) {
  const price = it.free ? "Miễn phí" : it.price;
  const priceClass = cn(
    "text-sm tabular-nums",
    it.free ? "text-muted-foreground" : "font-semibold text-foreground",
  );

  return (
    <Link
      href={`/hoat-dong/${it.slug}`}
      className="group flex items-center gap-x-4 py-3.5"
    >
      {withThumb && (
        <span
          className={cn(
            R_CTRL,
            "relative aspect-[4/3] w-24 shrink-0 overflow-hidden bg-muted",
          )}
        >
          {it.image ? (
            <Image
              src={it.image}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            // Việc chưa có ảnh thì để ô trống có ký hiệu — `coverUrl` sẽ rơi về
            // ảnh stock ngẫu nhiên, mà ảnh lạ dán tên một việc có thật còn sai
            // hơn là không có ảnh.
            <span className="absolute inset-0 grid place-items-center">
              <Glyph name="sparkle" className="size-5 text-muted-foreground/40" />
            </span>
          )}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <TileName size="row" className="line-clamp-2">
          {it.name}
        </TileName>

        {(it.duration || it.season || price) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {it.duration && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Glyph name="clock" className="size-3.5 shrink-0" />
                {it.duration}
              </span>
            )}
            {/* Xanh = "đi lúc nào cho đúng" (quy ước màu, CLAUDE.md §3). */}
            {it.season && (
              <span className="inline-flex items-center gap-1.5 font-medium text-primary-ink">
                <Glyph name="calendar" className="size-3.5 shrink-0" />
                {it.season}
              </span>
            )}
            {/* Giá có HAI bản, `display` chọn: dưới `sm` nó đi cùng dòng dữ kiện
                (cột giá riêng bóp tên việc còn một hai chữ), từ `sm` nó về mép
                phải để so được giữa các dòng. */}
            {price && <span className={cn(priceClass, "sm:hidden")}>{price}</span>}
          </p>
        )}
      </div>

      {price && (
        <span className={cn(priceClass, "hidden shrink-0 sm:block")}>{price}</span>
      )}
    </Link>
  );
}
