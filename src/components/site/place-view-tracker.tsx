"use client";

import { useEffect } from "react";
import { captureEntityView } from "@/lib/analytics";

export function PlaceViewTracker({
  placeId,
  name,
  provinceName,
}: {
  placeId: string;
  name?: string;
  provinceName?: string | null;
}) {
  useEffect(() => {
    captureEntityView({
      entityType: "place",
      entityId: placeId,
      name,
      placeId,
      provinceName,
    });

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
  }, [placeId, name, provinceName]);

  return null;
}
