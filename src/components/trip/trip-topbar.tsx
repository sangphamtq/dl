"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";
import { updateTrip } from "@/app/(site)/lich-trinh/actions";
import { MICRO } from "@/components/trip/trip-rail";
import { TripShare } from "@/components/trip/trip-share";
import { TripSectionSheet } from "@/components/trip/trip-side-nav";
import { Switch } from "@/components/ui/switch";
import type { TripPerson } from "@/lib/trip";

export type TripChrome = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
  autoTravel?: boolean;
  shareId: string | null;
  visibility: "private" | "unlisted";
  isOwner: boolean;
  people: TripPerson[];
};

export function TripTopbar({
  trip,
  facts,
}: {
  trip: TripChrome;
  facts?: string[];
}) {
  const [pending, start] = useTransition();
  // Bật/tắt phản hồi NGAY, không chờ server dựng lại cả lịch (có thể vài giây vì OSRM).
  const [travel, setTravel] = useState(trip.autoTravel ?? true);
  const [travelFor, setTravelFor] = useState(trip.autoTravel);
  if (trip.autoTravel !== travelFor) {
    setTravelFor(trip.autoTravel);
    setTravel(trip.autoTravel ?? true);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  return (
    <header className="border-b border-border/60 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Link
            href="/lich-trinh/cua-toi"
            className={cn(
              MICRO,
              "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            <Glyph name="back" className="size-3.5" />
            Lịch trình của tôi
          </Link>

          <div className="flex items-center gap-2.5">
            <TripSectionSheet tripId={trip.id} />
            <TripShare
              tripId={trip.id}
              title={trip.title}
              shareId={trip.shareId}
              shared={trip.visibility === "unlisted"}
              isOwner={trip.isOwner}
              people={trip.people}
            />
          </div>
      </div>

        <div className="mt-2.5 max-w-3xl">
          <TitleField
            value={trip.title}
            onSave={(title) => run(() => updateTrip(trip.id, { title }))}
          />
        </div>

        {/* Ngăn các mẩu bằng KHOẢNG TRẮNG, không bằng nét dọc: hai ô đầu là ô
            nhập, nét dọc đứng cạnh chúng đọc ra như viền của ô. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <Glyph name="calendar" className="size-4 shrink-0" />
            <input
              type="date"
              defaultValue={trip.startDate ?? ""}
              onChange={(e) =>
                run(() => updateTrip(trip.id, { startDate: e.target.value || null }))
              }
              aria-label="Ngày khởi hành"
              className={cn(
                R_CTRL,
                "bg-transparent text-sm tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </label>
          <label className="flex items-center gap-1.5">
            <Glyph name="people" className="size-4 shrink-0" />
            <input
              type="number"
              min={1}
              max={99}
              defaultValue={trip.partySize ?? ""}
              placeholder="Số người"
              onBlur={(e) =>
                run(() =>
                  updateTrip(trip.id, {
                    partySize: e.target.value ? Number(e.target.value) : null,
                  }),
                )
              }
              aria-label="Số người"
              className={cn(
                R_CTRL,
                "w-[5.5rem] bg-transparent text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </label>
          {trip.autoTravel !== undefined && (
            <label
              className="flex cursor-pointer items-center gap-2"
              title="Tự ước tính thời gian và quãng đường lái giữa các điểm, rồi cộng vào giờ. Áp dụng cho cả chuyến."
            >
              <Glyph name="car" className="size-4 shrink-0" />
              <span className="text-foreground">Tự tính đường đi</span>
              <Switch
                checked={travel}
                onCheckedChange={(on) => {
                  setTravel(on);
                  run(async () => {
                    const res = await updateTrip(trip.id, { autoTravel: on });
                    if (!res.ok) setTravel(!on);
                    else
                      toast(
                        on
                          ? "Đã bật: giờ đến đã cộng thời gian di chuyển."
                          : "Đã tắt: giờ đến nối thẳng giờ rời điểm trước.",
                      );
                    return res;
                  });
                }}
                aria-label="Tự tính thời gian và quãng đường giữa các điểm"
              />
            </label>
          )}
          {facts?.map((f) => (
            <span key={f} className={cn(MICRO, "text-muted-foreground")}>
              <span className="tabular-nums text-foreground">{f.split(" ")[0]}</span>{" "}
              {f.split(" ").slice(1).join(" ")}
            </span>
          ))}
        </div>
      <span className="sr-only" aria-live="polite">
        {pending ? "Đang lưu" : ""}
      </span>
    </header>
  );
}

function TitleField({
  value,
  onSave,
}: {
  value: string;
  onSave: (title: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next && next !== value) onSave(next);
        else setDraft(value);
      }}
      aria-label="Tên lịch trình"
      className={cn(
        R_CTRL,
        "w-full bg-transparent font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.4vw,2.25rem)] font-normal leading-[1.15] tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    />
  );
}
