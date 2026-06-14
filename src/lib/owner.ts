// Cấu hình chủ sở hữu ảnh (exclusive arc trên Image) — dùng chung cho mọi
// Listing/Post để tái sử dụng hệ thống ảnh.
export const OWNER_FK = {
  place: "placeId",
  activity: "activityId",
  spot: "spotId",
  specialty: "specialtyId",
  eatery: "eateryId",
  accommodation: "accommodationId",
  transport: "transportId",
  post: "postId",
} as const;

export type OwnerType = keyof typeof OWNER_FK;

export const OWNER_TYPES = Object.keys(OWNER_FK) as OwnerType[];

// Tiền tố route CMS để revalidate sau khi đổi ảnh (null = chưa có trang CMS).
export const OWNER_CMS_BASE: Record<OwnerType, string | null> = {
  place: "/cms/places",
  activity: "/cms/activities",
  spot: "/cms/spots",
  specialty: "/cms/specialties",
  eatery: "/cms/eateries",
  accommodation: "/cms/accommodations",
  transport: "/cms/transport",
  post: "/cms/posts",
};
