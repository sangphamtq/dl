"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { POSTHOG_KEY, POSTHOG_HOST } from "@/lib/analytics";

// Init NGAY ở module (chỉ chạy phía client vì file "use client"). Đặt ở đây
// thay vì trong useEffect để bảo đảm PostHog đã sẵn sàng TRƯỚC khi effect của
// component con (PageViewTracker / các view-tracker) chạy — tránh mất event đầu.
if (typeof window !== "undefined" && POSTHOG_KEY && !posthog.__loaded) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // tự bắn ở PageViewTracker để phủ route change
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
  });
}

// Bắt $pageview thủ công trên mỗi lần đổi route (App Router không tự bắn khi
// điều hướng client-side). Suspense vì useSearchParams cần ranh giới suspense.
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    let url = window.location.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  if (!POSTHOG_KEY) return null;
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
