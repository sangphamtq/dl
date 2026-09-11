"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "@/components/icons";
import { Ic } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SNOOZE_KEY = "halivivu:install-dismissed";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const DELAY_MS = 8000;
const HIDDEN_ON = ["/cms", "/sale", "/login", "/offline"];

const snoozed = () => {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY));
    return Boolean(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function InstallPrompt({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState<false | "native" | "ios">(false);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setReady(false);
      setDeferred(null);
      try {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()));
      } catch {}
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const t = setTimeout(() => setReady(isIos() ? "ios" : "native"), DELAY_MS);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setReady(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    setReady(false);
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {}
  };

  const hidden = HIDDEN_ON.some((p) => pathname.startsWith(p));
  if (hidden || !ready || (!deferred && ready !== "ios")) return null;

  return (
    <div
      role="dialog"
      aria-label={`Cài ${siteName} vào màn hình chính`}
      className={cn(
        "fixed inset-x-4 bottom-[calc(1rem+var(--bottom-nav-h))] z-40 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-lg shadow-black/10 backdrop-blur",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
        "sm:inset-x-auto sm:left-6 sm:w-[22rem]",
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-xl object-contain"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-semibold leading-snug">Cài {siteName} vào máy</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {deferred ? (
              "Mở nhanh như một ứng dụng, xem lại được cả khi mất sóng giữa đường."
            ) : (
              <>
                Bấm{" "}
                <Ic
                  icon="ios-share"
                  className="inline size-4 -translate-y-px align-middle"
                  aria-hidden
                />{" "}
                <span className="font-medium text-foreground">Chia sẻ</span> ở
                thanh dưới, rồi chọn{" "}
                <span className="font-medium text-foreground">
                  Thêm vào MH chính
                </span>
                .
              </>
            )}
          </p>
        </div>
      </div>

      {deferred && (
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" className="rounded-full" onClick={install}>
            <Download className="size-4" aria-hidden />
            Cài đặt
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={dismiss}
          >
            Để sau
          </Button>
        </div>
      )}
    </div>
  );
}
