"use client";

import { Fragment, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2, MapPin, Plus } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DayView, ResolvedItem } from "@/lib/trip";
import { formatMinutes } from "@/lib/trip-time";
import { cloneTrip } from "@/app/(site)/lich-trinh/actions";
import { TripMap } from "@/components/trip/trip-map";
import { TripShell } from "@/components/trip/trip-shell";
import { TripDayStrip } from "@/components/trip/trip-day-strip";
import { TripFieldsMenu, useTripFields } from "@/components/trip/trip-fields";
import {
  DayHeading,
  MICRO,
  RailItem,
  RailLeg,
  Thumb,
  Warning,
} from "@/components/trip/trip-rail";

// Khung nhìn CHỈ ĐỌC của một lịch trình — dùng cho cả hai đích:
//   · /lich-trinh/s/[shareId]  — bản chia sẻ của người dùng
//   · /lich-trinh/[slug]       — lịch trình mẫu do biên tập soạn
// Khác trang soạn ở chỗ không có thao tác nào ngoài "Dùng lịch trình này".
export function TripView({
  trip,
  days,
  backlog,
}: {
  trip: {
    id: string;
    title: string;
    summary: string | null;
    placeName: string | null;
    placeSlug: string | null;
    isTemplate: boolean;
    coverImage: string | null;
  };
  days: DayView[];
  /** Mục chưa xếp ngày — với lịch trình mẫu đây là "gợi ý thêm nếu còn thời gian". */
  backlog: ResolvedItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");

  const fields = useTripFields();
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0] ?? null;
  const totalItems = days.reduce((s, d) => s + d.items.length, 0);

  function pickDay(id: string) {
    setActiveDayId(id);
    document.getElementById(`day-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clone() {
    start(async () => {
      const res = await cloneTrip(trip.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã lưu vào lịch trình của bạn");
      router.push(`/lich-trinh/cua-toi/${res.data.id}`);
    });
  }

  return (
    <TripShell
      header={
        // Trang công khai ⇒ ẢNH LÀM CHỦ, nguyên tắc số một của dự án. Bản trước
        // là một dải gradient xanh nhạt với chữ đen — thứ dán vào trang quản trị
        // nào cũng vừa — trong khi lịch trình này đã có sẵn ảnh bìa và một cái
        // tên xứng đáng được đặt to.
        <header className="relative isolate overflow-hidden">
          {trip.coverImage ? (
            <>
              <Image
                src={trip.coverImage}
                alt=""
                fill
                sizes="100vw"
                priority
                className="-z-10 object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/55 to-black/40"
              />
            </>
          ) : (
            <div aria-hidden className="absolute inset-0 -z-10 bg-primary" />
          )}

          <div className="px-4 pb-9 pt-12 sm:px-6 sm:pb-11 sm:pt-16 lg:px-8">
            <div className="max-w-3xl">
              <span className={cn(MICRO, "text-warm-bright")}>
                {trip.isTemplate ? "Lịch trình gợi ý" : "Lịch trình được chia sẻ"}
              </span>

              <h1 className="mt-2 text-balance font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
                {trip.title}
              </h1>

              {trip.summary && (
                <p className="mt-4 max-w-2xl text-balance leading-relaxed text-white/85 sm:text-lg">
                  {trip.summary}
                </p>
              )}

              {/* Dải dữ kiện ngăn bằng vạch DỌC mảnh — cùng khuôn với dải số
                  liệu ở hero điểm đến, không phải mấy viên badge xếp ngang. */}
              <div className="mt-6 flex flex-wrap items-center gap-y-3 text-white [text-shadow:0_0_12px_rgba(0,0,0,0.55)]">
                <Fact icon={CalendarDays} value={`${days.length} ngày`} first />
                <Fact value={`${totalItems} điểm dừng`} />
                {trip.placeName && trip.placeSlug && (
                  <Fact
                    icon={MapPin}
                    value={
                      <Link href={`/diem-den/${trip.placeSlug}`} className="hover:underline">
                        {trip.placeName}
                      </Link>
                    }
                  />
                )}
              </div>

              <Button
                onClick={clone}
                disabled={pending}
                className="mt-7 h-11 rounded-lg bg-warm px-6 text-base text-warm-foreground shadow-lg shadow-black/20 hover:bg-warm/90"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Dùng lịch trình này
              </Button>
            </div>
          </div>
        </header>
      }
      asideTitle="Gợi ý thêm"
      asideCount={backlog.length}
      aside={
        backlog.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Lịch trình này không kèm gợi ý nào ngoài các ngày.
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nhân bản lịch trình thì bạn nhận luôn.
            </p>
            {/* Danh sách ngăn bằng hairline, không phải một chồng thẻ có bóng. */}
            <ul className="mt-3 divide-y divide-border/60">
              {backlog.map((item) => (
                <li key={item.id} className="py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Thumb item={item} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug">
                        {item.href ? (
                          <Link href={item.href} className="hover:text-primary">
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </p>
                    </div>
                  </div>
                  {item.note && (
                    <p className="mt-1.5 text-xs italic leading-relaxed text-muted-foreground">
                      {item.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )
      }
      main={
        <>
          <div className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b bg-background/90 px-4 pt-2 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="min-w-0 flex-1">
              <TripDayStrip days={days} activeId={activeDay?.id ?? null} onPick={pickDay} />
            </div>
            <div className="shrink-0 pb-2">
              <TripFieldsMenu />
            </div>
          </div>

          <div className="mt-7">
            {days.map((day) => (
              <section
                key={day.id}
                id={`day-${day.id}`}
                onMouseDown={() => setActiveDayId(day.id)}
                // Ngày ngăn nhau bằng KHOẢNG TRỐNG + hairline, không phải thẻ.
                className="scroll-mt-28 border-t border-border/60 pt-9 first:border-t-0 first:pt-0 lg:scroll-mt-24"
              >
                <DayHeading
                  index={day.index}
                  title={day.title}
                  dateLabel={day.dateLabel}
                  span={
                    day.items.length > 0
                      ? `${formatMinutes(day.startMin)} – ${formatMinutes(day.endMin)}`
                      : null
                  }
                />

                {day.note && (
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {day.note}
                  </p>
                )}

                {day.warnings.map((w) => (
                  <Warning key={w.code} warning={w} />
                ))}

                {day.items.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Ngày trống.</p>
                ) : (
                  <ol className="mt-6">
                    {day.items.map((item, i) => (
                      <Fragment key={item.id}>
                        <RailItem item={item} index={i} fields={fields} />
                        {fields.leg && i < day.items.length - 1 && <RailLeg item={item} />}
                      </Fragment>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        </>
      }
      map={
        <TripMap
          key={activeDay?.id ?? "empty"}
          dayLabel={activeDay ? `Ngày ${activeDay.index + 1}` : ""}
          ghosts={backlog
            .filter((i) => i.lat != null && i.lng != null)
            .map((i) => ({ id: i.id, name: i.name, lat: i.lat as number, lng: i.lng as number }))}
          points={(activeDay?.items ?? [])
            .filter((i) => i.lat != null && i.lng != null)
            .map((i, idx) => ({
              id: i.id,
              order: idx + 1,
              name: i.name,
              kind: i.kind,
              lat: i.lat as number,
              lng: i.lng as number,
            }))}
        />
      }
    />
  );
}

/** Một dữ kiện trong dải hero — ngăn nhau bằng vạch dọc mảnh. */
function Fact({
  icon: Icon,
  value,
  first,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-4 text-sm first:pl-0",
        !first && "border-l border-white/25",
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="font-medium">{value}</span>
    </div>
  );
}
