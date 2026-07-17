import Link from "next/link";
import Image from "next/image";
import { Ic } from "@/components/icon";
import { SectionHeading } from "@/components/site/section-heading";

export type SpotShowcaseItem = {
  slug: string;
  name: string;
  category: string | null;
  location: string | null;
  image: string;
  description: string | null;
};

// Section "Địa điểm đáng ghé": lưới 2 cột, mỗi mục là hàng ngang (thumbnail lớn
// + loại/vị trí + tên + mô tả ngắn). Không hero featured.
export function SpotShowcase({
  title,
  count,
  allHref,
  spots,
}: {
  title: string;
  count?: number;
  allHref: string;
  spots: SpotShowcaseItem[];
}) {
  if (spots.length === 0) return null;

  return (
    <div>
      <SectionHeading title={title} href={allHref} count={count} unit="địa điểm" />

      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {spots.map((s) => {
          const meta = [s.category, s.location].filter(Boolean).join(" · ");
          return (
            <Link
              key={s.slug}
              href={`/dia-diem/${s.slug}`}
              className="group flex items-center gap-4"
            >
              <div className="relative size-32 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                {meta && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {meta}
                  </p>
                )}
                <h4 className="mt-0.5 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {s.name}
                </h4>
                {s.description && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                )}
              </div>
              <Ic
                icon="chevron-right"
                className="size-5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
