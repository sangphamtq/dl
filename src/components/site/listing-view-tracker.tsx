"use client";

import { useEffect } from "react";
import { captureEntityView } from "@/lib/analytics";

// Đếm 1 lượt xem/phiên cho một listing. useEffect chỉ chạy khi thật sự điều
// hướng tới trang (không chạy lúc prefetch); sessionStorage chống đếm lại khi F5.
export function ListingViewTracker({
  type,
  id,
  name,
  placeId,
  provinceName,
}: {
  type: string;
  id: string;
  name?: string;
  placeId?: string;
  provinceName?: string | null;
}) {
  useEffect(() => {
    // PostHog: bắn mỗi lần xem (không dedup) để có event giàu thuộc tính.
    captureEntityView({
      entityType: type,
      entityId: id,
      name,
      placeId,
      provinceName,
    });

    // Beacon nội bộ (ViewStat + popularity): dedup 1 lần/phiên.
    const key = `viewed:${type}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage không khả dụng → vẫn ghi lần này
    }
    fetch("/api/views/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
      keepalive: true,
    }).catch(() => {});
  }, [type, id, name, placeId, provinceName]);

  return null;
}
