import Link from "next/link";
import {
  Compass,
  Map,
  ShieldCheck,
  BookOpen,
  Users,
  Route,
  Wallet,
  BadgeCheck,
  Sparkles,
  MapPin,
  ArrowRight,
  Search,
  MapPinCheck,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata = {
  title: "Giới thiệu",
  description:
    "Halivivu giúp bạn tra cứu ăn gì, chơi gì, ở đâu, đi lại thế nào cho từng điểm đến Việt Nam — thông tin gom gọn, chỗ ở xác minh chính chủ, hoàn toàn miễn phí.",
};

const pub = { status: "published" as const };

type IconType = typeof Compass;

const FEATURES: {
  icon: IconType;
  title: string;
  desc: string;
}[] = [
  {
    icon: Compass,
    title: "Khám phá theo điểm đến",
    desc: "Duyệt theo tỉnh → điểm đến lớn. Mọi thông tin của một nơi gom về đúng chỗ, không phải lục tung nhiều nguồn.",
  },
  {
    icon: Map,
    title: "Ăn, chơi, ở, đi lại",
    desc: "Mỗi điểm đến có sẵn địa điểm tham quan, trải nghiệm, đặc sản, quán ăn, lưu trú và cách di chuyển.",
  },
  {
    icon: ShieldCheck,
    title: "Lưu trú xác minh chính chủ",
    desc: "Danh bạ chỗ ở đã kiểm chứng, kênh liên hệ đúng người, kèm cảnh báo giúp bạn tránh lừa cọc.",
  },
  {
    icon: BookOpen,
    title: "Cẩm nang kinh nghiệm",
    desc: "Bài viết hướng dẫn, gợi ý lịch trình, mẹo thực tế do ban biên tập chọn lọc.",
  },
  {
    icon: Users,
    title: "Cộng đồng",
    desc: "Hỏi đáp, chia sẻ và đọc đánh giá thật từ những người đã thực sự đến nơi.",
  },
  {
    icon: Route,
    title: "Lịch trình của bạn",
    desc: "Đánh dấu nơi đã đến, lưu điểm đến yêu thích và dựng lịch trình cho riêng mình.",
  },
];

const STEPS: { title: string; desc: string }[] = [
  {
    title: "Chọn điểm đến",
    desc: "Tìm tỉnh hoặc điểm đến bạn quan tâm — từ Hà Giang tới Phú Quốc.",
  },
  {
    title: "Xem mọi thông tin",
    desc: "Ăn gì, chơi gì, ở đâu, đi lại thế nào — đã được gom sẵn cho nơi đó.",
  },
  {
    title: "Lên đường",
    desc: "Liên hệ đúng người, chốt chỗ ở an toàn và tự tin xuất phát.",
  },
];

const TRUST: { icon: IconType; title: string; desc: string }[] = [
  {
    icon: Wallet,
    title: "100% miễn phí",
    desc: "Không thu phí người dùng, không tường phí.",
  },
  {
    icon: BadgeCheck,
    title: "Không quảng cáo trá hình",
    desc: "Nội dung do ban biên tập chọn lọc, không đội lốt bài PR.",
  },
  {
    icon: ShieldCheck,
    title: "Chống lừa cọc",
    desc: "Chỗ ở xác minh chính chủ kèm cảnh báo an toàn.",
  },
  {
    icon: Sparkles,
    title: "Cập nhật liên tục",
    desc: "Dữ liệu được kiểm duyệt và bổ sung thường xuyên.",
  },
];

export default async function GioiThieuPage() {
  const [settings, provinces, destinations, spots, posts] = await Promise.all([
    getSettings(),
    prisma.place.count({ where: { ...pub, kind: "province" } }),
    prisma.place.count({ where: { ...pub, kind: "destination" } }),
    prisma.spot.count({ where: pub }),
    prisma.post.count({ where: pub }),
  ]);

  const stats = [
    { value: provinces, label: "Tỉnh / Thành phố" },
    { value: destinations, label: "Điểm đến lớn" },
    { value: spots, label: "Địa điểm tham quan" },
    { value: posts, label: "Bài cẩm nang" },
  ].filter((s) => s.value > 0);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ─── HERO ─────────────────────────────────────────── */}
        <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <p className="flex items-center justify-center gap-2 font-rounded text-2xl font-medium text-primary">
              <MapPin className="size-5" aria-hidden />
              Về {settings.siteName}
            </p>
            <h1 className="mt-2 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Cả chuyến đi Việt Nam, gọn trong một nơi
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {settings.siteName} tổng hợp và kiểm chứng thông tin du lịch cho
              từng điểm đến — bạn chỉ việc chọn nơi muốn đến, mọi thứ cần biết đã
              nằm sẵn ở đó.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/diem-den"
                className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
              >
                Khám phá điểm đến
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/blog"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full",
                )}
              >
                Xem cẩm nang
              </Link>
            </div>
          </div>
        </section>

        {/* ─── SỐ LIỆU ──────────────────────────────────────── */}
        {stats.length > 0 && (
          <section className="border-b border-border/60">
            <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-y divide-border/60 px-4 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:px-6">
              {stats.map((s) => (
                <div key={s.label} className="px-4 py-8 text-center">
                  <dd className="text-3xl font-extrabold tracking-tight text-primary tabular-nums sm:text-4xl">
                    {s.value.toLocaleString("vi-VN")}
                  </dd>
                  <dt className="mt-1 text-sm text-muted-foreground">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ─── TÍNH NĂNG ────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionTitle
            eyebrow="Có gì trong này"
            title="Tất cả cho một chuyến đi"
            desc="Thay vì mở cả chục tab và group Facebook, bạn có một nơi duy nhất — sạch, đáng tin, đủ để lên đường."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm shadow-black/5 transition-shadow hover:shadow-lg hover:shadow-black/10"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <f.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CÁCH HOẠT ĐỘNG ──────────────────────────────── */}
        <section className="bg-accent/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionTitle eyebrow="Đơn giản thôi" title="Cách hoạt động" />
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="relative">
                  <span className="font-script text-5xl font-bold text-primary/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-bold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── VÌ SAO TIN CẬY ──────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="flex items-center gap-2 font-rounded text-2xl font-medium text-primary">
                <ShieldCheck className="size-5" aria-hidden />
                Đáng tin
              </p>
              <h2 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Không phải sàn đặt phòng, không chạy theo hoa hồng
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Giá trị của chúng tôi là sự tin cậy có cấu trúc: đúng thông tin,
                đúng kênh liên hệ, và những cảnh báo giúp bạn tránh rủi ro thường
                gặp khi đi du lịch.
              </p>
              <Link
                href="/kiem-tra"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                Tìm hiểu về kiểm tra uy tín
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {TRUST.map((t) => (
                <div
                  key={t.title}
                  className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{t.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {t.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-primary-foreground/15"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -left-16 size-96 rounded-full border border-primary-foreground/10"
            />
            <div className="relative mx-auto max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Sẵn sàng cho chuyến đi tiếp theo?
              </h2>
              <p className="mt-3 text-primary-foreground/85">
                Chọn một điểm đến và để chúng tôi lo phần còn lại.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/diem-den"
                  className="inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
                >
                  <Search className="size-4" aria-hidden />
                  Khám phá điểm đến
                </Link>
                <Link
                  href="/cong-dong"
                  className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  <MapPinCheck className="size-4" aria-hidden />
                  Ghé cộng đồng
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="flex items-center justify-center gap-2 font-rounded text-2xl font-medium text-primary">
        <Sparkles className="size-4" aria-hidden />
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {desc && (
        <p className="mt-3 leading-relaxed text-muted-foreground">{desc}</p>
      )}
    </div>
  );
}
