import Link from "next/link";
import { ChevronDown, ChevronLeft, Star } from "@/components/icons";
import { PlaceHeroCanvas } from "@/components/site/place-hero-canvas";
import type { HeroImage } from "@/components/site/place-hero-stack";
import { ShareButton } from "@/components/site/share-button";
import { CheckInButton } from "@/components/site/check-in-button";
import { PlanTripButton } from "@/components/site/plan-trip-button";
import { CheckInFaces, type CheckInPerson } from "@/components/site/check-in-faces";
import type { PlaceStat } from "@/lib/place-meta";
import { Glyph } from "@/components/site/glyphs";

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

const MICRO = "text-[0.72rem] font-medium uppercase tracking-[0.1em]";
const DT = `${MICRO} text-white/75`;

const BAR_TYPE = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";
const BAR_BTN = `h-9 gap-2 whitespace-nowrap rounded-[4px] px-3 sm:px-4 ${BAR_TYPE}`;

const BAR_BTN_COLLAPSE = `size-9 shrink-0 justify-center rounded-full border border-white/45 hover:border-white sm:h-9 sm:w-auto sm:justify-start sm:gap-2 sm:whitespace-nowrap sm:rounded-[4px] sm:border-white/50 sm:px-4 sm:hover:border-white ${BAR_TYPE}`;

const CIRCLE =
  "grid size-9 shrink-0 place-items-center rounded-full border border-white/45 transition-colors hover:border-white";

const ITEM =
  "px-2 text-center sm:border-l sm:border-white/25 sm:px-8 sm:first:border-l-0";

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
  const metaCount =
    stats.length +
    (visitors && visitors.total > 0 ? 1 : 0) +
    (reviews && reviews.total > 0 ? 1 : 0);
  const hasMeta = metaCount >= 2;

  return (
    <PlaceHeroCanvas
      images={heroImages}
      compact={!hasMeta && heroImages.length < 2}
      topBar={
        // Dưới `sm` XUỐNG HAI HÀNG: đường dẫn một hàng, nút một hàng. Ở 320px
        // cụm nút bên phải ăn gần hết bề ngang, để chung một hàng thì tên tỉnh
        // bị `truncate` cụt còn đúng một ký tự — mà đó là mẩu tin đáng giữ nhất
        // của hàng này trên điện thoại.
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* ĐƯỜNG DẪN THẬT, không phải một nút back cụt.
              Tên tỉnh cha trước đây nằm thành một hàng riêng ngay trên tên điểm
              đến — giữa ảnh, nên phải đeo ba lớp bóng đổ mới đọc được. Ở đây nó
              về đúng chỗ của nó (CLAUDE.md: "phân cấp thể hiện qua breadcrumb"),
              nằm trong dải trên vốn đã có scrim riêng, nên KHÔNG cần bóng.
              Khổ hẹp bỏ chữ "Điểm đến" và dấu nối, giữ lại tỉnh cha — cấp cụ thể
              hơn thì đáng giữ hơn; bản trước ở khổ đó chỉ còn trơ một mũi tên. */}
          <nav
            aria-label="Đường dẫn"
            className="flex min-w-0 items-center gap-2.5"
          >
            {back && (
              <Link
                href={back.href}
                className="group inline-flex shrink-0 items-center gap-2.5 text-white/85 transition-colors hover:text-white"
              >
                <span className={`${CIRCLE} group-hover:border-white/60`}>
                  <ChevronLeft
                    className="size-[1.15rem] transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className={MICRO}>{back.label}</span>
              </Link>
            )}
            {place.parent && (
              <>
                <Glyph
                  name="chevron-down"
                  className="size-3.5 shrink-0 -rotate-90 text-white/45"
                />
                <Link
                  href={`/diem-den/${place.parent.slug}`}
                  // Cấp hiện tại sáng hơn một bậc so với "Điểm đến": phân cấp
                  // bằng ĐỘ SÁNG thay cho bóng đổ.
                  className={`${MICRO} min-w-0 truncate text-white underline-offset-4 transition-colors hover:underline`}
                >
                  {place.parent.name}
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2 self-end sm:self-auto">
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
              className={`${CIRCLE} text-white/85 hover:bg-transparent hover:text-white`}
            />
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-3xl text-center">
        <h1 className="text-balance font-[family-name:var(--font-display)] text-[clamp(3.25rem,10vw,8.5rem)] font-extrabold leading-[0.92] tracking-[-0.045em] text-white">
          {place.name}
        </h1>

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
