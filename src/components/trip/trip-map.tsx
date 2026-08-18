"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "@/components/icons";
import { getRoute } from "@/lib/map-actions";
import type { TripMapPoint } from "@/components/trip/trip-map-inner";

const TripMapInner = dynamic(() => import("@/components/trip/trip-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
    </div>
  ),
});

// Bản đồ của MỘT ngày (không phải cả chuyến): pin đánh số theo thứ tự + tuyến
// đường nối. Vẽ cả 4 ngày lên một bản đồ thành mớ bòng bong — xem docs §6.
export function TripMap({
  points,
  dayLabel,
}: {
  points: TripMapPoint[];
  dayLabel: string;
}) {
  const [route, setRoute] = useState<[number, number][] | null>(null);

  // Hình tuyến đường lấy từ OSRM (chỉ để VẼ). Thời gian/quãng đường dùng cho
  // tính lịch thì lấy từ ORS ở server — xem lib/trip-route.ts.
  useEffect(() => {
    let alive = true;
    // Dưới 2 điểm thì không có tuyến để vẽ — thoát mà KHÔNG setState (gọi
    // setState thẳng trong effect gây render dây chuyền). Tuyến cũ được lọc ở
    // `line` bên dưới, và component vốn remount mỗi khi đổi ngày (prop `key`).
    if (points.length < 2) return;
    getRoute(points.map((p) => ({ lat: p.lat, lng: p.lng })))
      .then((r) => {
        if (alive) setRoute(r?.coords ?? null);
      })
      .catch(() => {
        if (alive) setRoute(null);
      });
    return () => {
      alive = false;
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="grid h-full min-h-[24rem] place-items-center bg-muted/40 px-6 text-center">
        <div>
          <MapPin className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm font-medium">Chưa có điểm nào trên bản đồ</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Xếp vài mục có toạ độ vào {dayLabel || "ngày này"} để xem tuyến đường.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[24rem]">
      <TripMapInner points={points} route={points.length >= 2 ? route : null} />
    </div>
  );
}
