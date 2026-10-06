import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import {
  PreviewAllRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { SectionHeading } from "@/components/site/section-heading";
import { R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

/* Xem trước tab Lưu trú. Trục của mục này là NIỀM TIN, không phải ảnh đẹp hay
   giá (schema cố ý không có `priceRange`): giá trị độc nhất của dự án là danh bạ
   chỗ ở đã xác minh chính chủ. Vì vậy dấu xác minh đặt ngay CẠNH TÊN — chỗ mắt
   dừng lại — chứ không phải một huy hiệu góc ảnh; nó tự giải thích theo đúng
   ngữ pháp "tài khoản đã xác minh" mà ai cũng đọc được, nên khối này không cần
   một câu chú thích dưới tiêu đề.

   Thẻ giữ TỐI THIỂU (ảnh · tên · khu vực): kênh liên hệ, chính sách cọc và tag
   chỉ sống ở popup của tab và trang chi tiết `/luu-tru/[slug]`. */

export type StayEntry = {
  slug: string;
  name: string;
  address: string | null;
  isVerified: boolean;
  /** null = chưa có ảnh THẬT; đừng rơi về ảnh stock. */
  image: string | null;
};

/* Lấy mẩu địa chỉ có sức phân biệt nhất: mẩu cuối KHÔNG trùng tên điểm đến
   ("…, Hàm Tiến, Mũi Né, TP. Phan Thiết" → "Mũi Né"). Sau sáp nhập 2025 tên
   xã/phường mất sức phân biệt nên không dùng `wardName` (CLAUDE.md §1). */
function areaOf(address: string | null, placeName: string): string | null {
  if (!address) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.toLowerCase().includes(placeName.toLowerCase()));
  return parts[parts.length - 1] ?? null;
}

export function StayDirectory({
  placeName,
  href,
  total,
  stays,
  moreImages = [],
}: {
  placeName: string;
  href: string;
  total?: number;
  stays: StayEntry[];
  /** Ảnh bìa của các chỗ ở chưa có ô, cho dòng "Xem tất cả". */
  moreImages?: string[];
}) {
  if (stays.length === 0) return null;

  return (
    <div>
      <SectionHeading
        serif
        title={`Nơi lưu trú ở ${placeName}`}
        href={href}
        count={total}
        unit="chỗ ở"
      />

      <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-6 md:grid-cols-4">
        {stays.map((s, i) => (
          <Card key={s.slug} s={s} placeName={placeName} priority={i < 4} />
        ))}
      </ul>

      <div className="mt-6 border-t border-border/60">
        <PreviewAllRow
          href={href}
          more={Math.max(0, (total ?? stays.length) - stays.length)}
          unit="chỗ ở nữa"
          allLabel="chỗ ở"
          images={moreImages}
        />
      </div>

    </div>
  );
}

function Card({
  s,
  placeName,
  priority,
}: {
  s: StayEntry;
  placeName: string;
  priority: boolean;
}) {
  const area = areaOf(s.address, placeName);

  return (
    <li>
      <Link href={`/luu-tru/${s.slug}`} className="group block">
        {s.image ? (
          <TilePhoto
            src={s.image}
            ratio="aspect-[4/5]"
            sizes="(min-width: 768px) 23vw, 46vw"
            priority={priority}
          />
        ) : (
          <span
            className={cn(
              R_CARD,
              "grid aspect-[4/5] place-items-center bg-muted",
            )}
          >
            <Glyph name="bed" className="size-6 text-muted-foreground/40" />
          </span>
        )}

        <TileName className="mt-3 line-clamp-2">
          {s.name}
          {/* Dấu xác minh nằm TRONG dòng chữ (đi theo chữ cuối cùng, không trôi
              ra mép phải khi tên xuống hai dòng) và dùng đúng màu primary như
              huy hiệu ở trang chi tiết với trang /kiem-tra. */}
          {s.isVerified && (
            <Glyph
              name="check"
              className="ml-1.5 inline-block size-4 -translate-y-px text-primary"
              aria-label="Đã xác minh chính chủ"
            />
          )}
        </TileName>

        {area && (
          <p className="mt-1 flex gap-1.5 text-xs text-muted-foreground">
            <Glyph name="pin" className="mt-px size-3.5 shrink-0" />
            <span className="line-clamp-1">{area}</span>
          </p>
        )}
      </Link>
    </li>
  );
}
