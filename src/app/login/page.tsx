import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { GoogleIcon, FacebookIcon } from "@/components/site/provider-icons";
import { signInGoogle, signInFacebook, signInDev } from "./auth-actions";

const IS_DEV = process.env.NODE_ENV !== "production";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/";

  // Chỉ ở dev: gợi ý các tài khoản CTV đã seed để đăng nhập nhanh 1 chạm.
  const devUsers = IS_DEV
    ? await prisma.user.findMany({
        where: { saleProfile: { isNot: null } },
        select: { name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      {/* Image panel — ảnh làm chủ */}
      <div className="relative hidden lg:block">
        <Image
          src="https://picsum.photos/seed/vietnam-travel-login/1400/1800"
          alt="Phong cảnh núi non Việt Nam"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/40" />
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/icon-192.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
            <span className="tracking-tight">Halivivu</span>
          </Link>
          <blockquote className="max-w-md space-y-3">
            <p className="text-2xl font-medium leading-relaxed tracking-tight">
              Mỗi vùng đất là một câu chuyện. Bắt đầu hành trình khám phá Việt
              Nam của bạn.
            </p>
            <footer className="text-sm text-white/70">
              Ăn gì · Chơi gì · Ở đâu · Đi lại thế nào
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight lg:hidden"
            >
              <Image
                src="/icon-192.png"
                alt=""
                width={24}
                height={24}
                className="size-6 rounded"
              />
              <span>Halivivu</span>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">Đăng nhập</h1>
            <p className="text-muted-foreground">
              Tiếp tục để lưu điểm đến yêu thích và khám phá Việt Nam.
            </p>
          </div>

          <div className="space-y-3">
            <form action={signInGoogle.bind(null, redirectTo)}>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full"
              >
                <GoogleIcon />
                Tiếp tục với Google
              </Button>
            </form>

            <form action={signInFacebook.bind(null, redirectTo)}>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full"
              >
                <FacebookIcon />
                Tiếp tục với Facebook
              </Button>
            </form>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo
            mật của chúng tôi.
          </p>

          {IS_DEV && (
            <div className="space-y-3 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-500">
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5">DEV</span>
                Đăng nhập nhanh (chỉ môi trường phát triển)
              </p>

              {devUsers.length > 0 && (
                <div className="space-y-1.5">
                  {devUsers.map((u) => (
                    <form
                      key={u.email}
                      action={signInDev.bind(null, redirectTo)}
                    >
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
                <Button type="submit" size="sm" variant="outline">
                  Vào
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
