import Image from "next/image";
import { UtensilsCrossed, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { FoodCrossLink } from "@/components/site/food-cross-link";

type CoverImg = { url: string; isCover: boolean }[];

export type SpecialtyDetailData = {
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  images: { id: string; url: string; alt: string | null; isCover: boolean }[];
  eateries: { slug: string; name: string; images: CoverImg }[];
};

// Nội dung chi tiết Đặc sản — render trong ngăn trượt (drawer), bố cục dọc tiết kiệm.
export function SpecialtyDetail({
  data,
  onOpenEatery,
}: {
  data: SpecialtyDetailData;
  onOpenEatery: (slug: string) => void;
}) {
  const strip =
    data.images.length > 0
      ? data.images
      : [
          {
            id: "fallback",
            url: coverUrl(data.images, data.slug, 800, 600),
            alt: data.name,
            isCover: true,
          },
        ];
  const single = strip.length === 1;

  return (
    <div className="flex flex-col pb-8">
      {/* Header dính: thumbnail + tên */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/90 py-3 pr-14 pl-5 backdrop-blur-md">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image
            src={coverUrl(data.images, data.slug, 120, 120)}
            alt={data.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-semibold text-warm">
            <UtensilsCrossed className="size-3" aria-hidden /> Đặc sản
          </p>
          <h2 className="truncate text-base font-bold tracking-tight">
            {data.name}
          </h2>
        </div>
      </div>

      {/* Dải ảnh cuộn ngang */}
      <div className="hide-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pt-4">
        {strip.map((im) => (
          <div
            key={im.id}
            className={cn(
              "relative aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted",
              single ? "w-full" : "w-[82%] sm:w-72",
            )}
          >
            <Image
              src={im.url}
              alt={im.alt ?? data.name}
              fill
              sizes="(min-width: 640px) 18rem, 82vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="space-y-5 px-5 pt-5">
        {data.description && (
          <p className="whitespace-pre-line leading-7 text-foreground/90">
            {data.description}
          </p>
        )}

        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {data.eateries.length > 0 && (
        <div className="mt-7 border-t pt-6">
          <div className="flex items-center gap-2 px-5">
            <Store className="size-4 text-warm" aria-hidden />
            <h3 className="text-sm font-semibold">Ăn ở đâu</h3>
          </div>
          <div className="hide-scrollbar mt-3.5 flex snap-x gap-3 overflow-x-auto px-5">
            {data.eateries.map((e) => (
              <FoodCrossLink
                key={e.slug}
                name={e.name}
                slug={e.slug}
                images={e.images}
                onClick={() => onOpenEatery(e.slug)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
