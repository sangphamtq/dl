import posthog from "posthog-js";

// PostHog chỉ bật khi có key (env NEXT_PUBLIC_POSTHOG_KEY). Không có key →
// mọi hàm dưới đây no-op, app chạy bình thường (analytics là tùy chọn).
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const POSTHOG_ENABLED = !!POSTHOG_KEY;

export type EntityViewMeta = {
  entityType: string; // 'place' | 'activity' | 'spot' | 'eatery' | 'accommodation'…
  entityId: string;
  name?: string;
  placeId?: string; // Place chứa listing (để nhóm traffic theo điểm đến)
  provinceName?: string | null; // để lọc traffic theo tỉnh
};

// Bắn sự kiện "xem nội dung" kèm thuộc tính thực thể → PostHog lọc/nhóm được
// traffic theo loại, theo điểm đến, theo tỉnh (bổ sung cho $pageview theo path).
export function captureEntityView(meta: EntityViewMeta): void {
  if (!POSTHOG_ENABLED) return;
  try {
    posthog.capture("content_viewed", {
      entity_type: meta.entityType,
      entity_id: meta.entityId,
      entity_name: meta.name,
      place_id: meta.placeId,
      province: meta.provinceName ?? undefined,
    });
  } catch {
    // posthog chưa init / bị chặn → bỏ qua
  }
}
