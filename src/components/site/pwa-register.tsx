"use client";

import { useEffect } from "react";
import { toast } from "sonner";

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
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

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
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(next);
            }
          });
        });
      } catch {
        // Không đăng ký được (trình duyệt chặn, không HTTPS…) — site vẫn chạy bình thường.
      }
    };

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
