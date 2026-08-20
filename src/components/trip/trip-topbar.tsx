"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays, Users } from "@/components/icons";
import { cn } from "@/lib/utils";
import { updateTrip } from "@/app/(site)/lich-trinh/actions";
import { MICRO } from "@/components/trip/trip-rail";
import { TripShare } from "@/components/trip/trip-share";
import { TripSectionSheet } from "@/components/trip/trip-side-nav";
import type { TripPerson } from "@/lib/trip";

export type TripChrome = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
  shareId: string | null;
  visibility: "private" | "unlisted";
  isOwner: boolean;
  people: TripPerson[];
};

// Thanh tiêu đề của MỘT lịch trình — dùng chung cho mục Lịch trình và mọi mục
// khác (ghi chú, đồ mang theo…). Tách khỏi trip-editor vì các mục kia không nạp
// ngày/mục nhưng vẫn phải có đúng thanh này; để mỗi trang tự dựng là chúng trôi
// khác nhau ngay lần sửa thứ hai.
//
// Trang soạn là chỗ LÀM VIỆC nên không dùng ảnh bìa như trang công khai. Nhưng
// cũng không dùng dải gradient xanh nhạt như bản trước — thứ đó không nói gì,
// chỉ tô màu. Ở đây phân cấp bằng CHỮ: nhãn micro, tên chuyến to, dữ kiện ngăn
// bằng vạch dọc mảnh.
export function TripTopbar({
  trip,
  facts,
}: {
  trip: TripChrome;
  /** Dữ kiện đếm được của mục đang mở (vd "3 ngày", "21 mục"). */
  facts?: string[];
}) {
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  return (
    <header className="border-b">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/lich-trinh/cua-toi"
          className={cn(MICRO, "text-muted-foreground transition-colors hover:text-foreground")}
        >
          ‹ Lịch trình của tôi
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          {/* min-w để cụm nút bên phải XUỐNG DÒNG ở khổ hẹp thay vì bóp tên
              chuyến. Tên là một <input> nên bị bóp thì nó cắt cụt giữa chữ, không
              có dấu ba chấm — nhìn như hỏng. */}
          <div className="min-w-[13rem] flex-1">
            <TitleField
              value={trip.title}
              onSave={(title) => run(() => updateTrip(trip.id, { title }))}
            />

            <div className="mt-3 flex flex-wrap items-center gap-y-2 text-sm text-muted-foreground">
              <label className="flex items-center gap-1.5 pr-4">
                <CalendarDays className="size-4 shrink-0" aria-hidden />
                <input
                  type="date"
                  defaultValue={trip.startDate ?? ""}
                  onChange={(e) =>
                    run(() => updateTrip(trip.id, { startDate: e.target.value || null }))
                  }
                  aria-label="Ngày khởi hành"
                  className="rounded-md bg-transparent text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="flex items-center gap-1.5 border-l border-border px-4">
                <Users className="size-4 shrink-0" aria-hidden />
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
                  className="w-[5.5rem] rounded-md bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              {facts?.map((f) => (
                <span key={f} className="border-l border-border px-4 tabular-nums">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Dưới `lg` menu các mục sống ở đây chứ không phải một dải riêng —
              xem trip-side-nav.tsx. */}
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
      className="w-full rounded-md bg-transparent text-2xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
    />
  );
}
