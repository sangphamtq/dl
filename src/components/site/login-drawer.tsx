"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "@/components/icons";
import { GoogleIcon } from "@/components/site/provider-icons";
import { signInGoogle } from "@/app/login/auth-actions";
import { PROVIDER_BTN } from "@/lib/auth-ui";
import { NavIcon } from "./nav-icons";
import { Glyph } from "./glyphs";
import { getLoginPhotos, type LoginPhoto } from "./login-photos-action";

/**
 * Hộp đăng nhập — mở từ nút "Đăng nhập" trên header / menu điện thoại và giữa chừng (Thêm vào lịch trình, Đã đến, viết đánh
 * giá…). Từ `md`: HAI CỘT — MỘT ảnh thật kèm ba tính năng (icon + tên + một câu) ở đáy ảnh | khối đăng nhập GỌN (không lặp
 * tính năng). Đã thử và BỎ: tấm lịch trình mẫu nổi trên ảnh · khảm 5 ảnh. Dưới `md`: trượt từ ĐÁY, dải ảnh mỏng trên đầu. Cùng ngôn ngữ với `/login` và hộp tìm kiếm (nền sau
 * mờ, bo 16px, nút × đóng). Tên giữ `LoginDrawer` vì nhiều chỗ đang dùng.
 */
// Ảnh có sẵn trong `public/` — hiện ngay, trước khi ảnh từ CSDL về (và là phương án khi CSDL chưa có ảnh nào).
const FALLBACK: LoginPhoto = { url: "/ta_xua_2.jpg", label: "Tà Xùa, Sơn La" };

const ICON = "size-5";
const FEATURES = [
  {
    icon: <NavIcon name="route" active={false} className={ICON} />,
    title: "Lên lịch trình có giờ ước tính",
    desc: "Biết trước quán nào chưa mở lúc bạn tới.",
  },
  {
    icon: <NavIcon name="checkin" active={false} className={ICON} />,
    title: "Đánh dấu nơi đã đến",
    desc: "Thành tấm bản đồ 34 tỉnh của riêng bạn.",
  },
  {
    icon: <Glyph name="shield" className={ICON} />,
    title: "Liên hệ chỗ ở đã xác minh",
    desc: "Đúng chủ, đúng kênh, tránh page nhái và lừa cọc.",
  },
];

export function LoginDrawer({
  open,
  onOpenChange,
  redirectTo,
  title = "Đăng nhập Halivivu",
  description = "Một tài khoản cho lịch trình, nơi đã đến và đánh giá của bạn.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo: string;
  title?: string;
  description?: string;
}) {
  const [photo, setPhoto] = useState<LoginPhoto>(FALLBACK);
  const asked = useRef(false);
  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    getLoginPhotos(1)
      .then((p) => {
        if (p[0]) setPhoto(p[0]);
      })
      .catch(() => {});
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92svh] overflow-y-auto rounded-t-[16px] bg-background shadow-[0_-16px_48px_-16px_rgb(0_0_0/0.35)] outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:grid md:max-h-none md:w-[min(56rem,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:overflow-hidden md:rounded-[16px] md:shadow-[0_32px_80px_-24px_rgb(0_0_0/0.5)] md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 dark:md:ring-1 dark:md:ring-white/10">
          {/* ẢNH — dải mỏng trên điện thoại, cột trái từ md. Nền tối vẽ sẵn để chữ trắng đọc được khi ảnh chưa tải. */}
          {/* MỘT ảnh thật (dải mỏng dưới md). Từ md: ba điều tài khoản mở ra nằm TRÊN ảnh, ở đáy — mỗi dòng một icon nét trắng,
              tên đậm + một câu; không ô màu, không thẻ kính. Tên nơi trong ảnh ở góc trên. */}
          <div className="relative h-28 overflow-hidden bg-[#0b1a12] md:h-auto md:min-h-[34rem]">
            <Image src={photo.url} alt="" fill sizes="(min-width: 768px) 28rem, 100vw" className="object-cover" />
            <span aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/70 md:hidden" />
            <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-t from-black/85 via-black/30 to-black/10 md:block" />
            <p className="absolute left-7 top-6 hidden rounded-[6px] bg-black/30 px-2 py-1 text-xs font-medium text-white/90 backdrop-blur-sm md:block">
              {photo.label}
            </p>
            <div className="absolute inset-x-0 bottom-0 hidden p-8 text-white md:block">
              <p className="font-[family-name:var(--font-display)] text-[1.625rem] font-semibold leading-[1.15] tracking-tight">
                Có tài khoản, bạn được
              </p>
              <ul className="mt-6 space-y-4">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex gap-3.5">
                    <span className="mt-0.5 shrink-0 text-white">{f.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-semibold leading-snug">{f.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-white/70">{f.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* KHỐI ĐĂNG NHẬP */}
          <div className="relative flex flex-col px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-6 md:justify-center md:p-10">
            <DialogPrimitive.Close
              aria-label="Đóng"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-[10px] bg-foreground/[0.05] text-foreground/70 transition-colors hover:bg-foreground/[0.1] hover:text-foreground"
            >
              <XIcon className="size-[1.125rem]" />
            </DialogPrimitive.Close>

            <Image src="/logo_mark.png" alt="" width={31} height={36} className="hidden h-11 w-auto self-start md:block" />

            <DialogPrimitive.Title className="text-balance pr-10 font-[family-name:var(--font-display)] text-[1.625rem] font-semibold leading-tight tracking-tight md:mt-5 md:text-[2rem]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {description}
            </DialogPrimitive.Description>

            <form action={signInGoogle.bind(null, redirectTo)} className="mt-7">
              <button type="submit" className={PROVIDER_BTN}>
                <GoogleIcon />
                Tiếp tục với Google
              </button>
            </form>

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Lần đầu đăng nhập là tự tạo tài khoản, không cần mật khẩu. Tiếp tục nghĩa là bạn đồng ý với{" "}
              <Link href="/dieu-khoan" className="text-foreground underline-offset-2 hover:underline">
                Điều khoản
              </Link>{" "}
              và{" "}
              <Link href="/bao-mat" className="text-foreground underline-offset-2 hover:underline">
                Chính sách bảo mật
              </Link>
              .
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
