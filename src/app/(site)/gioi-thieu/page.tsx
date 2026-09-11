import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Mail, MapPin } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD } from "@/lib/radius";

export const metadata = {
  title: "Giới thiệu",
  description:
    "Halivivu là trang tra cứu du lịch Việt Nam: ăn gì, chơi gì, ở đâu, đi lại thế nào cho từng nơi — cộng danh bạ chỗ ở đã xác minh chính chủ.",
};

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

const PARTS: { label: string; desc: string }[] = [
  {
    label: "Địa điểm",
    desc: "Những chỗ đáng ghé ở nơi đó, kèm giờ mở cửa, vé vào và mùa đẹp nhất.",
  },
  {
    label: "Trải nghiệm",
    desc: "Việc nên làm — chèo kayak, săn mây, leo núi ngắm toàn cảnh — kèm đơn vị tổ chức và giá nếu có.",
  },
  {
    label: "Ăn uống",
    desc: "Quán ăn và quán cà phê, lọc theo bữa và theo hướng nhìn. Quán nào có ảnh thực đơn thì xem được ngay tại chỗ.",
  },
  {
    label: "Nơi lưu trú",
    desc: "Danh bạ chỗ ở kèm kênh liên hệ đã đối chiếu với chủ nhà.",
  },
  {
    label: "Di chuyển",
    desc: "Cách đến nơi từ các thành phố lớn, và cách đi lại khi đã tới.",
  },
];

function stripShow(i: number, box: "block" | "inline"): string {
  if (i < 3) return "";
  if (i < 5) return box === "block" ? "hidden sm:block" : "hidden sm:inline";
  return box === "block" ? "hidden lg:block" : "hidden lg:inline";
}

const NOT_DOING: string[] = [
  "Không đặt phòng, không thanh toán, không giữ cọc hộ. Bạn chốt thẳng với chủ nhà.",
  "Không lưu số tài khoản của bất kỳ ai — số tài khoản đổi thì dữ liệu cũ thành sai, mà một thông tin chuyển tiền sai thì hại hơn là không có.",
  "Không thu phí người đọc, và không nhận bài PR đội lốt bài viết.",
];

export default async function GioiThieuPage() {
  const [
    settings,
    destinations,
    destParents,
    strip,
    verifiedPool,
    spots,
    eateries,
    stays,
    verifiedStays,
    posts,
  ] = await Promise.all([
    getSettings(),
    prisma.place.count({ where: { ...pub, kind: "destination" } }),
    prisma.place.findMany({
      where: { ...pub, kind: "destination" },
      select: { parentId: true },
    }),
    prisma.place.findMany({
      where: { ...pub, kind: "destination" },
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
      take: 6,
      select: { slug: true, name: true, images: cover },
    }),
    prisma.accommodation.findMany({
      where: { ...pub, isVerified: true },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
      take: 12,
      select: {
        slug: true,
        name: true,
        category: true,
        images: cover,
        place: { select: { name: true } },
      },
    }),
    prisma.spot.count({ where: pub }),
    prisma.eatery.count({ where: pub }),
    prisma.accommodation.count({ where: pub }),
    prisma.accommodation.count({ where: { ...pub, isVerified: true } }),
    prisma.post.count({ where: pub }),
  ]);

  const provinceCount = new Set(destParents.map((d) => d.parentId)).size;
  const hasContact = Boolean(settings.contactEmail || settings.facebookUrl);

  const SMALL_FIRST = ["homestay", "guesthouse", "hostel", "villa"];
  const sampleStay =
    SMALL_FIRST.map((k) =>
      verifiedPool.find((a) => a.category === k),
    ).find(Boolean) ?? verifiedPool[0];

  return (
    <div className="flex flex-1 flex-col">

      <main className="flex-1">
        <section className="bg-gradient-to-b from-accent via-accent/40 to-background">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
            {/* Serif nhưng KHÔNG in hoa. Tiêu đề ở `/diem-den` là một tên
                riêng ngắn ("VIỆT NAM") nên in hoa giãn chữ hợp; đây là một CÂU
                bốn vế — in hoa cỡ 4rem thì thành khẩu hiệu quảng cáo và đọc
                chậm hẳn. Giữ đúng giọng serif, bỏ phần hét. */}
            <h1 className="max-w-4xl text-balance font-[family-name:var(--font-display)] text-[clamp(2.25rem,5.6vw,4rem)] font-normal leading-[1.12] tracking-[-0.01em]">
              Ăn gì, chơi gì, ở đâu, đi lại thế nào —{" "}
              <span className="text-muted-foreground">cho từng nơi một.</span>
            </h1>

            <div className="mt-8 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                {settings.siteName} là một trang tra cứu du lịch Việt Nam. Không
                phải sàn đặt phòng, cũng không phải blog cá nhân: mỗi tỉnh và mỗi
                điểm đến lớn có một trang riêng, gom sẵn bốn câu hỏi trên.
              </p>
              <p>
                Hiện có <Num>{destinations}</Num> điểm đến ở{" "}
                <Num>{provinceCount}</Num> tỉnh thành, với <Num>{spots}</Num>{" "}
                địa điểm, <Num>{eateries}</Num> quán ăn và quán nước,{" "}
                <Num>{stays}</Num> chỗ ở
                {verifiedStays > 0 && (
                  <>
                    {" "}
                    (trong đó <Num>{verifiedStays}</Num> đã xác minh chính chủ)
                  </>
                )}
                . Danh sách còn ngắn, và chúng tôi thà để nó ngắn còn hơn nhồi
                cho đầy bằng nội dung chép lại.
              </p>
            </div>

            {strip.length >= 3 && (
              <div className="mt-12 sm:mt-14">
                <div className="flex h-36 gap-2 sm:h-52 sm:gap-3">
                  {strip.map((d, i) => (
                    <div
                      key={d.slug}
                      className={cn(
                        "relative flex-1 overflow-hidden bg-muted",
                        stripShow(i, "block"),
                      )}
                    >
                      <Image
                        src={coverUrl(d.images, d.slug, 480, 640)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 640px) 20vw, 33vw"
                        className="object-cover"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10"
                      />
                    </div>
                  ))}
                </div>
                <p className={cn(MICRO, "mt-3 text-muted-foreground")}>
                  Ảnh:{" "}
                  {strip.map((d, i) => (
                    <span key={d.slug} className={cn(stripShow(i, "inline"))}>
                      {i > 0 && <span aria-hidden> · </span>}
                      {d.name}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <span aria-hidden className="mb-5 block h-[3px] w-10 bg-warm" />
          <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
            Một trang điểm đến có gì
          </h2>

          <ol className="mt-10 grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-5">
            {PARTS.map((p, i) => (
              <li key={p.label}>
                <span
                  aria-hidden
                  className="block font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tabular-nums text-warm-ink"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {p.label}
                </h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </li>
            ))}
          </ol>

          <Link
            href="/diem-den"
            className={cn(
              MICRO,
              "group mt-12 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            Xem thử một điểm đến
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>

        {/* ── CHỖ Ở ─────────────────────────────────────────────────────────
            Phần khác biệt thật sự của dự án, nên nó được một dải nền riêng chứ
            không phải một ô trong lưới sáu thẻ như bản cũ. Nội dung lấy đúng
            định vị đã chốt trong CLAUDE.md — kể cả chỗ nói rõ mình KHÔNG làm gì,
            vì đó mới là thứ khiến lời hứa còn lại đáng tin. */}
        <section className="bg-accent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <div>
                <span
                  className={cn(
                    MICRO,
                    "inline-flex items-center gap-2 border border-border bg-background px-3 py-1.5 text-primary-ink",
                  )}
                >
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Đã xác minh chính chủ
                </span>
                <h2 className="mt-4 max-w-md text-balance font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                  Chỗ ở là phần chúng tôi làm khác
                </h2>

                {sampleStay && (
                  <figure className="mt-8 max-w-sm">
                    <Link
                      href={`/luu-tru/${sampleStay.slug}`}
                      className={cn(R_CARD, "group flex flex-col border border-border bg-card p-2 transition-colors duration-200 hover:border-foreground")}
                    >
                      <span className={cn(R_BADGE, "relative block aspect-[4/3] overflow-hidden bg-muted")}>
                        <Image
                          src={coverUrl(sampleStay.images, sampleStay.slug, 640, 480)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 24rem, 100vw"
                          className="object-cover"
                        />
                        <span
                          className={cn(
                            MICRO,
                            "absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 bg-white/95 py-1 pl-2 pr-2.5 text-neutral-900 shadow-sm backdrop-blur-sm",
                          )}
                        >
                          <BadgeCheck className="size-3 shrink-0 text-[#26701a]" aria-hidden />
                          Đã xác minh
                        </span>
                      </span>
                      <span className="flex flex-col px-1.5 pb-1 pt-3">
                        {sampleStay.category && (
                          <span className={cn(MICRO, "text-warm-ink")}>
                            {label(
                              ACCOMMODATION_CATEGORY_LABELS,
                              sampleStay.category,
                            )}
                          </span>
                        )}
                        <span className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
                          {sampleStay.name}
                        </span>
                        {sampleStay.place?.name && (
                          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" aria-hidden />
                            {sampleStay.place.name}
                          </span>
                        )}
                      </span>
                    </Link>
                    <figcaption className={cn(MICRO, "mt-3 text-muted-foreground")}>
                      Một chỗ ở thật trên {settings.siteName} — bấm vào xem trang
                      đầy đủ.
                    </figcaption>
                  </figure>
                )}
              </div>

              <div className="max-w-2xl space-y-5 leading-relaxed text-muted-foreground">
                <p>
                  Khách sạn lớn thì Booking hay Agoda đã lo. Khoảng trống thật
                  nằm ở homestay nhỏ — nơi khách phải nhắn Zalo cho một người lạ
                  rồi chuyển cọc, và cũng là nơi page nhái sống được.
                </p>
                <p>
                  Huy hiệu <strong className="text-foreground">đã xác minh</strong>{" "}
                  nghĩa là kênh liên hệ trên trang đã được đối chiếu với chủ nhà.
                  Chỗ chưa xác minh vẫn hiện, nhưng nằm ở một nhóm riêng và nói
                  rõ là chưa — trộn chung rồi phân biệt bằng một cái nhãn nhỏ thì
                  người lướt không thấy sự khác nhau, mà sự khác nhau đó chính là
                  thứ chúng tôi làm.
                </p>
                <p>
                  Mỗi chỗ ở có một địa chỉ web cố định để chủ nhà gửi cho khách.
                  Đó là cách rẻ nhất để khách kiểm tra mình đang nhắn đúng người.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── KHÔNG LÀM ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <span aria-hidden className="mb-5 block h-[3px] w-10 bg-warm" />
          <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
            Những gì trang này không làm
          </h2>
          <ul className="mt-8 grid gap-x-12 gap-y-5 sm:grid-cols-2">
            {NOT_DOING.map((t) => (
              <li key={t} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-3.5 h-px w-5 shrink-0 bg-warm"
                />
                <p className="leading-relaxed text-muted-foreground">{t}</p>
              </li>
            ))}
          </ul>
        </section>

        {posts > 0 && (
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
            <div>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                Ngoài các trang điểm đến còn <Num>{posts}</Num> bài trong{" "}
                <Link
                  href="/blog"
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  Cẩm nang
                </Link>{" "}
                — những thứ dài hơn một dòng mô tả: kinh nghiệm chặng đường, gợi
                ý lịch trình, mẹo mùa vụ.
              </p>
            </div>
          </section>
        )}

        <section className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Image
                src="/logo_mark.png"
                alt=""
                width={62}
                height={72}
                className="h-14 w-auto"
              />
              <h2 className="mt-5 max-w-md text-balance font-[family-name:var(--font-display)] text-[clamp(1.25rem,2.6vw,1.875rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                {hasContact
                  ? "Thấy chỗ nào sai, thiếu, hoặc đã đóng cửa?"
                  : "Danh sách dài thêm sau mỗi chuyến đi"}
              </h2>
              <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
                {hasContact
                  ? "Thông tin thực địa hỏng nhanh hơn ta tưởng. Nhắn cho chúng tôi một câu là đủ."
                  : "Giờ mở cửa đổi, quán đóng, đường sửa — thông tin thực địa hỏng nhanh hơn ta tưởng, nên chỗ nào đã đăng đều được ngó lại chứ không để đó."}
              </p>
              {hasContact && (
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {settings.contactEmail && (
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="inline-flex items-center gap-2 font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                    >
                      <Mail className="size-4" aria-hidden />
                      {settings.contactEmail}
                    </a>
                  )}
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/diem-den"
              className={cn(
                MICRO,
                "group inline-flex h-12 shrink-0 items-center gap-3 self-start bg-primary px-7 text-primary-foreground transition-opacity hover:opacity-90 lg:self-auto",
              )}
            >
              Chọn một điểm đến
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </section>

      </main>

    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}
