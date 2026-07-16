import Link from "next/link";
import Image from "next/image";
import { coverUrl } from "@/lib/place-image";

// Card nhỏ cho mục liên kết chéo (Spot↔Activity) trên trang công khai.
export function CrossLinkCard({
  href,
  name,
  slug,
  images,
  subtitle,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  subtitle?: string | null;
}) {
  return (
    <Link href={href} className="group block overflow-hidden rounded-xl">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="mt-3 space-y-0.5">
        <h3 className="font-semibold tracking-tight">{name}</h3>
        {subtitle && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
