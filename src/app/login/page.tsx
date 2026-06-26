import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoogleIcon, FacebookIcon } from "@/components/site/provider-icons";
import { signInGoogle, signInFacebook } from "./auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/";

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
            <span className="tracking-tight">Hành Trình Việt</span>
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
              <span>Hành Trình Việt</span>
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
        </div>
      </div>
    </main>
  );
}
