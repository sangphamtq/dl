import Link from "next/link";
import Image from "next/image";
import { Star } from "@/components/icons";
import { coverUrl } from "@/lib/place-image";

export type SpotItem = {
  slug: string;
  name: string;
  tagline: string | null;
  categoryLabel: string | null;
  placeName: string | null;
  isFeatured: boolean;
  images: { url: string; isCover: boolean }[];
};

// Thẻ địa điểm — cùng khuôn poster ngang với thẻ điểm đến ở /diem-den: ảnh 3/2,
// mép vuông, chữ căn giữa, lớp phủ tắt dần lên đỉnh, hover đổi vành + gạch chân.
//
// Khác hai chỗ, cả hai do nội dung quyết định:
//   · huy hiệu góc trên phải là LOẠI HÌNH, không phải "Nổi bật" — loại hình
//     khác nhau ở gần như mọi thẻ nên nó mang tin; ngôi sao chỉ thêm vào khi
//     thẻ đó nổi bật;
//   · KHÔNG có bảng dữ kiện ở đáy: một địa điểm không chứa gì bên trong để mà
//     đếm. Chỗ đó nhường cho tagline.
export function SpotCard({ s }: { s: SpotItem }) {
  return (
    <Link
      href={`/dia-diem/${s.slug}`}
      className="group relative block aspect-[3/2] overflow-hidden bg-muted"
    >
      <Image
        src={coverUrl(s.images, s.slug, 900, 600)}
        alt=""
        fill
        sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 92vw"
        className="object-cover"
      />

      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12 transition-[box-shadow] duration-300 group-hover:ring-white/55 motion-reduce:transition-none"
      />

      {s.categoryLabel && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 bg-white/95 py-1 pl-2 pr-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm">
          {s.isFeatured && (
            <Star className="size-3 shrink-0 text-[#a34c00]" aria-hidden />
          )}
          {s.categoryLabel}
        </span>
      )}

      <span className="absolute inset-0 flex flex-col items-center justify-center px-5 pt-6 text-center">
        {s.placeName && (
          <span className="max-w-full truncate font-[family-name:var(--font-rounded)] text-[0.8125rem] italic text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {s.placeName}
          </span>
        )}

        <span className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-normal leading-[1.18] tracking-[-0.015em] text-white underline-offset-[6px] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] group-hover:underline sm:text-[1.5rem]">
          {s.name}
        </span>

        {s.tagline && (
          <span className="mt-2 line-clamp-2 max-w-[94%] text-[0.9375rem] leading-snug text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] max-sm:hidden">
            {s.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
