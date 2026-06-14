"use client";

import { useEffect } from "react";

// Đếm 1 lượt xem/phiên cho một listing. useEffect chỉ chạy khi thật sự điều
// hướng tới trang (không chạy lúc prefetch); sessionStorage chống đếm lại khi F5.
export function ListingViewTracker({
  type,
  id,
}: {
  type: string;
  id: string;
}) {
  useEffect(() => {
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
  }, [type, id]);

  return null;
}
