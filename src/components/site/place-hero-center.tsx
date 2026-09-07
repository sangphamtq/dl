import Link from "next/link";
import { ChevronDown, ChevronLeft, Star } from "@/components/icons";
import { PlaceHeroCanvas } from "@/components/site/place-hero-canvas";
import type { HeroImage } from "@/components/site/place-hero-stack";
import { ShareButton } from "@/components/site/share-button";
import { CheckInButton } from "@/components/site/check-in-button";
import { PlanTripButton } from "@/components/site/plan-trip-button";
import { CheckInFaces, type CheckInPerson } from "@/components/site/check-in-faces";
import type { PlaceStat } from "@/lib/place-meta";
import { regionOf } from "@/lib/regions";

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

// Kicker của hero: bậc chữ nằm GIỮA nhãn micro và tên điểm đến.
const KICKER =
  "text-[clamp(0.9rem,2vw,1.35rem)] font-semibold uppercase leading-none tracking-[0.16em] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_2px_12px_rgba(0,0,0,0.75),0_0_36px_rgba(0,0,0,0.55)]";

// Hai vạch kẹp hai bên kicker. CHỮ trắng (sống được trên mọi ảnh), VẠCH cam —
// điểm nhấn màu dồn vào thứ chỉ có nhiệm vụ trang trí, nên nó tha hồ rực mà
// không ảnh hưởng độ đọc của chữ. Bóng đổ để nét 1px không tan trên ảnh sáng.
const RULE =
  "h-px w-10 shrink-0 bg-warm-bright sm:w-16";

// Khuôn chung của MỌI nút CÓ CHỮ ở thanh trên (lên lịch trình · đã đến): cùng
// chiều cao, cùng bo góc, cùng bậc chữ micro, cùng đệm ngang. Khác nhau chỉ ở
// VẬT LIỆU — nền đặc = hành động chính, viền 1px = hành động phụ. Đồng bộ theo
// nghĩa cùng khuôn, không phải trông giống hệt nhau: giống hệt thì mất luôn
// thứ tự ưu tiên.
const BAR_TYPE = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";
const BAR_BTN = `h-9 gap-2 whitespace-nowrap rounded-[4px] px-3 sm:px-4 ${BAR_TYPE}`;

// "Đánh dấu đã đến" ở khổ hẹp thu về VIÊN TRÒN chỉ-icon (nhãn dài gấp đôi nút
// chính, để nguyên thì nó rớt bốn dòng ở 320px và đẩy nút chia sẻ ra khỏi màn).
// Đúng luật hình dáng của trang: có chữ = khối vuông, chỉ-icon = viên tròn.
const BAR_BTN_COLLAPSE = `size-9 shrink-0 justify-center rounded-full border border-white/25 hover:border-white/60 sm:h-9 sm:w-auto sm:justify-start sm:gap-2 sm:whitespace-nowrap sm:rounded-[4px] sm:border-white/30 sm:px-4 sm:hover:border-white/70 ${BAR_TYPE}`;

// Viên tròn hairline dùng cho nút CHỈ-ICON ở thanh trên (back · chia sẻ):
// một hình dáng duy nhất, phân biệt nhau bằng icon chứ không bằng kiểu nút.
const CIRCLE =
  "grid size-9 shrink-0 place-items-center rounded-full border border-white/25 transition-colors hover:border-white/60";

// Ô số liệu: vạch DỌC mảnh ngăn cách (thay hairline ngang của bản canh trái).
// Mobile bỏ vạch — các ô xuống dòng thì vạch đầu dòng sẽ thành lạc lõng.
// Đệm ngang ở mobile phải RẤT hẹp: ba ô này buộc phải nằm chung một hàng xuống
// tới màn 320px, mà `px-6` thôi đã ăn 144px trong tổng số ~288px khả dụng.
const ITEM =
  "px-2 text-center sm:border-l sm:border-white/25 sm:px-8 sm:first:border-l-0";

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
  // Hàng số liệu cần ÍT NHẤT HAI dữ kiện mới hiện.
  // Điểm đến thưa (Tà Xùa) chỉ có "Lượt xem 4", và một con số yếu đứng trơ trọi
  // giữa hero, ngay dưới tagline, không đọc ra là dữ kiện — nó đọc ra là "chưa
  // ai tới đây". Hàng này vốn là hàng BẰNG CHỨNG XÃ HỘI; một con số lẻ không
  // phải bằng chứng. Hai trở lên thì mới thành một hàng dữ kiện.
  const metaCount =
    stats.length +
    (visitors && visitors.total > 0 ? 1 : 0) +
    (reviews && reviews.total > 0 ? 1 : 0);
  const hasMeta = metaCount >= 2;

  // Tỉnh chưa map vào miền nào thì regionOf trả "Khác" — một kicker ghi
  // "KHÁC" còn tệ hơn không có gì, nên rơi về nhãn loại.
  const region = regionOf(place.slug);
  const regionLabel =
    region === "Khác"
      ? place.kind === "province"
        ? "Tỉnh"
        : "Điểm đến"
      : region;

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
          {/* Phải: BA nút, một khuôn — cùng chiều cao 36px, cùng bo 4px, cùng
              bậc chữ micro, cùng khoảng cách. Phân biệt bằng VẬT LIỆU chứ
              không bằng kiểu dáng, nhờ vậy vẫn đọc ra thứ tự ưu tiên:
                nền cam đặc  → "Lên lịch trình" (hành động chính của trang)
                viền 1px     → "Đánh dấu đã đến"
                viên tròn    → chia sẻ (chỉ-icon nên tròn, theo luật hình dáng)
              ⚠️ "Lên lịch trình" trước ở THÂN hero, và ghi chú cũ ở đây nói rõ
              lý do: thanh này vốn chỉ có đường 1px và chữ, một khối nền đặc ở
              góc sẽ hút mắt hơn cả tên điểm đến. Nay chuyển lên đây theo yêu
              cầu — đổi lại thân hero không còn CTA nào, nên nếu thấy tỉ lệ
              chuyển đổi tụt thì đây là chỗ đầu tiên cần soi lại.
              Nhãn "Đánh dấu đã đến" dài gấp đôi nút chính nên dưới `sm` nó thu
              về viên tròn chỉ-icon (`labelFrom="sm"`), nếu không ở 320px nó
              rớt bốn dòng và đẩy nút chia sẻ ra khỏi màn hình. */}
          <div className="flex items-center gap-2">
            {checkIn && (
              <>
                <PlanTripButton
                  placeId={place.id}
                  placeName={place.name}
                  isAuthed={checkIn.isAuthed}
                  compact
                  className={`${BAR_BTN} bg-warm text-warm-foreground hover:bg-warm/90`}
                />
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
                  labelFrom="sm"
                  className={BAR_BTN_COLLAPSE}
                />
              </>
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
        {/* KICKER — tên tỉnh cha, đặt ngay trên tên điểm đến.
            Bản đầu để 0.7rem: cạnh một h1 cao tới 136px thì tỉ lệ là 1:11, đọc
            ra như chú thích ảnh chứ không phải một tầng của tiêu đề — mà đây
            chính là thứ trả lời "nơi này ở đâu". Nay ~1:5, vẫn thấp hơn tên
            một bậc rõ ràng nhờ IN HOA + giãn ký tự chứ không nhờ bóp nhỏ.

            CHIA VIỆC giữa chữ và vạch, đây là điểm cốt lõi của khối này:
            · **CHỮ TRẮNG** vì nó phải sống trên MỌI ảnh. Bản cam
              (`warm-bright`) đọc tốt trên hero tối nhưng tan hẳn trên ảnh
              sáng — Tà Xùa nền mù xám trắng, Phan Thiết trời chiều sáng. Ảnh
              do biên tập chọn, không đoán trước được độ sáng.
            · **VẠCH CAM** gánh phần điểm nhấn màu. Vạch chỉ có nhiệm vụ trang
              trí nên tha hồ rực mà không ảnh hưởng độ đọc của chữ; chữ trắng
              đứng một mình thì chìm vào cùng một sắc với tên điểm đến.
            · Độ đọc của chữ đến từ **quầng bóng ba tầng**, không từ nền kính
              hay viên chip: hero này cố ý chỉ có đường 1px và chữ (xem ghi chú
              ở topBar), thêm một khối mờ ở giữa là nó hút mắt hơn cả tên.
            · **KHÔNG gạch chân dưới chữ.** Đã thử và bỏ: dưới một dòng in hoa
              giãn ký tự nó đọc ra như chữ bị gạch xoá, và đụng dấu nặng của
              "Ậ". Link báo bằng đổi độ sáng khi rê chuột.
            · Trang TỈNH (không có parent) lấp bằng MIỀN thay nhãn cũ
              "Tỉnh · Thành phố" — để ô này luôn là một NƠI CHỐN bao quanh, và
              bỏ luôn dấu · vốn trái quy ước dải phân cách. */}
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <span aria-hidden className={RULE} />
          {place.parent ? (
            <Link
              href={`/diem-den/${place.parent.slug}`}
              className={`${KICKER} transition-colors hover:text-white`}
            >
              {place.parent.name}
            </Link>
          ) : (
            <span className={KICKER}>{regionLabel}</span>
          )}
          <span aria-hidden className={RULE} />
        </div>

        {/* CHỮ ĐẶC, không gradient.
            Bản trước tô gradient rồi cắt theo hình chữ (`bg-clip-text` +
            `text-transparent`) cho nét chữ chìm dần vào ảnh. Bỏ vì hai lý do,
            và lý do thứ hai mới là lý do thật:
              · detector của impeccable bắt đúng luật `gradient-text`, và craft
                floor cấm thẳng: nhấn mạnh đến từ CỠ và ĐỘ ĐẬM, không từ dải màu;
              · `text-transparent` khiến màu tính toán của <h1> là rgba(0,0,0,0),
                nên KHÔNG công cụ nào tính được tương phản của tiêu đề lớn nhất
                trang — kể cả trình kiểm tra của công nghệ trợ giúp. Một tiêu đề
                đặt trên ảnh mà không kiểm được tương phản là chỗ không nên có
                hiệu ứng.
            Thay bằng chữ trắng đặc + `drop-shadow` để tách khỏi ảnh: cùng việc
            "chìm vào ảnh" nhưng đo được, và đọc chắc trên cả ảnh sáng.
            font-extrabold (800): Be Vietnam Pro ở 700 hơi nhẹ so với cỡ chữ này.
            Sans hình học nên siết tracking sâu hơn serif; không đặt
            font-variation-settings vì đây là font tĩnh, không có trục nào. */}
        {/* Serif IN HOA giãn chữ — đúng giọng tiêu đề của `/diem-den` ("VIỆT
            NAM"), `/dia-diem`, `/blog`. Tên một nơi là danh từ riêng ngắn nên
            in hoa hợp; cỡ hạ một bậc vì chữ serif in hoa choán chỗ hơn hẳn chữ
            display nén, để nguyên 8.5rem thì tên dài như "Phan Thiết" tràn hai
            dòng ở khổ vừa. */}
        <h1 className="mt-[calc(1.6rem-0.24em)] mb-[-0.16em] text-balance bg-gradient-to-b from-white from-45% to-white/30 bg-clip-text pb-[0.16em] pt-[0.24em] font-[family-name:var(--font-display)] text-[clamp(3.25rem,10vw,8.5rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-transparent">
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
                    {/* Dưới `sm` chỉ còn điểm sao: nhãn "ĐÁNH GIÁ" ngay trên đã
                        nói đây là gì, còn số lượt nhận xét là chi tiết phụ —
                        giữ nó thì cả hàng ba ô không thể vừa màn 320px. */}
                    <span className="hidden text-sm font-normal text-white/75 transition-colors group-hover:text-white sm:inline">
                      {reviews.total} nhận xét
                    </span>
                    <ChevronDown
                      className="hidden size-4 shrink-0 translate-y-0.5 text-white/70 transition-transform group-hover:translate-y-1 sm:block"
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
                    dense
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
