import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  MapPin,
  ShieldCheck,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
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

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Kính mờ trên ảnh — dùng cho cả huy hiệu xác minh và chip loại hình để hai đầu
// hàng trên cùng một chất liệu.
const GLASS = "rounded-full bg-black/35 text-white backdrop-blur-md";

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
export function StayDirectory({
  placeName,
  href,
  total,
  verifiedTotal,
  stays,
}: {
  placeName: string;
  href: string;
  total?: number;
  verifiedTotal: number;
  stays: StayEntry[];
}) {
  if (stays.length === 0) return null;

  return (
    <div>
      <SectionHeading
        title={`Ở đâu tại ${placeName}`}
        href={href}
        count={total}
        unit="chỗ ở"
      />

      {/* DỮ KIỆN, không phải lời giới thiệu.
          Bản trước mở bằng một câu quảng bá ("Danh bạ để bạn liên hệ trực tiếp
          chủ nhà — không qua trung gian, không đặt phòng tại đây"), rồi mỗi thẻ
          lại ghi "Liên hệ chính chủ", rồi cuối section lại một đoạn dặn dò nữa:
          BA lớp chữ nói đúng một điều, bao quanh bốn tấm ảnh trong một bản xem
          trước. Nay còn hai NHÃN — mỗi nhãn một dữ kiện tra được. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Danh bạ, không đặt phòng
        </span>
        {verifiedTotal > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
            {`${verifiedTotal}${total ? `/${total}` : ""} đã xác minh chính chủ`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Chưa chỗ nào được xác minh
          </span>
        )}
      </div>

      {/* Một hàng: bốn ô từ lg. Hẹp hơn thì hai cột, rồi một cột — bốn ô dàn
          ngang trên màn 768px chỉ còn ~180px/ô, chữ trên ảnh hết chỗ. */}
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stays.map((s, i) => (
          <StayTile key={s.slug} s={s} priority={i < 4} />
        ))}
      </ul>

      {/* Cảnh báo cọc — MỘT câu, luôn đúng, không rẽ nhánh theo số đã xác minh.
          Đây là lý do mục này tồn tại (xem CLAUDE.md) nên không được bỏ; nhưng
          nó là một QUY TẮC, không phải đoạn giải nghĩa huy hiệu. */}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-warm" aria-hidden />
        Chỉ chuyển cọc qua kênh liên hệ hiển thị trên trang từng chỗ ở.
      </p>
    </div>
  );
}

// Một thẻ: ảnh 4/3 lồng trong lòng thẻ (+ huy hiệu xác minh nổi trên ảnh) → nhãn
// loại hình → tên → địa chỉ.
function StayTile({ s, priority }: { s: StayEntry; priority: boolean }) {
  return (
    <li className="h-full">
      <Link
        href={`/luu-tru/${s.slug}`}
        className="group flex h-full flex-col rounded-[1.5rem] border border-border/60 bg-card p-2 transition-all duration-200 hover:border-transparent hover:shadow-lg hover:shadow-black/5"
      >
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[1.05rem] bg-muted">
          <Image
            src={coverUrl(s.images, s.slug, 800, 600)}
            alt=""
            fill
            // Bốn thẻ một hàng từ lg → mỗi ảnh ~1/4 bề ngang cột nội dung.
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover"
          />
          {s.isVerified && (
            // Huy hiệu là thứ DUY NHẤT còn nằm trên ảnh: nó phải đọc được ngay
            // từ lúc mắt còn ở khuôn hình, chưa xuống tới chữ.
            <span
              className={cn(
                GLASS,
                "absolute left-2.5 top-2.5 inline-flex items-center gap-1 py-1 pl-1.5 pr-2.5 text-[0.7rem] font-semibold",
              )}
            >
              <BadgeCheck className="size-4 shrink-0" aria-hidden />
              Đã xác minh
            </span>
          )}
        </span>

        <span className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
          {s.category && (
            <span className={cn(MICRO, "text-warm")}>
              {label(ACCOMMODATION_CATEGORY_LABELS, s.category)}
            </span>
          )}

          <span className="mt-1 flex items-start gap-2">
            {/* line-clamp-2: thẻ hẹp ~300px ở lg nên tên dài phải có điểm dừng. */}
            <span className="line-clamp-2 min-w-0 flex-1 font-[family-name:var(--font-display)] text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-lg">
              {s.name}
            </span>
            <ArrowUpRight
              className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
              aria-hidden
            />
          </span>

          {s.address && (
            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{s.address}</span>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
