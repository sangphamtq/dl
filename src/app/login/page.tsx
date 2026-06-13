import Image from "next/image";
import Link from "next/link";
import { Compass } from "lucide-react";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

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
            <Compass className="size-5" aria-hidden />
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
              <Compass className="size-5 text-primary" aria-hidden />
              <span>Hành Trình Việt</span>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">Đăng nhập</h1>
            <p className="text-muted-foreground">
              Tiếp tục để lưu điểm đến yêu thích và khám phá Việt Nam.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
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

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo
            mật của chúng tôi.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.26 6.62l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
