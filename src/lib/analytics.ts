import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_ENABLED = !!POSTHOG_KEY;

export type EntityViewMeta = {
  entityType: string;
  entityId: string;
  name?: string;
  placeId?: string;
  provinceName?: string | null;
};

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
