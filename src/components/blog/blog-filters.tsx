"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, RotateCcw, Search } from "@/components/icons";
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
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-foreground">
          Bộ lọc
        </h2>
        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
            <input
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              placeholder="Tìm điểm đến"
              className="h-9 w-full rounded-[4px] border border-border bg-transparent pl-9 pr-2 text-[0.8125rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
            />
          </div>
          <ul className="flex flex-col">
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
              className="mt-2 text-xs font-medium text-foreground underline underline-offset-4"
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
          <ul className="flex flex-col">
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
        <ul className="flex flex-col">
          {TIME_OPTIONS.map((t) => {
            const active = time === t.value;
            return (
              <li key={t.value}>
                <button
                  type="button"
                  onClick={() => setTime(t.value)}
                  className="flex w-full items-center gap-2.5 py-1.5 text-left text-sm"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-[3px] border",
                      active
                        ? "border-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {active && <span className="size-1.5 bg-foreground" />}
                  </span>
                  <span
                    className={cn(
                      active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
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
    <div className="mt-5 border-t border-border pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
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
      {open && <div className="mt-3">{children}</div>}
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
        className="flex w-full items-center gap-2.5 py-1.5 text-left text-sm"
      >
        <span
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-[3px] border transition-colors",
            checked
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground/40",
          )}
        >
          {checked && <Check className="size-3" aria-hidden />}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            checked
              ? "font-medium text-foreground"
              : "text-muted-foreground",
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
