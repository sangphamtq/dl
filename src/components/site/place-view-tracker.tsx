"use client";

import { useEffect } from "react";

// Đếm 1 lượt xem mỗi phiên/place. useEffect chỉ chạy khi người dùng thật sự
// điều hướng tới trang (không chạy lúc Next prefetch), nên không bị đếm dư.
// sessionStorage chống đếm lại khi F5/quay lại trong cùng phiên.
export function PlaceViewTracker({ placeId }: { placeId: string }) {
  useEffect(() => {
    const key = `viewed:place:${placeId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage không khả dụng → vẫn ghi 1 lần cho lần mount này.
    }
    fetch("/api/views/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
      keepalive: true,
    }).catch(() => {});
  }, [placeId]);

  return null;
}
