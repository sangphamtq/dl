import Link from "next/link";
import { ChevronDown, ChevronLeft, Star } from "@/components/icons";
import { PlaceHeroCanvas } from "@/components/site/place-hero-canvas";
import type { HeroImage } from "@/components/site/place-hero-stack";
import { ShareButton } from "@/components/site/share-button";
import { CheckInButton } from "@/components/site/check-in-button";
import { CheckInFaces, type CheckInPerson } from "@/components/site/check-in-faces";
import type { PlaceStat } from "@/lib/place-meta";

type PlaceHeroData = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  tagline: string | null;
  provinceName: string | null;
  isFeatured: boolean;
  parent: { slug: string; name: string } | null;
};

// Cỡ chữ "micro" của hero: nhãn dải số liệu và nhãn nút back dùng chung một
// khuôn, nhờ vậy nút back đọc ra là chi tiết của hero chứ không phải nút lạ.
//
// Giãn ký tự vừa phải (0.1em) chứ không rộng như trước (0.16em): chữ Việt viết
// HOA còn phải cõng dấu, giãn quá thì mắt phải ghép lại từng chữ cái. Cỡ cũng
// nhích lên một nấc — 0.68rem ở chữ hoa là dưới ngưỡng đọc lướt.
const MICRO = "text-[0.72rem] font-medium uppercase tracking-[0.1em]";
const DT = `${MICRO} text-white/75`;

// Viên tròn hairline dùng cho MỌI nút ở thanh trên (back · đã đến · chia sẻ):
// một hình dáng duy nhất, phân biệt nhau bằng icon chứ không bằng kiểu nút.
const CIRCLE =
  "grid size-9 shrink-0 place-items-center rounded-full border border-white/25 transition-colors hover:border-white/60";

// Ô số liệu: vạch DỌC mảnh ngăn cách (thay hairline ngang của bản canh trái).
// Mobile bỏ vạch — các ô xuống dòng thì vạch đầu dòng sẽ thành lạc lõng.
const ITEM =
  "px-6 text-center sm:border-l sm:border-white/25 sm:px-8 sm:first:border-l-0";

// Hero full-bleed CANH GIỮA — cùng khung ảnh với bản editorial, khác cách xếp.
// Bố cục đối xứng cần vài thứ khác hẳn bản canh trái:
// - tên đặt giữa khung ảnh, cỡ lớn hơn, giãn ký tự âm sâu hơn (chữ càng to càng
//   phải siết) và có gạch nối mảnh phía trên làm trục đối xứng cho eyebrow;
// - dải số liệu KHÔNG dùng hairline ngang (nó kéo mắt sang hai bên, phá thế
//   giữa) mà tách các ô bằng vạch dọc mảnh, cả cụm co lại quanh tâm;
// - mọi thứ giới hạn bề rộng đọc (`max-w-*` + `mx-auto`) để dòng không dài quá.
export function PlaceHeroCenter({
  place,
  heroImages,
  stats,
  back,
  checkIn,
  visitors,
  reviews,
}: {
  place: PlaceHeroData;
  heroImages: HeroImage[];
  stats: PlaceStat[];
  back?: { href: string; label: string };
  checkIn?: { checked: boolean; isAuthed: boolean };
  visitors?: { total: number; people: CheckInPerson[] };
  reviews?: { stars: number; total: number };
}) {
  const hasMeta =
    stats.length > 0 ||
    (visitors && visitors.total > 0) ||
    (reviews && reviews.total > 0);

  return (
    <PlaceHeroCanvas
      images={heroImages}
      topBar={
        <div className="flex items-center justify-between gap-4">
          {back ? (
            <Link
              href={back.href}
              className="group inline-flex items-center gap-2.5 text-white/65 transition-colors hover:text-white"
            >
              {/* Icon trong vòng tròn hairline — cùng chất liệu 1px với vạch
                  eyebrow và vạch ngăn ô số liệu. Vòng tròn cho tap target 36px
                  mà không cần nền đặc. */}
              <span className={`${CIRCLE} group-hover:border-white/60`}>
                <ChevronLeft
                  className="size-[1.15rem] transition-transform group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className={`${MICRO} hidden sm:inline`}>{back.label}</span>
            </Link>
          ) : (
            <span />
          )}
          {/* Phải: hành động chính là PILL CÓ NHÃN (icon ghim một mình không ai
              đoán ra là "đánh dấu đã đến"), cạnh nó là tiện ích chia sẻ dạng
              viên tròn. Cùng chất liệu hairline như nút back — cố ý KHÔNG dùng
              nền kính: hero này chỉ có đường 1px và chữ, thêm một khối đặc/mờ ở
              góc là nó hút mắt hơn cả tên điểm đến. */}
          <div className="flex items-center gap-2">
            {checkIn && (
              <CheckInButton
                targetKind="place"
                targetId={place.id}
                targetName={place.name}
                targetImage={heroImages[0]?.url ?? null}
                redirectTo={`/diem-den/${place.slug}`}
                initialChecked={checkIn.checked}
                isAuthed={checkIn.isAuthed}
                reviewable={place.kind === "destination"}
                tone="onDark"
                className="h-9 gap-2 rounded-full border border-white/30 px-4 hover:border-white/70"
              />
            )}
            <ShareButton
              title={place.name}
              iconOnly
              className={`${CIRCLE} text-white/65 hover:bg-transparent hover:text-white`}
            />
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-3xl text-center">
        {/* Eyebrow nằm giữa hai vạch ngắn — trục đối xứng cho cả khối */}
        <div className="flex items-center justify-center gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-bright/50 sm:w-12" />
          {place.parent ? (
            <Link
              href={`/diem-den/${place.parent.slug}`}
              className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-warm-bright drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-80 sm:text-2xl"
            >
              {place.parent.name}
            </Link>
          ) : (
            <span className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-warm-bright drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-2xl">
              {place.kind === "province" ? "Tỉnh · Thành phố" : "Điểm đến"}
            </span>
          )}
          <span aria-hidden className="h-px w-8 bg-warm-bright/50 sm:w-12" />
        </div>

        {/* Chữ tô bằng gradient rồi cắt theo hình chữ (bg-clip-text): trắng đặc
            ở phần trên, nhạt dần về đáy — nét chữ như chìm vào ảnh.
            Hai số điều khiển độ mờ: `from-35%` = mốc bắt đầu nhạt (càng nhỏ càng
            mờ sớm), `to-white/30` = độ đậm còn lại ở đáy (càng nhỏ càng tan).
            Mức này là thoả hiệp: quanh đường baseline còn ~54% trắng (đọc thoải
            mái kể cả trên ảnh nền sáng), chân chữ ~30%. Đẩy xuống 25%/15% thì
            hiệu ứng mạnh hơn nhưng bắt đầu khó đọc.
            font-extrabold (800): Be Vietnam Pro ở 700 hơi nhẹ so với cỡ chữ này,
            mà nét càng dày thì dải chuyển sắc càng lộ. Sans hình học nên siết
            tracking sâu hơn serif; không đặt font-variation-settings vì đây là
            font tĩnh, không có trục nào. */}
        <h1 className="mt-4 text-balance bg-gradient-to-b from-white from-35% to-white/30 bg-clip-text font-[family-name:var(--font-display)] text-[clamp(3.25rem,10vw,8.5rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-transparent">
          {place.name}
        </h1>

        {/* Tagline dựng như "deck" của bài tạp chí, không phải câu phụ đề nhỏ:
            - một gạch mảnh bắc cầu từ tiêu đề xuống (bracket trên), đủ để khối
              chữ có cấu trúc mà không thêm hộp hay icon;
            - cỡ co giãn 18→26px, sáng hơn (white/85) và `leading-snug` vì chữ
              càng lớn thì giãn dòng phải càng chặt (KHÔNG dùng font-light: Cabin
              nạp dạng variable dải 400–700, đặt 300 chỉ bị kẹp về 400);
            - `max-w-2xl` + `text-balance` để câu ngắt thành các dòng cân nhau,
              tránh dòng cuối trơ một hai chữ. */}
        {place.tagline && (
          <>
            <span
              aria-hidden
              className="mx-auto mt-5 block h-px w-10 bg-white/30 sm:mt-7"
            />
            <p className="mx-auto mt-4 max-w-2xl text-balance sm:mt-6 text-[clamp(1.125rem,2.4vw,1.65rem)] leading-snug text-white/85">
              {place.tagline}
            </p>
          </>
        )}


        {/* Bóng chữ mềm cho CẢ cụm meta. Tên điểm đến cỡ lớn thì scrim là đủ,
            nhưng chữ micro ở đây rơi vào quãng scrim mỏng nhất và vắt qua đủ
            loại ảnh — gặp mảng trời sáng là mất hút. Bóng toả rộng, không lệch
            (0 0 12px) nên không thành viền nổi, chỉ tách chữ khỏi nền. */}
        {hasMeta && (
          <dl className="mx-auto mt-7 flex flex-wrap items-start justify-center gap-y-5 [text-shadow:0_0_12px_rgba(0,0,0,0.55)] sm:mt-10 sm:gap-y-6">
            {stats.map((s) => (
              <div key={s.label} className={ITEM}>
                <dt className={DT}>{s.label}</dt>
                <dd className="mt-1.5 flex h-8 items-center justify-center text-xl font-semibold tabular-nums text-white">
                  {s.value.toLocaleString("vi-VN")}
                </dd>
              </div>
            ))}

            {reviews && reviews.total > 0 && (
              <div className={ITEM}>
                <dt className={DT}>Đánh giá</dt>
                <dd className="mt-1.5 flex h-8 items-center justify-center">
                  <Link
                    href={`/diem-den/${place.slug}#danh-gia`}
                    scroll
                    className="group inline-flex items-baseline gap-1.5 text-xl font-semibold text-white"
                  >
                    <Star
                      className="size-4 shrink-0 translate-y-0.5 fill-warm-bright text-warm-bright"
                      aria-hidden
                    />
                    <span className="tabular-nums">
                      {reviews.stars.toFixed(1).replace(".", ",")}
                    </span>
                    <span className="text-sm font-normal text-white/75 transition-colors group-hover:text-white">
                      {reviews.total} nhận xét
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 translate-y-0.5 text-white/70 transition-transform group-hover:translate-y-1"
                      aria-hidden
                    />
                  </Link>
                </dd>
              </div>
            )}

            {visitors && visitors.total > 0 && (
              <div className={ITEM}>
                <dt className={DT}>Đã đến</dt>
                <dd className="mt-1.5 flex h-8 items-center justify-center">
                  <CheckInFaces
                    people={visitors.people}
                    total={visitors.total}
                    tone="onDark"
                    label={`${visitors.total.toLocaleString("vi-VN")} Vivu-er`}
                  />
                </dd>
              </div>
            )}
          </dl>
        )}

      </div>
    </PlaceHeroCanvas>
  );
}
