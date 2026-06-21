import Image from "next/image";
import { coverUrl } from "@/lib/place-image";

// Mini-card liên kết chéo (đặc sản ↔ quán) — xếp thành hàng cuộn ngang trong drawer.
// Bấm để chuyển drawer sang mục kia.
export function FoodCrossLink({
  name,
  slug,
  images,
  onClick,
}: {
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-28 shrink-0 snap-start text-left"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(images, slug, 220, 220)}
          alt={name}
          fill
          sizes="112px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{name}</p>
    </button>
  );
}
