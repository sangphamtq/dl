"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";

export function SectionTabs({
  labels,
  idPrefix,
  ariaLabel,
  resetKey,
  shapeClassName = R_CTRL,
  indicator = "pill",
  tabClassName,
}: {
  labels: string[];
  idPrefix: string;
  ariaLabel: string;
  resetKey?: string;
  shapeClassName?: string;
  indicator?: "pill" | "underline" | "solid";
  tabClassName?: string;
}) {
  const [active, setActive] = useState(0);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const locked = useRef<number | null>(null);

  const count = labels.length;

  useEffect(() => {
    const els = Array.from({ length: count }, (_, i) =>
      document.getElementById(`${idPrefix}-${i}`),
    ).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const measure = () => {
      const line = window.innerHeight * 0.3;
      let a = 0;
      els.forEach((el) => {
        if (el.getBoundingClientRect().top <= line)
          a = Number(el.id.slice(idPrefix.length + 1));
      });
      return a;
    };

    let ready = false;
    const raf = requestAnimationFrame(() => {
      setActive(measure());
      ready = true;
    });

    const obs = new IntersectionObserver(
      (entries) => {
        if (!ready) return;
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!vis[0]) return;
        const top = Number(vis[0].target.id.slice(idPrefix.length + 1));
        if (locked.current !== null) {
          if (top === locked.current) locked.current = null;
          else return;
        }
        setActive(top);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    const onScrollEnd = () => {
      locked.current = null;
    };
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, [count, idPrefix, resetKey]);

  useEffect(() => {
    const nav = navRef.current;
    const el = tabRefs.current[active];
    if (!nav || !el || active < 0) {
      setPill(null);
      return;
    }
    const m = () => setPill({ x: el.offsetLeft, w: el.offsetWidth });
    m();
    const ro = new ResizeObserver(m);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active, count]);

  if (count <= 1) return null;

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className="relative flex shrink-0 items-center"
    >
      {pill && (
        <span
          aria-hidden
          style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
          className={cn(
            "pointer-events-none absolute left-0 transition-all duration-300 ease-out motion-reduce:transition-none",
            indicator === "underline"
              ? "bottom-0 h-[1.5px] bg-foreground"
              : indicator === "solid"
                ? cn("inset-y-0 bg-foreground", shapeClassName)
                : cn("inset-y-1 bg-primary/10", shapeClassName),
          )}
        />
      )}
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          aria-current={active === i ? "true" : undefined}
          onClick={() => {
            setActive(i);
            locked.current = i;
            document
              .getElementById(`${idPrefix}-${i}`)
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className={cn(
            "relative h-9 shrink-0 whitespace-nowrap px-1.5 text-sm font-medium transition-colors sm:px-3.5",
            indicator === "underline" ? null : shapeClassName,
            tabClassName,
            active === i
              ? indicator === "underline"
                ? "text-foreground"
                : indicator === "solid"
                  ? "text-background"
                  : "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
