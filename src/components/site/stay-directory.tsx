import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Link2,
  MapPin,
  MessageCircle,
  Phone,
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
  // Kênh chính chủ — ở tầng này chỉ cần BIẾT CÓ hay không; bấm vào thẻ mới ra
  // trang chi tiết để liên hệ thật.
  zalo: string | null;
  phone: string | null;
  facebookUrl: string | null;
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
// hai lớp ra thì ảnh giữ nguyên độ trong, chữ đạt tương phản thật, và cụm tin cậy
// (huy hiệu + kênh liên hệ) có chỗ đứng rõ ràng thay vì chen vào khuôn hình.
//
// Còn lại đúng mẫu card listing trong skill `design`: ảnh 4/3 bo góc lớn → nhãn
// loại hình → tên → địa chỉ → dòng nhấn ở đáy (ở đây là kênh chính chủ, đứng đúng
// chỗ mà card thương mại đặt giá — Accommodation không có trường giá).
//
// Vẫn giữ nguyên định vị của mục này (xem CLAUDE.md: danh bạ ĐÃ XÁC MINH CHÍNH
// CHỦ, không phải OTA): huy hiệu xác minh, kênh liên hệ chính chủ và một cảnh báo
// cọc cho cả section đều còn.
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

  // Có mục nào bày được kênh liên hệ không? Quyết định cách hiển thị sự THIẾU
  // kênh bên dưới: khi cả hàng đều trắng kênh thì nói MỘT lần ở đầu section,
  // lặp lại trên từng ô chỉ thành bức tường phủ định.
  const anyChannel = stays.some((s) => s.zalo || s.phone || s.facebookUrl);

  return (
    <div>
      <SectionHeading
        eyebrow="Nghỉ ngơi"
        title={`Ở đâu tại ${placeName}`}
        href={href}
        count={total}
        unit="chỗ ở"
      />

      {/* Định vị + tình trạng xác minh, gộp một dòng: nói thẳng đây là danh bạ
          (không đặt phòng) và hiện đúng con số đã kiểm chứng — kể cả khi là 0. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Danh bạ để bạn{" "}
          <span className="font-medium text-foreground">
            liên hệ trực tiếp chủ nhà
          </span>{" "}
          — không qua trung gian, không đặt phòng tại đây.
        </p>
        {verifiedTotal > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BadgeCheck className="size-4" aria-hidden />
            {`${verifiedTotal}${total ? `/${total}` : ""} đã xác minh chính chủ`}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden />
            Kênh liên hệ đang được kiểm chứng
          </span>
        )}
      </div>

      {/* Một hàng: bốn ô từ lg. Hẹp hơn thì hai cột, rồi một cột — bốn ô dàn
          ngang trên màn 768px chỉ còn ~180px/ô, chữ trên ảnh hết chỗ. */}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stays.map((s, i) => (
          <StayTile
            key={s.slug}
            s={s}
            priority={i < 4}
            showMissingChannel={anyChannel}
          />
        ))}
      </ul>

      {/* Cảnh báo cọc — MỘT lần cho cả section, một dòng mảnh. Đây là lý do mục
          này tồn tại nên không được thiếu; nhưng cũng không lặp trên từng ô, vì
          cảnh báo lặp lại thì người ta ngừng đọc. */}
      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-warm" aria-hidden />
        {verifiedTotal > 0 ? (
          <span>
            Chỉ liên hệ và chuyển khoản qua kênh hiển thị ở trang từng chỗ ở. Huy
            hiệu <span className="font-medium text-foreground">đã xác minh</span>{" "}
            nghĩa là chúng tôi đã kiểm chứng đúng chính chủ — chưa có huy hiệu thì
            bạn tự đối chiếu kỹ trước khi cọc.
          </span>
        ) : (
          <span>
            Chưa chỗ nào ở đây được xác minh chính chủ.{" "}
            <span className="font-medium text-foreground">Đừng chuyển cọc</span>{" "}
            cho bất kỳ số hay tài khoản nào tự nhận là chủ nhà khi bạn chưa tự đối
            chiếu được.
          </span>
        )}
      </p>
    </div>
  );
}

// Một thẻ: ảnh 4/3 lồng trong lòng thẻ (+ huy hiệu xác minh nổi trên ảnh) → nhãn
// loại hình → tên → địa chỉ → dòng kênh chính chủ ở đáy.
function StayTile({
  s,
  priority,
  showMissingChannel,
}: {
  s: StayEntry;
  priority: boolean;
  showMissingChannel: boolean;
}) {
  const channels = [
    s.zalo && { icon: MessageCircle, text: "Zalo" },
    s.phone && { icon: Phone, text: "Điện thoại" },
    s.facebookUrl && { icon: Link2, text: "Facebook" },
  ].filter((c): c is { icon: typeof Phone; text: string } => Boolean(c));

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
            <span className="line-clamp-2 min-w-0 flex-1 font-[family-name:var(--font-display)] text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-lg">
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

          {/* mt-auto: dòng tin cậy luôn tì xuống đáy thẻ, nên bốn thẻ cạnh nhau
              có tên dài ngắn khác nhau vẫn thẳng một đường ở dưới. */}
          {channels.length > 0 ? (
            <span className="mt-auto flex items-center gap-2 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
              Liên hệ chính chủ
              <span className="ml-auto flex items-center gap-1 text-foreground/50">
                {channels.map((c) => (
                  <span key={c.text}>
                    <c.icon className="size-3.5" aria-hidden />
                    <span className="sr-only">{c.text}</span>
                  </span>
                ))}
              </span>
            </span>
          ) : (
            showMissingChannel && (
              <span className="mt-auto block border-t border-border/60 pt-2.5 text-xs text-muted-foreground/70">
                Chưa có kênh liên hệ
              </span>
            )
          )}
        </span>
      </Link>
    </li>
  );
}
