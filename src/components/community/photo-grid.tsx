import Image from "next/image";
import { cn } from "@/lib/utils";

export type PostImage = { url: string; alt: string | null };

function GridImg({ img, className }: { img: PostImage; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={img.url}
        alt={img.alt ?? ""}
        fill
        sizes="(min-width: 640px) 36rem, 100vw"
        className="object-cover"
      />
    </div>
  );
}

// Lưới ảnh kiểu Facebook: 1 / 2 / 3 / 4+ (ảnh thứ 4 phủ "+N" nếu còn nữa).
export function PhotoGrid({ images }: { images: PostImage[] }) {
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  const extra = images.length - 4;

  if (shown.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl">
        <GridImg img={shown[0]} className="aspect-[16/10]" />
      </div>
    );
  }

  if (shown.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
        {shown.map((img, i) => (
          <GridImg key={i} img={img} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (shown.length === 3) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
        <GridImg img={shown[0]} className="col-span-2 aspect-[16/9]" />
        <GridImg img={shown[1]} className="aspect-square" />
        <GridImg img={shown[2]} className="aspect-square" />
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
      {shown.map((img, i) => (
        <div key={i} className="relative">
          <GridImg img={img} className="aspect-square" />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-xl font-semibold text-white">
              +{extra}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
