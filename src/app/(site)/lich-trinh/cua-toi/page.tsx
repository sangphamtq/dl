import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import { coverUrl } from "@/lib/place-image";
import { getPlanningTripId } from "../actions";
import { NewTripButton, TripCardMenu } from "@/components/trip/trip-list-actions";
import { cn } from "@/lib/utils";

// Nhãn nhỏ in hoa — CÙNG hằng với `destination-filter.tsx`.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

const coverSel = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;
const stopSel = { select: { name: true, slug: true, images: coverSel } } as const;

export const metadata = {
  title: "Lịch trình của tôi",
  // Dữ liệu cá nhân — noindex. `/lich-trinh` (danh sách mẫu) mới là trang có index.
  robots: { index: false, follow: false },
  description:
    "Gom điểm muốn đến, xếp theo ngày và xem ngay giờ ước tính — biết trước quán nào chưa mở lúc bạn tới.",
};

type Stop = { name: string; photo: string };

/**
 * Danh sách chuyến của người dùng. Bắt đăng nhập (docs/lich-trinh.md §2) —
 * trang này toàn dữ liệu cá nhân, nên nó nằm dưới `/lich-trinh/cua-toi` chứ
 * không phải ngay `/lich-trinh`: cả nhánh riêng tư gom vào MỘT tiền tố thì
 * `sw.js` chặn cache bằng đúng một dòng, và `/lich-trinh` được tự do làm trang
 * công khai có index (docs/lich-trinh.md §4).
 *
 * ẢNH LÀ ẢNH CỦA CÁC ĐIỂM DỪNG TRONG CHUYẾN, KHÔNG PHẢI MỘT ẢNH BÌA.
 * Bản đầu dựng thẻ 4/3 với ảnh bìa mượn của điểm dừng ĐẦU TIÊN, và nó hỏng hai
 * đường: chuyến vừa tạo chưa có điểm dừng nào nên ô xám là trạng thái MẶC ĐỊNH
 * (4/6 ô trên dữ liệu thật), còn chuyến có ảnh thì lại trùng đúng tấm mà mẫu
 * cùng tên bên dưới đang dùng. Bản sau bỏ hẳn ảnh — sạch, nhưng một site lấy
 * ảnh làm chủ mà trang này toàn chữ thì lạc quẻ.
 *
 * Nay mỗi hàng bày một MẢNG 2–3 ảnh của chính các điểm dừng trong chuyến đó:
 * luôn có (mọi ảnh đi qua `coverUrl()`, đúng cách cả site vẫn làm), khác nhau
 * giữa hai chuyến, và tự nó nói "chuyến này gồm những nơi này". Chuyến chưa có
 * điểm dừng thì ô ảnh thành TẤM SỐ NGÀY — một khối chữ có chủ ý, không phải một
 * ô xám hỏng.
 */
export default async function LichTrinhPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/lich-trinh/cua-toi");
  const userId = session.user.id;

  const [trips, templates, planningId] = await Promise.all([
    prisma.trip.findMany({
      // Chuyến mình sở hữu HOẶC được mời cùng sửa.
      where: {
        isTemplate: false,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        updatedAt: true,
        ownerId: true,
        owner: { select: { name: true } },
        _count: { select: { items: true, days: true } },
        // Nơi bấm "Lên lịch trình đi X" — ảnh dự phòng cho chuyến chưa có mục nào.
        place: { select: { name: true, slug: true, images: coverSel } },
        // Ba điểm dừng đầu, theo đúng thứ tự đi: ngày trước, rồi vị trí trong ngày.
        items: {
          take: 3,
          orderBy: [{ day: { index: "asc" } }, { order: "asc" }],
          select: {
            customTitle: true,
            spot: stopSel,
            eatery: stopSel,
            activity: stopSel,
            accommodation: stopSel,
          },
        },
      },
    }),
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published" },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        images: coverSel,
        place: { select: { name: true } },
        _count: { select: { days: true } },
      },
    }),
    getPlanningTripId(),
  ]);

  return (
    // Nền TRẮNG, không hoạ tiết. Bản trước có dải chuyển sắc xanh da trời cộng
    // ba vòng tròn đồng tâm ở góc phải — hai thứ trang trí thuần tuý, mà bộ vật
    // liệu biên tập (`/diem-den`, `/dia-diem`, `/blog`…) không dùng nền màu lẫn
    // hoạ tiết: phân tầng ở đó do chữ và khoảng trắng lo.
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <p className={cn(MICRO, "text-warm-ink")}>Chuyến đi của bạn</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4.4vw,3rem)] font-normal uppercase leading-[1.15] tracking-[0.1em] sm:tracking-[0.14em]">
                Lịch trình
              </h1>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                Gom nơi muốn đến, xếp vào từng ngày — chúng tôi tính giúp giờ ước
                tính và báo trước chỗ nào chưa mở lúc bạn tới.
              </p>
            </div>
            <NewTripButton />
          </div>

          {/* ── Chuyến của tôi ─────────────────────────────────────────────
              `-mx-4` ở <ul> + `px-4` ở từng hàng: dải nền và vạch của hàng ĐANG
              LÊN LỊCH TRÌNH tràn ra ngoài lề, còn chữ vẫn thẳng cột với tiêu đề
              trang. Để hàng `px-0` thì trên mobile ô ảnh dán sát mép và CHE MẤT
              vạch xanh — thứ duy nhất nhìn một cái là thấy. */}
          {trips.length > 0 ? (
            <ul className="-mx-4 mt-9 border-y border-border">
              {trips.map((trip) => {
                const isPlanning = trip.id === planningId;
                const isGuest = trip.ownerId !== userId;
                const stops: Stop[] = trip.items.flatMap((it) => {
                  const t = it.spot ?? it.eatery ?? it.activity ?? it.accommodation;
                  if (t)
                    return [{ name: t.name, photo: coverUrl(t.images, t.slug, 480, 360) }];
                  // Mục TỰ NHẬP (chuyến bay, nhà người quen…) không có ảnh —
                  // vẫn tính là một điểm dừng, chỉ không góp mặt vào mảng ảnh.
                  return it.customTitle
                    ? [{ name: it.customTitle, photo: "" }]
                    : [];
                });
                // Chuyến chưa có điểm dừng nào vẫn còn một chỗ dựa: ĐIỂM ĐẾN mà
                // nó được tạo cho ("Lên lịch trình đi Phan Thiết"). Đó là bối
                // cảnh của chính chuyến, khác hẳn kiểu bản đầu lấy ảnh một điểm
                // dừng ra đứng thay cho cả chuyến.
                const photos = stops.map((s) => s.photo).filter(Boolean);
                if (photos.length === 0 && trip.place)
                  photos.push(
                    coverUrl(trip.place.images, trip.place.slug, 480, 360),
                  );

                return (
                  <li
                    key={trip.id}
                    className={cn(
                      "relative border-b border-border last:border-b-0",
                      // Chuyến ĐANG lên lịch trình: nền phớt + vạch mực bên trái.
                      // Vẽ vạch bằng `shadow` inset chứ không `border-l` — border
                      // thật đẩy cả hàng dịch 2px so với các hàng còn lại (cùng
                      // cách đã dùng ở bảng bên của `/ban-do`).
                      isPlanning &&
                        "bg-primary/5 shadow-[inset_2px_0_0_var(--primary)]",
                    )}
                  >
                    <div className="grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6 sm:py-6">
                      <StopMosaic photos={photos} days={trip._count.days} />

                      <div className="min-w-0 sm:pr-10">
                        {(isPlanning || isGuest) && (
                          <p
                            className={cn(
                              MICRO,
                              "mb-1",
                              isPlanning ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {isPlanning
                              ? "Đang lên lịch trình"
                              : trip.owner?.name
                                ? `Chuyến của ${trip.owner.name.split(" ").slice(-1)[0]}`
                                : "Được mời cùng sửa"}
                          </p>
                        )}

                        <h2 className="text-lg font-semibold leading-snug tracking-tight">
                          <Link
                            href={`/lich-trinh/cua-toi/${trip.id}`}
                            className="underline-offset-4 after:absolute after:inset-0 hover:underline"
                          >
                            {trip.title}
                          </Link>
                        </h2>

                        {/* Tên các điểm dừng, ngăn nhau bằng KHOẢNG TRẮNG RỘNG
                            (không dấu chấm giữa — quy ước chung). Dải mờ ở mép
                            phải phải đi kèm `flex-1`: để khối co theo nội dung
                            thì dải mờ bám mép CHỮ và ăn vào tên cuối ngay cả khi
                            hàng còn thừa nửa bề ngang. */}
                        <p className="mt-1.5 flex min-w-0 flex-1 gap-x-4 overflow-hidden whitespace-nowrap text-sm text-muted-foreground [mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]">
                          {stops.length > 0 ? (
                            stops.map((s) => <span key={s.name}>{s.name}</span>)
                          ) : (
                            <span>Chưa có điểm dừng nào</span>
                          )}
                        </p>

                        <p
                          className={cn(
                            MICRO,
                            "mt-3 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground",
                          )}
                        >
                          <span>{trip._count.days} ngày</span>
                          {trip._count.items > 0 && (
                            <span>{trip._count.items} mục</span>
                          )}
                          {trip.startDate && (
                            <span>
                              Khởi hành{" "}
                              {trip.startDate.toLocaleDateString("vi-VN", {
                                day: "numeric",
                                month: "numeric",
                                year: "numeric",
                                timeZone: "UTC",
                              })}
                            </span>
                          )}
                          {/* Danh sách sắp theo lần sửa gần nhất, nên phải NÓI
                              ra — bản trước sắp theo `updatedAt` mà không hiện
                              nó, thành ra thứ tự trông như ngẫu nhiên. */}
                          <span>Sửa {timeAgo(trip.updatedAt)}</span>
                        </p>
                      </div>
                    </div>

                    <TripCardMenu
                      tripId={trip.id}
                      title={trip.title}
                      isPlanning={isPlanning}
                      className="absolute right-3 top-4 bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background sm:right-4 sm:top-6 sm:bg-transparent sm:shadow-none sm:backdrop-blur-none"
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-9 border border-dashed border-border px-6 py-14 text-center">
              <p className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                Bạn chưa có lịch trình nào
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Tạo một chuyến rồi bấm{" "}
                <strong className="font-medium text-foreground">
                  Thêm vào lịch trình
                </strong>{" "}
                ở bất kỳ địa điểm, quán ăn hay chỗ ở nào bạn thích.
              </p>
              <div className="mt-5">
                <NewTripButton />
              </div>
            </div>
          )}

          {/* ── Lịch trình mẫu ─────────────────────────────────────────────
              Hàng GỌN có ảnh vuông nhỏ: đủ hình để không lạc khỏi bộ vật liệu
              của site, nhưng nhỏ hơn hẳn mảng ảnh ở trên nên không tranh chỗ với
              chuyến của chính người dùng — đây là lối đi tiếp sang `/lich-trinh`,
              không phải nội dung của trang này. */}
          {templates.length > 0 && (
            <section className="mt-14">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.125rem,2.2vw,1.5rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                  Lịch trình gợi ý
                </h2>
                <Link
                  href="/lich-trinh"
                  className={cn(
                    MICRO,
                    "text-muted-foreground transition-colors hover:text-foreground",
                  )}
                >
                  Xem tất cả →
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Do biên tập soạn — bấm để nhân bản thành chuyến của riêng bạn rồi
                sửa thoải mái.
              </p>

              <ul className="mt-4">
                {templates.map((t) => (
                  <li key={t.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/lich-trinh/${t.slug}`}
                      className="group flex items-center gap-4 py-3 transition-colors sm:gap-5"
                    >
                      <span className="relative size-12 shrink-0 overflow-hidden bg-muted sm:size-14">
                        <Image
                          src={coverUrl(t.images, t.slug ?? t.id, 240, 240)}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium underline-offset-4 group-hover:underline">
                        {t.title}
                      </span>
                      <span
                        className={cn(
                          MICRO,
                          "flex shrink-0 gap-x-5 text-muted-foreground",
                        )}
                      >
                        {t.place && (
                          <span className="hidden sm:inline">{t.place.name}</span>
                        )}
                        <span>{t._count.days} ngày</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Mảng ảnh các điểm dừng của một chuyến.
 *
 * Bố cục ĐỔI THEO SỐ ẢNH để không bao giờ có ô trống: 3 ảnh thì một ảnh lớn
 * cộng hai ảnh nhỏ xếp chồng, 2 ảnh thì chia đôi, 1 ảnh thì tràn cả khối.
 *
 * Bố cục 1+2 dùng ở MỌI KHỔ. Đã thử ba cột bằng nhau cho mobile: ở 390px mỗi ô
 * còn 130px ngang trên 244px cao, tức mọi ảnh phong cảnh đều bị cắt thành một
 * dải dọc hẹp — nhìn ra ảnh hỏng chứ không ra bộ ba ảnh.
 *
 * Khe giữa các ảnh là 1px MÀU NỀN TRANG, không phải đường kẻ: nó tách hai tấm
 * ảnh chứ không vẽ lưới lên một hình chữ nhật.
 */
function Tile({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width:640px) 15rem, 100vw"
        className="object-cover"
      />
    </span>
  );
}

function StopMosaic({ photos, days }: { photos: string[]; days: number }) {
  const box =
    "relative aspect-[16/10] overflow-hidden bg-muted sm:aspect-auto sm:h-full sm:min-h-[8.5rem]";

  // Chưa có điểm dừng ⇒ chưa có ảnh nào để bày. Tấm SỐ NGÀY thay vào chỗ đó —
  // vẫn là một khối có nội dung, không phải ô ảnh hỏng.
  if (photos.length === 0) {
    return (
      // Thấp hơn ô ảnh trên mobile: một mảng be cao bằng tấm ảnh 16/10 thì
      // chiếm gần một màn hình chỉ để nói "chưa có gì". Từ `sm` nó nằm cạnh cột
      // chữ nên vẫn cao bằng hàng.
      <div className={cn(box, "aspect-[5/2] grid place-items-center bg-muted")}>
        <span className="text-center">
          <span className="block font-[family-name:var(--font-display)] text-3xl leading-none">
            {days}
          </span>
          <span className={cn(MICRO, "mt-1.5 block text-muted-foreground")}>
            ngày
          </span>
        </span>
      </div>
    );
  }

  if (photos.length === 1)
    return (
      <div className={box}>
        <Tile src={photos[0]} className="absolute inset-0" />
      </div>
    );

  if (photos.length === 2)
    return (
      <div className={cn(box, "grid grid-cols-2 gap-px bg-background")}>
        <Tile src={photos[0]} />
        <Tile src={photos[1]} />
      </div>
    );

  return (
    <div
      className={cn(
        box,
        "grid grid-cols-[1.7fr_1fr] grid-rows-2 gap-px bg-background",
      )}
    >
      <Tile src={photos[0]} className="row-span-2" />
      <Tile src={photos[1]} />
      <Tile src={photos[2]} />
    </div>
  );
}
