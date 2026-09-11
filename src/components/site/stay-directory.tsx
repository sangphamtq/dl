import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import {
  FactLine,
  N,
  PhotoBadge,
  Stat,
  StatRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { coverUrl } from "@/lib/place-image";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";

export type StayEntry = {
  slug: string;
  name: string;
  category: string | null;
  address: string | null;
  isVerified: boolean;
  images: { url: string; isCover: boolean }[];
};

// Section "Nơi lưu trú" của trang Place — MỘT HÀNG BỐN THẺ.
//
// Tab tổng quan chỉ giới thiệu cái nổi bật; danh sách đầy đủ là trang riêng
// /diem-den/[slug]/luu-tru. Nên section này CHỈ MỘT HÀNG, đúng bốn mục, và KHÔNG
// carousel — không có gì bị ẩn sau một cú vuốt, muốn xem hết thì bấm "Xem tất cả".
//
// Thẻ: ảnh LỒNG TRONG lòng thẻ (thẻ có lề mỏng quanh ảnh, ảnh bo góc riêng), chữ
// nằm dưới ảnh trên nền đặc. Bản trước đặt hết chữ chồng lên ảnh — đẹp lúc ảnh
// tối, nhưng ảnh homestay phần lớn là trời sáng và tường trắng, phải dằn một lớp
// phủ đen khá đậm mới đọc được chữ, tức là làm mờ chính tấm ảnh để cứu chữ. Tách
// hai lớp ra thì ảnh giữ nguyên độ trong và chữ đạt tương phản thật.
//
// Còn lại đúng mẫu card listing trong skill `design`: ảnh 4/3 bo góc lớn → nhãn
// loại hình → tên → địa chỉ. Thẻ KHÔNG bày kênh liên hệ (Zalo/điện thoại/FB):
// bốn hàng icon giống hệt nhau chỉ làm nặng lưới mà không phân biệt được chỗ nào
// với chỗ nào — liên hệ là việc của trang chi tiết, bấm vào là tới.
//
// Vẫn giữ nguyên định vị của mục này (xem CLAUDE.md: danh bạ ĐÃ XÁC MINH CHÍNH
// CHỦ, không phải OTA): huy hiệu xác minh trên ảnh, con số đã xác minh ở đầu và
// một cảnh báo cọc cho cả section.
//
// Là Server Component: mọi thứ tĩnh, không tốn byte JS nào.
/** Dữ kiện của TOÀN BỘ danh sách (không phải của 4 ô đang hiện) — xem chú thích
 *  ở chỗ truy vấn trong `page.tsx`. */
export type StayFacts = { categoryLabel: string | null };

export function StayDirectory({
  placeName,
  href,
  total,
  verifiedTotal,
  stays,
  facts,
}: {
  placeName: string;
  href: string;
  total?: number;
  verifiedTotal: number;
  stays: StayEntry[];
  facts: StayFacts[];
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

      {/* DỮ KIỆN, không phải lời giới thiệu — và nay dùng ĐÚNG dải "glyph + số
          đậm" của bốn mục xem trước còn lại, thay cho hai viên pill.
          Một viên có viền là hình của thứ BẤM ĐƯỢC trên site này (chip lọc,
          thanh tab), nên hai nhãn tĩnh đeo viền đọc ra như hai bộ lọc không
          chịu hoạt động. Dải dữ kiện thì tự nói nó chỉ để đọc.
          Bản trước nữa mở bằng một câu quảng bá, rồi mỗi thẻ lại ghi "Liên hệ
          chính chủ", rồi cuối section một đoạn dặn dò nữa: BA lớp chữ nói đúng
          một điều, bao quanh bốn tấm ảnh trong một bản xem trước. */}
      <StatRow>
        <Stat glyph="bed">
          {compositionLine(
            countByLabel(facts.map((f) => f.categoryLabel)),
            facts.length,
          ) ?? (
            <>
              <N>{total ?? stays.length}</N> chỗ ở
            </>
          )}
        </Stat>
        {verifiedTotal > 0 ? (
          <Stat glyph="check">
            <N>{verifiedTotal}</N> đã xác minh chính chủ
          </Stat>
        ) : (
          <Stat glyph="shield">Chưa chỗ nào được xác minh</Stat>
        )}
      </StatRow>

      {/* XÁC MINH NGHĨA LÀ GÌ — một câu, đặt ngay dưới con số.
          Trước đây trang này chưa bao giờ nói huy hiệu "Đã xác minh" là xác
          minh CÁI GÌ, BỞI AI. Một chỗ đã xác minh và một chỗ chưa nằm cạnh nhau
          trong cùng một hàng, khác nhau đúng một huy hiệu nhỏ — mà chính sự
          khác nhau đó mới là sản phẩm. Nhãn không tự định nghĩa thì nó chỉ là
          trang trí, và ở mục chống lừa cọc thì đó là trang trí nguy hiểm. */}
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground">Đã xác minh</strong> =
        Halivivu đã đối chiếu kênh liên hệ (Zalo, Facebook, điện thoại) với chủ
        nhà. Chỗ chưa xác minh vẫn hiện, nhưng bạn nên tự kiểm trước khi chuyển
        cọc.
      </p>

      {/* Một hàng: bốn ô từ lg. Hẹp hơn thì hai cột, rồi một cột — bốn ô dàn
          ngang trên màn 768px chỉ còn ~180px/ô, chữ trên ảnh hết chỗ. */}
      {/* `grid-cols-2` NGAY TỪ ĐẦU, khớp với `ExperienceGrid` ngay trên nó.
          Ở `grid-cols-1` thì bốn ô xếp chồng cao 1.682px — mục này thành khối
          LỚN NHẤT trang ở khổ 390 (18% tổng chiều cao), trong khi mục Ẩm thực
          — thứ trang cố ý dựng làm đỉnh — chỉ 652px. Một bản XEM TRƯỚC bốn ô
          không được nặng hơn đỉnh của trang. */}
      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 md:grid-cols-4">
        {stays.map((s, i) => (
          <StayTile key={s.slug} s={s} priority={i < 4} />
        ))}
      </ul>

      {/* Cảnh báo cọc — MỘT câu, luôn đúng, không rẽ nhánh theo số đã xác minh.
          Đây là lý do mục này tồn tại (xem CLAUDE.md) nên không được bỏ; nhưng
          nó là một QUY TẮC, không phải đoạn giải nghĩa huy hiệu. */}
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Glyph name="shield" className="mt-0.5 size-3.5 shrink-0 text-warm" />
        Chỉ chuyển cọc qua kênh liên hệ hiển thị trên trang từng chỗ ở.
      </p>
    </div>
  );
}

/* Một thẻ — THẺ KHÔNG KHUNG, đúng khuôn thẻ của tab Nơi lưu trú: ảnh 4/3 bo
   `R_CARD` mang huy hiệu loại hình (trái) và huy hiệu xác minh (phải) → tên →
   khu vực.

   Huy hiệu xác minh nền TRẮNG ĐẶC, không phải kính mờ: bản kính
   (`bg-black/35 backdrop-blur-md` + chữ trắng) đo được ~2,6:1 trên ảnh Sunny
   House (nhà trắng, cát nhạt) — dưới cả ngưỡng 4,5:1 của chữ lẫn 3:1 của phần
   tử phi văn bản, mà ảnh homestay đa số là ngoại thất ban ngày nên đó là ca
   THƯỜNG. Đây lại đúng là nhãn mang tính quyết định của cả mục: nó tồn tại để
   chống lừa cọc. */
function StayTile({ s, priority }: { s: StayEntry; priority: boolean }) {
  return (
    <li>
      <Link href={`/luu-tru/${s.slug}`} className="group block">
        <TilePhoto
          src={coverUrl(s.images, s.slug, 800, 600)}
          sizes="(min-width: 768px) 23vw, 46vw"
          priority={priority}
        >
          {s.category && (
            <PhotoBadge>
              {label(ACCOMMODATION_CATEGORY_LABELS, s.category)}
            </PhotoBadge>
          )}
          {s.isVerified && (
            <PhotoBadge side="right" tone="mark" glyph="check">
              Đã xác minh
            </PhotoBadge>
          )}
        </TilePhoto>

        <div className="mt-3.5 flex min-h-[3.25rem] items-start">
          {/* line-clamp-2: ô hẹp ~300px ở lg nên tên dài phải có điểm dừng. */}
          <TileName className="line-clamp-2">{s.name}</TileName>
        </div>

        {s.address && (
          <div className="mt-1">
            <FactLine glyph="pin">{s.address}</FactLine>
          </div>
        )}
      </Link>
    </li>
  );
}
