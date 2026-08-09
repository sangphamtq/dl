import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { getSettings } from "@/lib/settings";
import { GoogleIcon, FacebookIcon } from "@/components/site/provider-icons";
import { signInGoogle, signInFacebook, signInDev } from "./auth-actions";

const IS_DEV = process.env.NODE_ENV !== "production";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl }, settings, place, devUsers] = await Promise.all([
    searchParams,
    getSettings(),
    // Ảnh cột trái là ảnh THẬT của một điểm đến trong CSDL.
    // Bản trước dùng `picsum.photos/seed/vietnam-travel-login` — một ảnh ngẫu
    // nhiên từ dịch vụ ảnh mẫu (lúc tôi mở ra thì nó là cái cầu thang trong
    // nhà), lại kèm `alt="Phong cảnh núi non Việt Nam"`. Tức là dòng alt mô tả
    // một thứ không có trong ảnh: trình đọc màn hình bị nói dối, còn người sáng
    // mắt thì thấy trang đăng nhập của một trang du lịch mở ra bằng ảnh cầu
    // thang. Site có sẵn 31 ảnh điểm đến thật, không có lý do dùng ảnh mẫu.
    prisma.place.findFirst({
      where: { status: "published", kind: "destination" },
      orderBy: [
        { isFeatured: "desc" },
        { popularity: "desc" },
        { name: "asc" },
      ],
      select: {
        slug: true,
        name: true,
        images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
        parent: { select: { name: true } },
      },
    }),
    // Chỉ ở dev: gợi ý các tài khoản CTV đã seed để đăng nhập nhanh 1 chạm.
    IS_DEV
      ? prisma.user.findMany({
          where: { saleProfile: { isNot: null } },
          select: { name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([] as { name: string | null; email: string | null }[]),
  ]);

  const redirectTo = callbackUrl || "/";

  return (
    <main className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* ── CỘT ẢNH (từ lg) ────────────────────────────────────────────────
          Ảnh không có chữ đè lên phần giữa: chỉ logo ở đỉnh và một khối nhỏ ở
          đáy, nên lớp phủ chỉ cần đậm ở hai đầu. */}
      <div className="relative hidden lg:block">
        {place && (
          <Image
            src={coverUrl(place.images, place.slug, 1400, 1800)}
            alt=""
            fill
            priority
            sizes="55vw"
            className="object-cover"
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.15)_35%,rgba(0,0,0,0.2)_65%,rgba(0,0,0,0.75)_100%)]"
        />

        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
          <Link href="/" className="flex w-fit items-center gap-2.5">
            <Image
              src="/logo_mark.png"
              alt=""
              width={31}
              height={36}
              className="h-9 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]"
            />
            {/* Wordmark là chữ một màu xanh rất tối → đảo thành trắng, cùng
                cách site-header làm trên nền ảnh. */}
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              className="h-4 w-auto brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]"
            />
          </Link>

          <div className="max-w-md">
            {/* Câu này là MÔ TẢ SẢN PHẨM, không phải lời có cánh. Bản trước là
                "Mỗi vùng đất là một câu chuyện. Bắt đầu hành trình khám phá Việt
                Nam của bạn." — đúng với mọi trang du lịch từng tồn tại, nên
                không nói gì về trang này. */}
            <p className="text-balance font-[family-name:var(--font-display)] text-2xl font-bold leading-snug tracking-tight [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]">
              Ăn gì, chơi gì, ở đâu, đi lại thế nào — gom sẵn cho từng điểm đến.
            </p>
            {place && (
              <Link
                href={`/diem-den/${place.slug}`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-colors hover:bg-black/55"
              >
                <MapPin className="size-3.5" aria-hidden />
                {place.name}
                {place.parent?.name && (
                  <span className="text-white/60">· {place.parent.name}</span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── CỘT FORM ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-14 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Logo CHỈ hiện dưới lg: từ lg nó đã nằm trên cột ảnh bên trái, in
              thêm ở đây là hai logo trong một màn hình. Dưới lg thì không có cột
              ảnh nào, mà một trang đăng nhập không mang tên mình thì trông hệt
              trang lừa đảo — thứ mà chính site này đang dạy người dùng đề phòng. */}
          <Link href="/" className="mb-8 flex w-fit items-center gap-2.5 lg:hidden">
            <Image
              src="/logo_mark.png"
              alt=""
              width={31}
              height={36}
              className="h-8 w-auto"
            />
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              className="h-3.5 w-auto"
            />
          </Link>

          {/* Lối về trang chủ — ở khổ hẹp không có cột ảnh nên đây là đường ra
              DUY NHẤT. Từ lg logo bên trái đã làm việc đó, nhưng giữ lại vẫn
              đúng: người vào thẳng /login bằng link cần một chỗ để thoát. */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft
              className="size-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden
            />
            Về trang chủ
          </Link>

          <h1 className="mt-8 font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold leading-tight tracking-[-0.035em]">
            Đăng nhập
          </h1>
          {/* Nói THỨ TÀI KHOẢN MỞ RA, không phải một câu mời chung chung. Ba việc
              dưới đây đều đã có thật trong sản phẩm (đánh dấu đã đến, đánh giá,
              thông báo) — đừng thêm thứ chưa làm vào đây. */}
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Đánh dấu nơi đã đến, viết đánh giá và theo dõi thông báo. Không cần
            mật khẩu.
          </p>

          <div className="mt-8 space-y-3">
            <form action={signInGoogle.bind(null, redirectTo)}>
              <ProviderButton icon={<GoogleIcon />} label="Tiếp tục với Google" />
            </form>
            <form action={signInFacebook.bind(null, redirectTo)}>
              <ProviderButton
                icon={<FacebookIcon />}
                label="Tiếp tục với Facebook"
              />
            </form>
          </div>

          {/* Điều khoản và Bảo mật giờ là LINK THẬT. Bản trước in tên hai văn
              bản ra như chữ thường trong khi `/dieu-khoan` và `/bao-mat` đều tồn
              tại — bắt người dùng đồng ý với thứ họ không mở ra đọc được. */}
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Khi tiếp tục, bạn đồng ý với{" "}
            <Link
              href="/dieu-khoan"
              className="text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
            >
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link
              href="/bao-mat"
              className="text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
            >
              Chính sách bảo mật
            </Link>
            .
          </p>

          {IS_DEV && (
            /* Khối này CỐ Ý lệch khỏi bảng màu của site (vàng hổ phách, viền nét
               đứt): nó chỉ tồn tại ở môi trường phát triển, nên phải nhìn là
               biết ngay không phải giao diện thật. Dùng token `warm` của theme ở
               đây lại thành ra giống một khối UI chính thức. */
            <div className="mt-8 space-y-3 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5">DEV</span>
                Đăng nhập nhanh (chỉ môi trường phát triển)
              </p>

              {devUsers.length > 0 && (
                <div className="space-y-1.5">
                  {devUsers.map((u) => (
                    <form key={u.email} action={signInDev.bind(null, redirectTo)}>
                      <input type="hidden" name="email" value={u.email ?? ""} />
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm transition-colors hover:border-amber-500/50 hover:bg-amber-500/5"
                      >
                        <span className="font-medium">{u.name ?? "—"}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              )}

              <form
                action={signInDev.bind(null, redirectTo)}
                className="flex gap-2"
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email bất kỳ trong DB…"
                  className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-lg border border-border/60 px-4 text-sm font-medium transition-colors hover:border-amber-500/50 hover:bg-amber-500/5"
                >
                  Vào
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Nút nhà cung cấp. Không dùng `Button` của shadcn ở đây: hai nút này là hai
// hàng ngang nhau, cần cùng chiều cao 48px và icon canh TRÁI cố định để hai
// dòng chữ thẳng hàng nhau — `Button` canh giữa cả cụm icon + chữ, nên logo
// Google và logo Facebook lệch nhau theo độ dài nhãn.
function ProviderButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="submit"
      className="flex h-12 w-full items-center gap-3 rounded-full border border-border bg-card px-5 text-[0.95rem] font-medium transition-colors hover:border-foreground/25 hover:bg-muted/60"
    >
      <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1 text-left">{label}</span>
    </button>
  );
}
