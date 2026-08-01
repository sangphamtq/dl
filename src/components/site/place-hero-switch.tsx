"use client";

import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Mode = "classic" | "bento";
const KEY = "place-hero-mode";
const EVT = "place-hero-mode-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVT, cb);
  };
}
function getSnapshot(): Mode {
  return localStorage.getItem(KEY) === "classic" ? "classic" : "bento";
}
function getServerSnapshot(): Mode {
  return "bento";
}

// Chuyển đổi kiểu hero: "2 cột" (PlaceHero) ↔ "Bento" (PlaceHeroExplore). Nhận cả
// hai hero (render ở server) làm slot; nhớ lựa chọn qua localStorage (đọc bằng
// useSyncExternalStore để tránh hydration mismatch, cập nhật ngay trong tab).
export function PlaceHeroSwitch({
  classic,
  bento,
}: {
  classic: React.ReactNode;
  bento: React.ReactNode;
}) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pick = useCallback((m: Mode) => {
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* localStorage không khả dụng — bỏ qua */
    }
    window.dispatchEvent(new Event(EVT));
  }, []);

  const btn = "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";

  return (
    <>
      {mode === "classic" ? classic : bento}

      {/* Toggle nổi góc dưới-phải */}
      <div
        role="group"
        aria-label="Kiểu hiển thị hero"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1 shadow-lg shadow-black/10 backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={() => pick("classic")}
          aria-pressed={mode === "classic"}
          className={cn(
            btn,
            mode === "classic"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          2 cột
        </button>
        <button
          type="button"
          onClick={() => pick("bento")}
          aria-pressed={mode === "bento"}
          className={cn(
            btn,
            mode === "bento"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Bento
        </button>
      </div>
    </>
  );
}
