"use client";

import { useEffect } from "react";
import { captureEntityView } from "@/lib/analytics";

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
    captureEntityView({
      entityType: type,
      entityId: id,
      name,
      placeId,
      provinceName,
    });

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
