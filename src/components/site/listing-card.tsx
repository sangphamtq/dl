import Link from "next/link";
import Image from "next/image";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  subtitle?: string | null;
  tag?: string | null;
  meta?: string[];
  price?: string | null;
  // featured = card lớn, chữ phủ lên ảnh (dùng làm điểm nhấn đầu mục).
  featured?: boolean;
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
  tag,
  meta = [],
  price,
  featured = false,
  className,
}: ListingCardProps) {
  const hasFooter = meta.length > 0 || !!price;

  if (featured) {
    return (
      <Link
        href={href}
        className={cn(
          "group relative block overflow-hidden rounded-2xl shadow-sm shadow-black/5 transition-shadow hover:shadow-md",
          className,
        )}
      >
        <div className="relative aspect-[16/10] sm:aspect-[2/1]">
          <Image
            src={coverUrl(images, slug, 1200, 600)}
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
    <Link href={href} className={cn("group block", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5 transition-shadow group-hover:shadow-md">
        <Image
          src={coverUrl(images, slug)}
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
      <h3 className="mt-3 font-semibold tracking-tight line-clamp-1">{name}</h3>
      {subtitle && (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
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
    </Link>
  );
}
