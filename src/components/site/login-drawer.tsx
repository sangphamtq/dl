"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GoogleIcon, FacebookIcon } from "@/components/site/provider-icons";
import { signInGoogle, signInFacebook } from "@/app/login/auth-actions";

// Login drawer (auth-gate) — mở tại chỗ khi người dùng ẩn danh thực hiện hành
// động cần đăng nhập (vd đánh dấu "đã đến"). Controlled qua open/onOpenChange.
// redirectTo: quay lại đúng trang hiện tại sau khi đăng nhập.
export function LoginDrawer({
  open,
  onOpenChange,
  redirectTo,
  title = "Đăng nhập để tiếp tục",
  description = "Đăng nhập để lưu hành trình và đánh dấu nơi bạn đã đến.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo: string;
  title?: string;
  description?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-md rounded-t-3xl pb-8"
      >
        <SheetHeader className="items-center text-center">
          <SheetTitle className="text-xl tracking-tight">{title}</SheetTitle>
          <SheetDescription className="max-w-xs leading-relaxed">
            {description}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4">
          <form action={signInGoogle.bind(null, redirectTo)}>
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <GoogleIcon />
              Tiếp tục với Google
            </Button>
          </form>

          <form action={signInFacebook.bind(null, redirectTo)}>
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <FacebookIcon />
              Tiếp tục với Facebook
            </Button>
          </form>

          <p className="pt-1 text-center text-xs leading-relaxed text-muted-foreground">
            Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật
            của chúng tôi.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
