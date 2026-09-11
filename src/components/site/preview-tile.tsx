import Image from "next/image";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────
   Vật liệu dùng chung của TAB TỔNG QUAN.

   Tab tổng quan là bản XEM TRƯỚC của năm tab con, nên nó phải nói đúng thứ
   tiếng của chúng. Năm tab đó đã chốt một bộ vật liệu:

     · thẻ KHÔNG khung — ảnh bo `R_CARD` là toàn bộ hình khối, chữ nằm trần
       trên nền trang bên dưới (chỉ thứ BẤM ĐƯỢC mới có viền, mà cả thẻ đã là
       một link nên viền chỉ vẽ lại đúng mép ảnh);
     · huy hiệu LOẠI màu trắng ở góc trên–trái ảnh, huy hiệu GIÁ nền mực ở góc
       trên–phải — trái là "đây là thứ gì", phải là "mất bao nhiêu";
     · tên bằng font display, gạch chân khi rê chuột;
     · dòng dữ kiện có glyph, màu mang nghĩa: **xanh = đi lúc nào cho đúng**
       (giờ vàng / mùa), **cam = cảnh báo**, xám = phần còn lại.

   Trước đợt này bốn mục xem trước mỗi mục tự dựng thẻ một kiểu: Ăn uống và Lưu
   trú bọc khung `border bg-card p-2`, Trải nghiệm dùng một dòng chữ cam thay
   huy hiệu, còn Địa điểm là cả một carousel tự đổi 7 giây. Gom vật liệu về một
   file để lần sau đổi thì cả trang đổi theo — đúng bài học đã trả giá ở chỗ
   khác trong dự án (hai bản hero chép ra hai file rồi trôi mỗi bản một kiểu).
   ────────────────────────────────────────────────────────────────── */

/** Khung ảnh của một thẻ xem trước. `children` là chỗ đặt huy hiệu. */
export function TilePhoto({
  src,
  alt = "",
  sizes,
  priority,
  ratio = "aspect-[4/3]",
  className,
  children,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  ratio?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(R_CARD, "relative overflow-hidden bg-muted", ratio, className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {children}
    </div>
  );
}

/* Ba tông huy hiệu, mỗi tông một việc — đừng đẻ thêm tông thứ tư mà không có
   việc mới:
     · `cat`  — LOẠI của mục (chữ hoa giãn ký tự, rất nhỏ): nhãn để nhận diện;
     · `mark` — một dữ kiện ĐÁNG KHOE ngay trên ảnh (đã xác minh, nhìn ra biển):
       chữ thường, có glyph, vì nó để ĐỌC chứ không để nhận diện;
     · `dark` — tiền. Nền mực để nó không lẫn với hai cái trắng kia. */
export function PhotoBadge({
  side = "left",
  tone = "cat",
  glyph,
  children,
}: {
  side?: "left" | "right";
  tone?: "cat" | "mark" | "dark";
  glyph?: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        R_BADGE,
        "absolute top-3 inline-flex items-center gap-1 px-2.5 py-1 shadow-sm backdrop-blur-sm",
        side === "left" ? "left-3" : "right-3",
        tone === "dark"
          ? "bg-neutral-900/85 text-[0.6875rem] font-semibold tabular-nums text-white"
          : "bg-white/95 text-neutral-900",
        tone === "cat" &&
          "text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
        tone === "mark" && "text-[0.7rem] font-semibold",
      )}
    >
      {glyph && <Glyph name={glyph} className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}

/** Tên mục. `lead` dành cho thẻ lớn duy nhất của một mục. */
export function TileName({
  size = "tile",
  className,
  children,
}: {
  size?: "tile" | "row" | "lead";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={cn(
        "font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline",
        size === "lead"
          ? "text-2xl sm:text-[1.75rem]"
          : size === "row"
            ? "text-base"
            : "text-base sm:text-lg",
        className,
      )}
    >
      {children}
    </h3>
  );
}

/* Một dòng dữ kiện dưới tên. Màu MANG NGHĨA và giống hệt năm tab con:
   `time` xanh = đi lúc nào cho đúng · `warn` cam = cảnh báo · `mute` = còn lại. */
export function FactLine({
  glyph,
  tone = "mute",
  clamp = 1,
  children,
}: {
  glyph: GlyphName;
  tone?: "time" | "warn" | "mute";
  clamp?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex gap-1.5 text-xs",
        tone === "time"
          ? "font-medium text-primary"
          : tone === "warn"
            ? "text-warm"
            : "text-muted-foreground",
      )}
    >
      <Glyph name={glyph} className="mt-px size-3.5 shrink-0" />
      <span className={clamp === 2 ? "line-clamp-2" : "line-clamp-1"}>
        {children}
      </span>
    </p>
  );
}

/* Dải dữ kiện mở đầu một mục — glyph + CON SỐ ĐẬM, ngăn nhau bằng khoảng trắng
   rộng chứ không bằng dấu chấm giữa (quy ước `design`). Cùng khuôn với dải mở
   đầu của năm tab con, nên mục xem trước và tab đầy đủ đọc ra một giọng. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Stat({
  glyph,
  children,
}: {
  glyph: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph
        name={glyph}
        className="size-[1.05rem] shrink-0 text-muted-foreground/70"
      />
      {children}
    </span>
  );
}

/** Con số trong một `Stat` — đậm, `tabular-nums`, màu chữ chính. */
export function N({ children }: { children: React.ReactNode }) {
  return (
    <b className="font-semibold tabular-nums text-foreground">{children}</b>
  );
}
