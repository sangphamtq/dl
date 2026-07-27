import Link from "next/link";
import Image from "next/image";
import {
  ArrowUp,
  ChevronDown,
  MapPin,
  MessageCircle,
  Menu,
} from "@/components/icons";

// Thử nghiệm hero kiểu "Quiri": navbar pill nổi tối màu + eyebrow chữ viết tay
// + tiêu đề lớn xanh lá trên ảnh hero + nút tròn nổi. Dùng palette hiện tại.

const NAV = [
  "Giới thiệu",
  "Điểm đến",
  "Trải nghiệm",
  "Lưu trú",
  "Cẩm nang",
  "Cộng đồng",
];

export default function HeroPreviewPage() {
  return (
    <div className="bg-background">
      <section className="relative min-h-[88vh] w-full overflow-hidden">
        {/* Ảnh nền */}
        <Image
          src="https://picsum.photos/seed/quiri-hero/1920/1200"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70"
        />

        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col px-4 pb-16 pt-5 sm:px-6">
          {/* Navbar pill nổi */}
          <nav className="flex items-center gap-4 rounded-full bg-neutral-900/85 px-3 py-2 pl-5 text-white shadow-lg shadow-black/20 ring-1 ring-white/10 backdrop-blur">
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <MapPin className="size-4" aria-hidden />
              </span>
              <span className="text-lg font-bold tracking-tight">Halivivu</span>
            </Link>

            {/* Links (desktop) */}
            <ul className="mx-auto hidden items-center gap-1 lg:flex">
              {NAV.map((item) => (
                <li key={item}>
                  <span className="block cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium uppercase tracking-wide text-white/75 transition-colors hover:bg-white/10 hover:text-white">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {/* Nút phải */}
            <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
              <span className="hidden cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[0.8rem] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex">
                <MessageCircle className="size-4" aria-hidden />
                Liên hệ
              </span>
              <span className="cursor-pointer rounded-full bg-white px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-wide text-neutral-900 transition-colors hover:bg-white/90">
                Đặt ngay
              </span>
              {/* Mobile menu */}
              <span className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/10 text-white lg:hidden">
                <Menu className="size-5" aria-hidden />
              </span>
            </div>
          </nav>

          {/* Nội dung hero */}
          <div className="mt-auto max-w-3xl pt-24">
            <p className="font-[family-name:var(--font-script)] text-3xl text-warm sm:text-4xl">
              Sự kiện
            </p>
            <h1 className="mt-1 text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-6xl">
              Khám phá những hành trình
              <br />
              khó quên tại Việt Nam
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Lễ hội, ẩm thực, thiên nhiên và văn hoá — gợi ý trải nghiệm cho
              từng điểm đến trên khắp mọi miền.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/diem-den"
                className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Khám phá ngay
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Xem cẩm nang
              </Link>
            </div>
          </div>

          {/* Gợi ý cuộn xuống */}
          <div className="mt-10 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
            <ChevronDown className="size-4 animate-bounce" aria-hidden />
            Cuộn xuống
          </div>
        </div>

        {/* Nút tròn nổi bên phải */}
        <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-3 sm:right-6">
          <span className="grid size-12 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/25 transition-transform hover:-translate-y-0.5">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <span className="grid size-12 cursor-pointer place-items-center rounded-full bg-white text-neutral-900 shadow-lg shadow-black/25 transition-transform hover:-translate-y-0.5">
            <ArrowUp className="size-5" aria-hidden />
          </span>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Bản thử hero theo phong cách tham khảo: navbar pill nổi tối màu, eyebrow
          chữ viết tay (cam), tiêu đề lớn xanh lá trên ảnh, nút tròn nổi. Dùng
          token màu hiện tại nên tự khớp theme.
        </p>
      </div>
    </div>
  );
}
