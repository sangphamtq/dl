"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// Đăng ký service worker (/sw.js) — phần "app" của PWA: mở lại nhanh, còn xem
// được trang đã đọc khi mất sóng.
//
// CHỈ chạy ở production. Ở dev thì làm ngược lại: gỡ mọi service worker và xoá
// cache cũ, vì SW còn sót trên localhost sẽ trả bản build cũ và gây ra những lỗi
// "sửa code mà không thấy đổi" rất khó lần.
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => {});
      caches
        ?.keys()
        .then((ks) =>
          ks.filter((k) => k.startsWith("halivivu-")).forEach((k) => caches.delete(k)),
        )
        .catch(() => {});
      return;
    }

    let refreshing = false;
    const onControllerChange = () => {
      // SW mới đã tiếp quản → nạp lại một lần để trang chạy đúng bản mới.
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Có bản mới đang chờ → mời người dùng tải lại, không tự ý cắt ngang.
        const promptUpdate = (worker: ServiceWorker) => {
          toast("Đã có phiên bản mới", {
            description: "Tải lại để dùng bản mới nhất.",
            duration: 12000,
            action: {
              label: "Tải lại",
              onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
            },
          });
        };

        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            // `controller` tồn tại ⇒ đây là bản cập nhật, không phải lần cài đầu.
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(next);
            }
          });
        });
      } catch {
        // Không đăng ký được (trình duyệt chặn, không HTTPS…) — site vẫn chạy bình thường.
      }
    };

    // Đợi trang tải xong mới đăng ký để không tranh băng thông với nội dung.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
