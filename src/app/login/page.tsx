import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GoogleIcon } from "@/components/site/provider-icons";
import { TOUCH_INPUT } from "@/lib/touch";
import { cn } from "@/lib/utils";
import { LOGIN_VALUES as VALUES, PROVIDER_BTN } from "@/lib/auth-ui";
import { signInGoogle, signInDev } from "./auth-actions";

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Trang đăng nhập — hai nửa: ẢNH THẬT của một điểm đến trên site (ghi rõ đó là đâu) | khối đăng nhập gọn.
 * ⚠️ KHÔNG dùng ảnh picsum / câu trích dẫn chung chung: ảnh lấy từ `Image` của một `Place` đã xuất bản, chú thích bằng tên
 * nơi đó — ảnh nói thật về sản phẩm. Ba dòng giá trị là việc SITE LÀM ĐƯỢC, không phải khẩu hiệu.
 */


export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/";

  const [cover, devUsers] = await Promise.all([
    prisma.image.findFirst({
      where: { kind: "gallery", isCover: true, place: { status: "published" } },
      orderBy: [{ place: { isFeatured: "desc" } }, { place: { order: "asc" } }],
      select: { url: true, place: { select: { name: true, parent: { select: { name: true } } } } },
    }),
    IS_DEV
      ? prisma.user.findMany({
          where: { saleProfile: { isNot: null } },
          select: { name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="grid min-h-svh flex-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ẢNH — chỉ từ lg. Nền tối vẽ sẵn để chữ trắng vẫn đọc được khi chưa có ảnh nào. */}
      <section className="relative hidden overflow-hidden bg-[#0b1a12] lg:block">
        {cover && (
          <Image src={cover.url} alt="" fill priority sizes="50vw" className="object-cover" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/35" />

        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="flex w-fit items-center gap-2.5">
            <Image src="/logo_mark.png" alt="" width={31} height={36} priority className="h-10 w-auto" />
            <Image
              src="/logo_wordmark.png"
              alt="Halivivu"
              width={77}
              height={16}
              priority
              className="h-4 w-auto brightness-0 invert"
            />
          </Link>

          <div className="max-w-md text-white">
            <p className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-[1.15] tracking-tight xl:text-[2.5rem]">
              Lưu nơi muốn đến.
              <br />
              Xếp thành chuyến đi.
            </p>
            <ul className="mt-8 space-y-3.5">
              {VALUES.map(([title, desc]) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-white/60" />
                  <p className="text-[0.9375rem] leading-snug">
                    <span className="font-semibold">{title}</span>
                    <span className="text-white/70">, {desc}</span>
                  </p>
                </li>
              ))}
            </ul>
            {cover?.place && (
              <p className="mt-10 text-xs text-white/60">
                Ảnh: {cover.place.name}
                {cover.place.parent ? `, ${cover.place.parent.name}` : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* KHỐI ĐĂNG NHẬP */}
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="flex w-fit items-center gap-2 lg:hidden">
          <Image src="/logo_mark.png" alt="" width={31} height={36} className="h-9 w-auto" />
          <Image src="/logo_wordmark.png" alt="Halivivu" width={77} height={16} className="h-3.5 w-auto" />
        </Link>

        <div className="mx-auto flex w-full max-w-[22rem] flex-1 flex-col justify-center py-12">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-tight tracking-tight">
            Đăng nhập
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Một tài khoản cho lịch trình, nơi đã đến và đánh giá của bạn. Chưa có thì tự tạo khi đăng nhập lần đầu.
          </p>

          <div className="mt-8">
            <form action={signInGoogle.bind(null, redirectTo)}>
              <button type="submit" className={PROVIDER_BTN}>
                <GoogleIcon />
                Tiếp tục với Google
              </button>
            </form>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Tiếp tục nghĩa là bạn đồng ý với{" "}
            <Link href="/dieu-khoan" className="text-foreground underline-offset-2 hover:underline">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/bao-mat" className="text-foreground underline-offset-2 hover:underline">
              Chính sách bảo mật
            </Link>
            . Chúng tôi không đăng gì lên tài khoản của bạn.
          </p>

          {IS_DEV && (
            <div className="mt-10 rounded-[10px] border border-dashed border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">
                <span className="mr-1.5 rounded-[4px] bg-foreground/[0.06] px-1.5 py-0.5 font-semibold text-foreground">
                  DEV
                </span>
                Đăng nhập nhanh, chỉ có ở môi trường phát triển
              </p>

              {devUsers.length > 0 && (
                <div className="mt-3 space-y-1">
                  {devUsers.map((u) => (
                    <form key={u.email} action={signInDev.bind(null, redirectTo)}>
                      <input type="hidden" name="email" value={u.email ?? ""} />
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between gap-3 rounded-[6px] px-2.5 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.05]"
                      >
                        <span className="font-medium">{u.name ?? "—"}</span>
                        <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                      </button>
                    </form>
                  ))}
                </div>
              )}

              <form action={signInDev.bind(null, redirectTo)} className="mt-3 flex gap-2">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email bất kỳ trong DB…"
                  className={cn(
                    "h-9 w-full min-w-0 rounded-[6px] border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30",
                    TOUCH_INPUT,
                  )}
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-[6px] border border-border px-3 text-sm font-medium transition-colors hover:bg-foreground/[0.04]"
                >
                  Vào
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
