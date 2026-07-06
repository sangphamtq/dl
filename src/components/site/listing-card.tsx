import Link from "next/link";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { CoverImage } from "@/components/site/cover-image";

type ListingCardProps = {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  subtitle?: string | null;
  // Nhóm có nhãn (vd "Điểm nhấn", "Làm gì") — mỗi nhóm một dòng "Nhãn: a · b · c". Ưu tiên hơn subtitle.
  sections?: { label: string; items: string[] }[];
  tag?: string | null;
  meta?: string[];
  price?: string | null;
  // Tỉ lệ khung ảnh (class Tailwind) — mặc định 4:3. Vd 3-up dùng "aspect-[3/2]".
  aspectClass?: string;
  // featured = card lớn, chữ phủ lên ảnh (dùng làm điểm nhấn đầu mục).
  featured?: boolean;
  // framed = cả card trong khung viền bo góc, chữ có padding bên trong.
  framed?: boolean;
  className?: string;
};

// Card listing dùng chung cho trang Place. Hai biến thể cùng họ thị giác:
// - thường: ảnh 4:3 trên cùng + chữ bên dưới.
// - featured: ảnh lớn 16:9, gradient + chữ phủ lên — tạo nhịp, tránh đều đều.
export function ListingCard({
  href,
  name,
  slug,
  images,
  subtitle,
  sections = [],
  tag,
  meta = [],
  price,
  aspectClass = "aspect-[4/3]",
  featured = false,
  framed = false,
  className,
}: ListingCardProps) {
  const hasFooter = meta.length > 0 || !!price;

  if (featured) {
    return (
      <Link
        href={href}
        className={cn(
          "group relative block overflow-hidden rounded-xl",
          className,
        )}
      >
        <div className="relative aspect-[16/10] sm:aspect-[2/1]">
          <CoverImage
            src={coverUrl(images, slug, 1200, 600)}
            fallbackSrc={coverUrl([], slug, 1200, 600)}
            alt={name}
            fill
            sizes="(min-width: 1024px) 66vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          {tag && (
            <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
              {tag}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <h3 className="text-balance text-xl font-bold tracking-tight text-white drop-shadow sm:text-2xl">
              {name}
            </h3>
            {subtitle && (
              <p className="mt-1.5 line-clamp-2 max-w-prose text-sm leading-relaxed text-white/85 drop-shadow">
                {subtitle}
              </p>
            )}
            {hasFooter && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {meta.map((m, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium text-white backdrop-blur"
                  >
                    {m}
                  </span>
                ))}
                {price && (
                  <span className="text-sm font-semibold text-white">{price}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group block",
        framed &&
          "overflow-hidden rounded-xl border border-border/60 bg-card transition-colors hover:border-border",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          aspectClass,
          !framed && "rounded-xl",
        )}
      >
        <CoverImage
          src={coverUrl(images, slug)}
          fallbackSrc={coverUrl([], slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {tag && (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
            {tag}
          </span>
        )}
      </div>
      <div className={cn(framed && "p-3")}>
        <h3
          className={cn(
            "font-semibold tracking-tight line-clamp-1",
            !framed && "mt-3",
          )}
        >
          {name}
        </h3>
        {sections.length > 0 ? (
          <div className="mt-2 space-y-1">
            {sections.map((s, i) => (
              <p key={i} className="text-sm leading-snug">
                <span className="font-medium text-foreground">{s.label}: </span>
                <span className="text-muted-foreground">
                  {s.items.join(" · ")}
                </span>
              </p>
            ))}
          </div>
        ) : (
          subtitle && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )
        )}
        {hasFooter && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {meta.map((m, i) => (
              <span
                key={i}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {m}
              </span>
            ))}
            {price && (
              <span className="text-sm font-semibold text-primary">{price}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
