import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";

const FEATURED = [
  {
    slug: "ha-giang",
    name: "Hà Giang",
    kind: "Tỉnh",
    blurb: "Cao nguyên đá, đèo Mã Pí Lèng và những cung đường mây phủ.",
    seed: "ha-giang-vn",
  },
  {
    slug: "ha-long",
    name: "Hạ Long",
    kind: "Điểm đến",
    blurb: "Vịnh di sản với hàng nghìn đảo đá vôi trên mặt nước ngọc bích.",
    seed: "ha-long-bay",
  },
  {
    slug: "hoi-an",
    name: "Hội An",
    kind: "Điểm đến",
    blurb: "Phố cổ đèn lồng, ẩm thực đường phố và những con hẻm vàng nắng.",
    seed: "hoi-an-old-town",
  },
  {
    slug: "sa-pa",
    name: "Sa Pa",
    kind: "Điểm đến",
    blurb: "Ruộng bậc thang, săn mây Fansipan và bản làng vùng cao.",
    seed: "sa-pa-terrace",
  },
];

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="relative h-[460px] w-full sm:h-[540px]">
            <Image
              src="https://picsum.photos/seed/vietnam-hero-landscape/1800/1000"
              alt="Phong cảnh thiên nhiên Việt Nam"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/35" />
            <div className="absolute inset-0">
              <div className="mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-12 text-white sm:px-6 sm:pb-16">
                <p className="text-sm font-medium text-white/80">
                  Xin chào, {user?.name ?? "bạn"} 👋
                </p>
                <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Khám phá Việt Nam theo cách của bạn
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                  Từ tỉnh đến từng điểm đến: ăn gì, chơi gì, ở đâu và đi lại thế
                  nào — tất cả trong một hành trình.
                </p>
                <div className="mt-7">
                  <Link
                    href="/diem-den/ha-giang"
                    className={buttonVariants({ size: "lg" })}
                  >
                    Bắt đầu khám phá
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured destinations */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Điểm đến nổi bật
              </h2>
              <p className="text-muted-foreground">
                Những vùng đất được yêu thích nhất để bắt đầu.
              </p>
            </div>
            <Link
              href="/diem-den/ha-giang"
              className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
            >
              Xem tất cả
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED.map((place) => (
              <Link
                key={place.slug}
                href={`/diem-den/${place.slug}`}
                className="group block overflow-hidden rounded-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={`https://picsum.photos/seed/${place.seed}/800/600`}
                    alt={place.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    {place.kind}
                  </div>
                  <h3 className="font-semibold tracking-tight">{place.name}</h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {place.blurb}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Image
              src="/icon-192.png"
              alt=""
              width={20}
              height={20}
              className="size-5 rounded"
            />
            Hành Trình Việt
          </div>
          <p className="mt-2">Hỗ trợ thông tin du lịch Việt Nam.</p>
        </div>
      </footer>
    </div>
  );
}
