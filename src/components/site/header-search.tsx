"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { searchSite, type SearchHit } from "./search-action";

export function HeaderSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce gọi tìm kiếm khi gõ (setState chỉ trong callback bất đồng bộ).
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchSite(term);
      if (id === reqId.current) {
        setHits(res);
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  function onChange(value: string) {
    setQ(value);
    if (!value.trim()) {
      setHits([]);
      setLoading(false);
    }
  }

  const showDropdown = open && q.trim().length > 0;

  return (
    <form
      action="/tim-kiem"
      className="group relative hidden lg:block"
      onFocusCapture={() => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
        setOpen(true);
      }}
      onBlurCapture={() => {
        blurTimer.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
        aria-hidden
      />
      <input
        name="q"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        placeholder="Tìm điểm đến, quán ăn…"
        className="h-9 w-56 rounded-md border border-transparent bg-muted/60 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background xl:w-64"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border bg-popover shadow-md">
          {hits.length > 0 ? (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {hits.map((h) => (
                <li key={h.href}>
                  <Link
                    href={h.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {h.label}
                    </span>
                    <span className="truncate">{h.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !loading && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                Không có gợi ý.
              </p>
            )
          )}
          <Link
            href={`/tim-kiem?q=${encodeURIComponent(q.trim())}`}
            onClick={() => setOpen(false)}
            className="block border-t px-3 py-2 text-sm font-medium text-primary hover:bg-accent"
          >
            Xem tất cả kết quả
          </Link>
        </div>
      )}
    </form>
  );
}
