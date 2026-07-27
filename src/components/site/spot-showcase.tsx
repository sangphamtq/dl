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

// Section "Địa điểm đáng ghé" — band sáng mờ nhạt (theo token theme): tiêu đề
// dùng SectionHeading như các mục khác, rồi lưới 2 cột × 3 item (mục hàng ngang:
// ảnh + loại/tên/vị trí/mô tả). Tối đa 6 mục; phần còn lại xem ở "Xem tất cả".
export function SpotShowcase({
  title,
  count,
  allHref,
  spots,
  eyebrow,
}: {
  title: string;
  count?: number;
  allHref: string;
  spots: SpotShowcaseItem[];
  eyebrow?: string;
}) {
  if (spots.length === 0) return null;
  const items = spots.slice(0, 6);

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          href={allHref}
          count={count}
          unit="địa điểm"
        />

        {/* Lưới 2 cột × 3 item */}
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {items.map((s) => (
            <Link
              key={s.slug}
              href={`/dia-diem/${s.slug}`}
              className="group flex items-center gap-4"
            >
              <div className="relative h-32 w-48 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-40 sm:w-64">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  sizes="256px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                {s.category && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {s.category}
                  </p>
                )}
                <h3 className="mt-1 line-clamp-1 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {s.name}
                </h3>
                {s.location && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ic icon="map-pin" className="size-3.5 shrink-0" aria-hidden />
                    {s.location}
                  </p>
                )}
                {s.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                )}
              </div>
              <Ic
                icon="chevron-right"
                className="size-5 shrink-0 self-center text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
