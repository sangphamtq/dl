import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Mail, MapPin } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Giới thiệu",
  description:
    "Halivivu là trang tra cứu du lịch Việt Nam: ăn gì, chơi gì, ở đâu, đi lại thế nào cho từng nơi — cộng danh bạ chỗ ở đã xác minh chính chủ.",
};

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

// Năm mục của một trang điểm đến — đúng năm thứ đang thật sự có trong sản phẩm
// (xem CLAUDE.md), không phải "tính năng" viết cho đẹp. Mô tả nói bằng thứ
// người đọc kiểm chứng được ngay khi bấm vào một điểm đến.
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

// Số ô ảnh hiện theo khổ màn: 3 → 5 → 6. Sáu ô trên màn 390px thì mỗi ô rộng
// ~55px, thành sáu con tem.
// Viết thành ba nhánh RỜI NHAU thay vì chồng `i>=3 && "hidden sm:block"` với
// `i>=5 && "sm:hidden lg:block"`: cách chồng đó đẩy cả `sm:block` lẫn `sm:hidden`
// lên cùng một phần tử, và thứ tự thắng thua giữa hai utility cùng thuộc tính
// là do vị trí trong CSS sinh ra quyết định, không phải thứ tự viết trong class.
// Class viết NGUYÊN CHUỖI, không ghép `sm:${box}`: Tailwind quét mã nguồn theo
// văn bản, tên class dựng lúc chạy thì nó không thấy để sinh CSS.
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
    // Sáu ảnh cho dải mở đầu. Lấy các điểm đến nổi bật nhất — dải này nói
    // "những nơi đang có trong này", nên nó phải là ảnh THẬT của chính dữ liệu,
    // không phải ảnh kho.
    prisma.place.findMany({
      where: { ...pub, kind: "destination" },
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
      take: 6,
      select: { slug: true, name: true, images: cover },
    }),
    // Vài chỗ ở đã xác minh, để chọn ra MỘT cái làm ví dụ sống cho mục "Chỗ ở".
    // Nói suông "chúng tôi xác minh chính chủ" thì ai cũng nói được; chỉ thẳng
    // vào một thẻ thật rồi bấm sang được trang của nó thì khác.
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

  // Số tỉnh THẬT SỰ có điểm đến. Không dùng tổng số tỉnh đã xuất bản (63):
  // phần lớn trong đó chưa có nội dung nào, đếm cả vào là hứa nhiều hơn thứ
  // đang có — chính lỗi mà bản trước của trang này mắc phải.
  const provinceCount = new Set(destParents.map((d) => d.parentId)).size;
  const hasContact = Boolean(settings.contactEmail || settings.facebookUrl);

  // Ví dụ phải KHỚP với điều đoạn văn ngay cạnh nó đang nói. Đoạn đó bảo
  // "khách sạn lớn thì Booking đã lo, khoảng trống nằm ở homestay nhỏ" — mà
  // `findFirst` trả về resort 5 sao thì cả khối tự mâu thuẫn với chính mình.
  // Ưu tiên loại hình nhỏ, hết mới rơi về chỗ đầu danh sách.
  const SMALL_FIRST = ["homestay", "guesthouse", "hostel", "villa"];
  const sampleStay =
    SMALL_FIRST.map((k) =>
      verifiedPool.find((a) => a.category === k),
    ).find(Boolean) ?? verifiedPool[0];

  return (
    <div className="flex flex-1 flex-col">

      <main className="flex-1">
        {/* ── MỞ ĐẦU ────────────────────────────────────────────────────────
            Một câu hỏi thật, rồi câu trả lời. KHÔNG hero căn giữa với nhãn
            eyebrow + hai nút CTA: bản cũ mở bằng "Cả chuyến đi Việt Nam, gọn
            trong một nơi" — một khẩu hiệu đúng với mọi trang du lịch từng tồn
            tại, nên chẳng nói gì về trang này.
            Bốn câu hỏi trong tiêu đề là bốn câu mà cả sản phẩm được dựng quanh
            (xem CLAUDE.md), nên nó vừa là khẩu hiệu vừa là mô tả kỹ thuật. */}
        <section className="bg-gradient-to-b from-accent via-accent/40 to-background">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
            <h1 className="max-w-4xl text-balance font-[family-name:var(--font-display)] text-[clamp(2.25rem,5.6vw,4.25rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
              Ăn gì, chơi gì, ở đâu, đi lại thế nào —{" "}
              <span className="font-semibold text-muted-foreground">
                cho từng nơi một.
              </span>
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

            {/* DẢI ẢNH — ảnh THẬT của chính những điểm đến đang có, không phải
                ảnh minh hoạ mua ngoài. Đặt ngay dưới câu vừa đếm số: đọc "31
                điểm đến" rồi thấy luôn sáu nơi trong số đó, con số thôi hết là
                một con số.
                Ảnh KHÔNG phải link — cả trang này chỉ có đúng một lối đi tiếp
                (nút ở cuối) và một lối phụ ("Xem thử một điểm đến"), thêm sáu
                đích nữa là loãng. Bù lại có dòng ghi tên bên dưới, đúng lối chú
                thích ảnh — cùng quy ước với dải ảnh ở trang Điểm đến. */}
            {strip.length >= 3 && (
              <div className="mt-12 sm:mt-14">
                <div className="flex h-36 gap-2 sm:h-52 sm:gap-3">
                  {strip.map((d, i) => (
                    <div
                      key={d.slug}
                      className={cn(
                        "relative flex-1 overflow-hidden rounded-xl bg-muted sm:rounded-2xl",
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
                        className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 sm:rounded-2xl"
                      />
                    </div>
                  ))}
                </div>
                {/* Chú thích phải ẨN THEO ĐÚNG những ô đang bị ẩn. Ghép thẳng
                    `strip.map(...).join(" · ")` thì ở màn 390px chỉ thấy ba
                    tấm mà dưới lại đề tên sáu nơi — một dòng chú thích sai. Dấu
                    `·` nằm TRONG span của tên phía sau nó nên ẩn tên là ẩn luôn
                    dấu ngăn, không để lại dấu chấm mồ côi. */}
                <p className="mt-3 text-xs text-muted-foreground">
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

        {/* ── MỘT TRANG ĐIỂM ĐẾN CÓ GÌ ──────────────────────────────────────
            Bản cũ là 6 thẻ bo góc, mỗi thẻ một icon trong ô vuông `bg-primary/10`
            — khuôn "feature grid" mà mọi trang landing đều dùng, và đọc xong
            vẫn không biết bấm vào một điểm đến thì thấy gì.
            Ở đây là đúng NĂM mục thật của một trang điểm đến, đánh số, không
            icon, không thẻ. Tiêu đề đứng cột trái và dính lại khi cuộn (từ lg)
            nên mắt luôn biết đang đọc phần nào. */}
        <Section title="Một trang điểm đến có gì">
          <ol className="space-y-9">
            {PARTS.map((p, i) => (
              <li key={p.label} className="flex gap-5 sm:gap-7">
                <span
                  aria-hidden
                  className="shrink-0 pt-1 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-warm"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
                    {p.label}
                  </h3>
                  <p className="mt-1.5 max-w-xl leading-relaxed text-muted-foreground">
                    {p.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <Link
            href="/diem-den"
            className="group mt-10 inline-flex items-center gap-2 font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
          >
            Xem thử một điểm đến
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </Section>

        {/* ── CHỖ Ở ─────────────────────────────────────────────────────────
            Phần khác biệt thật sự của dự án, nên nó được một dải nền riêng chứ
            không phải một ô trong lưới sáu thẻ như bản cũ. Nội dung lấy đúng
            định vị đã chốt trong CLAUDE.md — kể cả chỗ nói rõ mình KHÔNG làm gì,
            vì đó mới là thứ khiến lời hứa còn lại đáng tin. */}
        <section className="bg-accent/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="size-4" aria-hidden />
                  Đã xác minh chính chủ
                </span>
                <h2 className="mt-4 max-w-md text-balance font-[family-name:var(--font-display)] text-[clamp(1.6rem,3.2vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em]">
                  Chỗ ở là phần chúng tôi làm khác
                </h2>

                {/* VÍ DỤ SỐNG, lấy thẳng từ dữ liệu. "Chúng tôi xác minh chính
                    chủ" là câu ai cũng viết được; một cái thẻ thật, có ảnh thật,
                    bấm sang được trang thật thì không giả được.
                    Đây là chỗ DUY NHẤT trên trang có thẻ — và nó cố ý dùng đúng
                    khuôn thẻ của mục Lưu trú (ảnh 4/3 lồng trong thẻ, huy hiệu
                    trên ảnh, nhãn loại hình màu cam) để người đọc gặp lại đúng
                    hình dạng đó khi bấm vào mục thật. */}
                {sampleStay && (
                  <figure className="mt-8 max-w-sm">
                    <Link
                      href={`/luu-tru/${sampleStay.slug}`}
                      className="group flex flex-col rounded-[1.5rem] border border-border/60 bg-card p-2 transition-all duration-200 hover:border-transparent hover:shadow-lg hover:shadow-black/5"
                    >
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-[1.05rem] bg-muted">
                        <Image
                          src={coverUrl(sampleStay.images, sampleStay.slug, 640, 480)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 24rem, 100vw"
                          className="object-cover"
                        />
                        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/35 py-1 pl-1.5 pr-2.5 text-[0.7rem] font-semibold text-white backdrop-blur-md">
                          <BadgeCheck className="size-4 shrink-0" aria-hidden />
                          Đã xác minh
                        </span>
                      </span>
                      <span className="flex flex-col px-1.5 pb-1 pt-3">
                        {sampleStay.category && (
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-warm">
                            {label(
                              ACCOMMODATION_CATEGORY_LABELS,
                              sampleStay.category,
                            )}
                          </span>
                        )}
                        <span className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
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
                    <figcaption className="mt-3 text-xs text-muted-foreground">
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
        <Section title="Những gì trang này không làm">
          <ul className="space-y-6">
            {NOT_DOING.map((t) => (
              <li key={t} className="flex gap-4">
                {/* Một gạch ngang thay cho icon dấu ✕: đây là ranh giới phạm vi,
                    không phải lỗi hay điều cấm. */}
                <span
                  aria-hidden
                  className="mt-3.5 h-px w-5 shrink-0 bg-border"
                />
                <p className="max-w-2xl leading-relaxed text-muted-foreground">
                  {t}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Cẩm nang là phần phụ nên nó là một dòng thêm vào, không phải một
            section ngang hàng. Vẫn dùng lại đúng lưới hai cột của các section
            trên (cột trái để trống) để dòng này thẳng hàng với mọi khối chữ
            khác — lệch ra là đọc ra ngay như một mẩu vá. */}
        {posts > 0 && (
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <div aria-hidden className="hidden lg:block" />
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

        {/* ── LIÊN HỆ + LỐI RA ──────────────────────────────────────────────
            Bản cũ kết bằng một panel xanh lá bo góc lớn, có hai vòng tròn trang
            trí và hai nút — trong đó một nút dẫn tới mục Cộng đồng hiện đang
            tạm ẩn khỏi mọi lối vào khác. Đóng lại bằng con linh vật của chính
            dự án và đúng một lối đi tiếp thì thật hơn nhiều. */}
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
              {/* Lời mời báo sai sót CHỈ hiện khi thật sự có kênh nhận. Nếu
                  chưa cấu hình email/Facebook trong CMS mà vẫn viết "nhắn cho
                  chúng tôi một câu" thì đó là một lời hứa dẫn vào ngõ cụt —
                  đúng loại chữ mà cả trang này đang cố tránh. Không có kênh nào
                  thì đóng lại bằng một câu tự nó đứng được. */}
              <h2 className="mt-5 max-w-md text-balance font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.035em]">
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

            {/* MỘT lối đi tiếp, và nó dẫn tới đúng thứ cả trang vừa nói về. */}
            <Link
              href="/diem-den"
              className="group inline-flex shrink-0 items-center gap-3 self-start rounded-lg bg-primary px-7 py-4 font-[family-name:var(--font-display)] text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:self-auto"
            >
              Chọn một điểm đến
              <ArrowRight
                className="size-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </section>

      </main>

    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

// Khuôn section: tiêu đề cột trái (DÍNH lại khi cuộn từ lg), nội dung cột phải.
// Bố cục hai cột lệch này thay cho kiểu "tiêu đề căn giữa + đoạn dẫn căn giữa +
// lưới thẻ" của bản cũ — kiểu đó khiến mọi section trông giống hệt nhau và mắt
// phải quay về giữa trang sau mỗi khối.
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.6rem,3.2vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em] lg:sticky lg:top-24 lg:self-start">
          {title}
        </h2>
        <div>{children}</div>
      </div>
    </section>
  );
}

// Con số trong câu văn: đậm hơn một bậc và về màu chữ chính — đủ để mắt bắt
// được mà vẫn nằm trong dòng, thay cho dải "số liệu" bốn cột có vạch ngăn.
function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}
