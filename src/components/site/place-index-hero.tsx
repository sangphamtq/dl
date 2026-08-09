import Image from "next/image";
import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

export type HeroPhoto = { name: string; url: string };
export type HeroStat = { value: number; label: string };

// Đầu trang danh sách điểm đến.
//
// NỀN NHẠT + HEADER CHÌM LÊN TRÊN. `SiteHeader` chạy ở chế độ `overlay`: nó
// `fixed`, hero bắt đầu từ y=0 và chạy BÊN DƯỚI nó, tint kính gần như trong veo
// cho tới khi cuộn (xem header-chrome.tsx). Nhờ vậy dải màu của hero liền một
// mạch từ mép trên màn hình chứ không bị một thanh cắt ngang.
// Chữ trắng của header đọc được là nhờ lớp scrim `from-black/40` mà chế độ
// overlay tự vẽ ở 128px trên cùng — đặt trên nền xanh nhạt này nó ra một vệt mờ
// tối rất nhẹ, đúng nghĩa "chìm". ⚠️ Đổi nền hero sang sáng hơn nữa (trắng trơn
// chẳng hạn) là chữ header mất chỗ bám ngay.
// Vì header `fixed` nên nó KHÔNG chiếm chỗ trong luồng: hero phải tự chừa
// `lg:pt-28` (4rem header + khoảng thở), thiếu là tiêu đề chui xuống dưới nav.
//
// ẢNH: BA tấm nhỏ xếp thành vòng cung, KHÔNG phải một tấm phóng hết khung như
// bản cũ. Bản cũ lấy ảnh của điểm đến nổi bật nhất trải kín 600px, phủ scrim
// đen, chữ trắng đè lên — tức đúng công thức của cái thẻ trong lưới ngay bên
// dưới, chỉ to gấp mười. Ba tấm nhỏ không nhãn thì đọc ra là "ảnh minh hoạ",
// không ai nhầm nó với một mục bấm được; và ba tấm khác nhau nói được "khắp dải
// đất" đúng hơn một tấm. Nền nhạt còn một cái lợi riêng ở đây: ảnh phong cảnh
// sáng nổi hẳn lên thay vì phải đấu với một nền đen.
// Ảnh là TRANG TRÍ nên không phải link (bấm vào cũng chỉ tới một nơi ngẫu
// nhiên) — bù lại có một dòng ghi tên ảnh bên dưới, đúng kiểu chú thích ảnh.
//
// Ẩn dải ảnh dưới sm: ở đó ba tấm chỉ còn ~85px, thành ba con tem.
export function PlaceIndexHero({
  photos,
  stats,
}: {
  photos: HeroPhoto[];
  stats: HeroStat[];
}) {
  const shots = photos.slice(0, 3);

  return (
    // Dải màu: xanh lá rất nhạt (`accent`) ở trên, tan dần về nền trang. Đậm
    // nhất đúng ở mép trên — chỗ header nằm — rồi nhả ra để lưới thẻ bên dưới
    // bắt đầu trên nền sạch.
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-accent via-accent/45 to-background">
      {/* Quầng xanh sau dải ảnh — chỉ để nền không phẳng lì. `blur-3xl` +
          primary/10 nên nó là ánh sáng, không phải một hình. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[38rem] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-16 lg:pb-16 lg:pt-28">
        <div>
          {/* Hai bậc đậm của cùng một họ chữ (800 / 600) thay cho hai màu.
              KHÔNG `font-light`: Be Vietnam Pro chỉ nạp 600/700/800. */}
          <h1 className="text-balance font-[family-name:var(--font-display)] text-[clamp(2rem,4.4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Điểm đến khắp dải đất{" "}
            <span className="font-semibold text-muted-foreground">
              hình chữ S
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Chọn một nơi để bắt đầu — gợi ý nên ăn gì, chơi gì, ở đâu và đi lại
            thế nào cho từng vùng.
          </p>

          {/* Lối đi thứ hai duy nhất của trang: bản đồ. Giữ vì nó KHÁC danh
              sách bên dưới (chọn theo vị trí thay vì theo miền), không phải một
              đường tắt tới cùng chỗ. */}
          <Link
            href="/ban-do"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Ic icon="map" className="size-4" aria-hidden />
            Xem trên bản đồ
          </Link>

          {stats.length > 0 && (
            // Số to, nhãn nhỏ bên dưới. Lưới 2 cột dưới sm rồi mới thả thành
            // hàng ngang: để `flex-wrap` lo ở khổ hẹp thì bốn cụm xuống thành
            // 3 + 1, cụm cuối đứng lẻ một mình cả một hàng.
            <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border/70 pt-6 sm:flex sm:flex-wrap sm:gap-x-12">
              {stats.map((s) => (
                <div key={s.label}>
                  <dd className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold leading-none tracking-tight tabular-nums">
                    {s.value.toLocaleString("vi-VN")}
                  </dd>
                  <dt className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        {shots.length >= 3 && (
          <div className="hidden sm:block">
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              {shots.map((s, i) => (
                <div
                  key={s.name}
                  className={cn(
                    "relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-lg shadow-black/5",
                    // Vòng cung: hai tấm ngoài tụt xuống, tấm giữa đứng cao. Ba
                    // tấm thẳng hàng thì ra một dải phim; lệch một nhịp là thành
                    // một xấp ảnh đặt hờ lên nhau.
                    i !== 1 && "mt-6 lg:mt-10",
                  )}
                >
                  <Image
                    src={s.url}
                    alt=""
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 18vw, 30vw"
                    className="object-cover"
                  />
                  {/* Vành mực nhạt vẽ bên trong mép: ảnh trời sáng đặt trên nền
                      xanh nhạt thì cạnh trên gần như biến mất nếu không có nó. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10"
                  />
                </div>
              ))}
            </div>

            {/* Chú thích ảnh — ảnh không phải link nên đây là chỗ duy nhất nói
                được ba tấm kia là ở đâu. */}
            <p className="mt-4 text-xs text-muted-foreground">
              Ảnh: {shots.map((s) => s.name).join(" · ")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
