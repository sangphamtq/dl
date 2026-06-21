"use client";

import { Fragment, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronUp, X } from "lucide-react";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import type { PeerItem } from "@/lib/peers";

export type PeerGroup = { label?: string; items: PeerItem[] };

// Nội dung chính rộng tối đa 1280px (max-w-7xl). Rail trái rộng ~13rem → cần
// mỗi bên trống ≳ 232px mới đủ chỗ không đè nội dung; thiếu thì dùng dock dưới.
const CONTENT_MAX = 1280;
const RAIL_MIN_GUTTER = 188;

const KEY = "peerBarHidden";
const EVT = "peerbar-toggle";

function subToggle(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}
function subResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
function setHidden(v: boolean) {
  localStorage.setItem(KEY, v ? "1" : "0");
  window.dispatchEvent(new Event(EVT));
}
function getMode(): "rail" | "dock" {
  if (typeof window === "undefined") return "dock";
  return (window.innerWidth - CONTENT_MAX) / 2 >= RAIL_MIN_GUTTER
    ? "rail"
    : "dock";
}

// Thanh chuyển nhanh giữa các mục ngang cấp.
// - Gutter đủ rộng: panel DỌC nép trái, trong khoảng trống (không đè nội dung).
// - Hẹp: dock NGANG dưới đáy. Nút ẩn/mở ở góc.
export function PeerBar({
  groups,
  currentSlug,
  prefix,
  title,
}: {
  groups: PeerGroup[];
  currentSlug: string;
  prefix: string;
  title?: string;
}) {
  const hidden = useSyncExternalStore(
    subToggle,
    () => (typeof window !== "undefined" ? localStorage.getItem(KEY) === "1" : false),
    () => false,
  );
  const mode = useSyncExternalStore(subResize, getMode, () => "dock");
  const railRef = useRef<HTMLAnchorElement>(null);
  const dockRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (hidden) return;
    railRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    dockRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [hidden, mode]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total <= 1) return null;

  // ── Đã ẩn → nút mở lại ở góc ─────────────────────────────────────
  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        aria-label="Hiện thanh chuyển nhanh"
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 py-2 pl-3 pr-4 text-sm font-medium shadow-lg shadow-black/10 backdrop-blur-xl transition-colors hover:bg-muted"
      >
        <ChevronUp className="size-4 text-primary" aria-hidden />
        {title ?? "Chuyển nhanh"}
      </button>
    );
  }

  // ── Gutter đủ: panel dọc nép trái ────────────────────────────────
  if (mode === "rail") {
    return (
      <div className="fixed left-3 top-36 z-40 flex max-h-[calc(100vh-10rem)] w-40 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/80 shadow-lg shadow-black/5 ring-1 ring-black/[0.02] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1 px-2.5 pb-1 pt-2">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title ?? "Chuyển nhanh"}
          </span>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Ẩn thanh chuyển nhanh"
            className="-mr-0.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-px overflow-y-auto px-1 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((g, gi) => (
            <Fragment key={g.label ?? gi}>
              {g.label && (
                <span className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {g.label}
                </span>
              )}
              {g.items.map((it) => {
                const active = it.slug === currentSlug;
                return (
                  <Link
                    key={it.slug}
                    ref={active ? railRef : undefined}
                    href={`/${prefix}/${it.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full transition-colors",
                        active
                          ? "bg-primary"
                          : "bg-border group-hover:bg-muted-foreground/50",
                      )}
                    />
                    <span className="truncate">{it.name}</span>
                  </Link>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  // ── Hẹp: dock ngang dưới đáy ─────────────────────────────────────
  return (
    <>
      <div aria-hidden className="h-20" />
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-2xl border border-border/60 bg-background/80 p-1.5 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g, gi) => (
              <Fragment key={g.label ?? gi}>
                {g.label && (
                  <span className="ml-1.5 shrink-0 whitespace-nowrap pr-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:ml-0">
                    {g.label}
                  </span>
                )}
                {g.items.map((it) => {
                  const active = it.slug === currentSlug;
                  return (
                    <Link
                      key={it.slug}
                      ref={active ? dockRef : undefined}
                      href={`/${prefix}/${it.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-foreground/80 hover:bg-muted",
                      )}
                    >
                      <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={coverUrl(it.images, it.slug, 64, 64)}
                          alt=""
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </span>
                      <span className="max-w-[8rem] truncate text-sm font-medium">
                        {it.name}
                      </span>
                    </Link>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Ẩn thanh chuyển nhanh"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
