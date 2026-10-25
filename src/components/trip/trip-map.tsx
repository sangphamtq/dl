"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "@/components/icons";
import { Glyph } from "@/components/site/glyphs";
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

export function TripMap({
  points,
  dayLabel,
  ghosts,
}: {
  points: TripMapPoint[];
  dayLabel: string;
  ghosts?: { id: string; name: string; lat: number; lng: number }[];
}) {
  const [route, setRoute] = useState<[number, number][] | null>(null);

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

  if (points.length === 0 && (ghosts?.length ?? 0) === 0) {
    return (
      <div className="grid h-full min-h-[24rem] place-items-center bg-muted/40 px-6 text-center">
        <div>
          <Glyph name="pin" className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">Chưa có điểm nào trên bản đồ</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Xếp vài mục có toạ độ vào {dayLabel || "ngày này"} để xem tuyến đường.
          </p>
        </div>
      </div>
    );
  }

  return (
    // `isolate`: Leaflet tự đặt z-index 400–1000 cho các lớp của nó — không khoá trong một ngữ cảnh xếp chồng riêng
    // thì bản đồ nổi ĐÈ lên tấm chọn mục / hộp thoại (z-50) trên điện thoại.
    <div className="relative isolate h-full min-h-[24rem]">
      <TripMapInner points={points} route={points.length >= 2 ? route : null} ghosts={ghosts} />
    </div>
  );
}
