"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string; count: number };

const TIME_OPTIONS = [
  { value: "", label: "Tất cả thời gian" },
  { value: "tuan-nay", label: "Tuần này" },
  { value: "thang-nay", label: "Tháng này" },
  { value: "6-thang", label: "6 tháng gần đây" },
  { value: "nam-nay", label: "Năm nay" },
];

export function BlogFilters({
  destinations,
  topics,
  selectedDest,
  selectedTopics,
  time,
}: {
  destinations: FilterOption[];
  topics: FilterOption[];
  selectedDest: string[];
  selectedTopics: string[];
  time: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [destQuery, setDestQuery] = useState("");
  const [showAllDest, setShowAllDest] = useState(false);
  const [open, setOpen] = useState({ dest: true, topic: true, time: true });

  const navigate = (p: URLSearchParams) => {
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleCsv = (key: string, val: string) => {
    const p = new URLSearchParams(sp.toString());
    const cur = p.get(key)?.split(",").filter(Boolean) ?? [];
    const next = cur.includes(val)
      ? cur.filter((x) => x !== val)
      : [...cur, val];
    if (next.length) p.set(key, next.join(","));
    else p.delete(key);
    navigate(p);
  };

  const setTime = (val: string) => {
    const p = new URLSearchParams(sp.toString());
    if (val) p.set("time", val);
    else p.delete("time");
    navigate(p);
  };

  const clearAll = () => {
    const p = new URLSearchParams(sp.toString());
    ["dd", "tag", "time"].forEach((k) => p.delete(k));
    navigate(p);
  };

  const hasActive =
    selectedDest.length > 0 || selectedTopics.length > 0 || !!time;

  const filteredDest = destinations.filter((d) =>
    d.label.toLowerCase().includes(destQuery.trim().toLowerCase()),
  );
  const shownDest = showAllDest ? filteredDest : filteredDest.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Bộ lọc</h2>
        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <RotateCcw className="size-3" aria-hidden />
            Xóa lọc
          </button>
        )}
      </div>

      {/* Điểm đến */}
      {destinations.length > 0 && (
        <Section
          title="Điểm đến"
          open={open.dest}
          onToggle={() => setOpen((o) => ({ ...o, dest: !o.dest }))}
        >
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              placeholder="Tìm điểm đến"
              className="h-8 w-full rounded-lg border border-border/60 bg-background pl-8 pr-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <ul className="flex flex-col gap-0.5">
            {shownDest.map((d) => (
              <CheckRow
                key={d.value}
                label={d.label}
                count={d.count}
                checked={selectedDest.includes(d.value)}
                onClick={() => toggleCsv("dd", d.value)}
              />
            ))}
          </ul>
          {filteredDest.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllDest((v) => !v)}
              className="mt-1.5 text-xs font-medium text-primary hover:underline"
            >
              {showAllDest ? "Thu gọn" : "Xem thêm"}
            </button>
          )}
        </Section>
      )}

      {/* Chủ đề */}
      {topics.length > 0 && (
        <Section
          title="Chủ đề"
          open={open.topic}
          onToggle={() => setOpen((o) => ({ ...o, topic: !o.topic }))}
        >
          <ul className="flex flex-col gap-0.5">
            {topics.map((t) => (
              <CheckRow
                key={t.value}
                label={t.label}
                count={t.count}
                checked={selectedTopics.includes(t.value)}
                onClick={() => toggleCsv("tag", t.value)}
              />
            ))}
          </ul>
        </Section>
      )}

      {/* Khoảng thời gian */}
      <Section
        title="Khoảng thời gian"
        open={open.time}
        onToggle={() => setOpen((o) => ({ ...o, time: !o.time }))}
      >
        <ul className="flex flex-col gap-0.5">
          {TIME_OPTIONS.map((t) => {
            const active = time === t.value;
            return (
              <li key={t.value}>
                <button
                  type="button"
                  onClick={() => setTime(t.value)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border",
                      active ? "border-primary" : "border-border",
                    )}
                  >
                    {active && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span
                    className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}
                  >
                    {t.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        {title}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onClick,
}: {
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
      >
        <span
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded border transition-colors",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          {checked && <Check className="size-3" aria-hidden />}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            checked ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground/60">
          {count}
        </span>
      </button>
    </li>
  );
}
