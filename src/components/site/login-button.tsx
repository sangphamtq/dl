"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LoginDrawer } from "./login-drawer";

/**
 * Nút "Đăng nhập" mở HỘP đăng nhập tại chỗ (không chuyển sang `/login`) — đăng nhập xong quay về đúng trang đang xem.
 * `/login` vẫn còn cho link trực tiếp và cho chỗ chặn quyền (`proxy.ts`).
 */
export function LoginButton({ className, onOpen }: { className?: string; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        className={className}
      >
        Đăng nhập
      </button>
      <LoginDrawer open={open} onOpenChange={setOpen} redirectTo={pathname || "/"} />
    </>
  );
}
