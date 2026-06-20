import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";

// Trang xem thử hero card-stack cho trang chi tiết điểm đến (dữ liệu mẫu).

const place = {
  name: "Hạ Long",
  slug: "ha-long",
  tagline: "Kỳ quan thiên nhiên thế giới — vịnh biển ngàn đảo đá",
  parent: { name: "Quảng Ninh", slug: "quang-ninh" },
};

const images: HeroImage[] = [
  {
    url: "https://picsum.photos/seed/halong-1/1600/1000",
    alt: "Vịnh Hạ Long lúc bình minh",
    caption: "Bình minh trên vịnh — hàng nghìn đảo đá vôi ẩn hiện trong sương.",
  },
  {
    url: "https://picsum.photos/seed/halong-2/1600/1000",
    alt: "Hang Sửng Sốt",
    caption: "Hang Sửng Sốt — một trong những hang động kỳ vĩ nhất vịnh.",
  },
  {
    url: "https://picsum.photos/seed/halong-3/1600/1000",
    alt: "Du thuyền nghỉ đêm",
    caption: "Du thuyền nghỉ đêm giữa vịnh, ngắm hoàng hôn buông trên biển.",
  },
  {
    url: "https://picsum.photos/seed/halong-4/1600/1000",
    alt: "Làng chài Cửa Vạn",
    caption: "Làng chài Cửa Vạn — nhịp sống bình dị trên mặt nước.",
  },
];

const quickNav = ["Tham quan & trải nghiệm", "Ăn gì", "Lưu trú", "Di chuyển"];

export default function HeroPreviewPage() {
  return (
    <div className="bg-background pb-24">
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/60 to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-28 -top-32 -z-0 size-[30rem] rounded-full border border-primary/10"
        />
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/diem-den" className="hover:text-foreground">
              Điểm đến
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link
              href={`/diem-den/${place.parent.slug}`}
              className="hover:text-foreground"
            >
              {place.parent.name}
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="text-foreground">{place.name}</span>
          </nav>

          {/* Tiêu đề */}
          <div className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MapPin className="size-3.5" aria-hidden />
              Điểm đến · {place.parent.name}
            </span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {place.name}
            </h1>
            <p className="mt-3 text-lg font-medium text-muted-foreground">
              {place.tagline}
            </p>
          </div>

          {/* Hero card-stack */}
          <div className="mt-6">
            <PlaceHeroStack images={images} />
          </div>

          {/* Điều hướng nhanh */}
          <nav className="relative z-10 mx-auto -mt-8 max-w-[calc(100%-2rem)] rounded-2xl border border-border/60 bg-card p-2 shadow-lg shadow-black/5 sm:-mt-10 sm:max-w-3xl">
            <ul className="flex items-center gap-1 overflow-x-auto">
              {quickNav.map((label) => (
                <li key={label} className="shrink-0">
                  <span className="block whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Mẹo: tự lật mỗi 5s · rê chuột vào ảnh để hiện nút next · vuốt ngang để
          đổi · bấm vào ảnh để mở full-screen · nút ⏸ để tạm dừng.
        </p>
      </div>
    </div>
  );
}
