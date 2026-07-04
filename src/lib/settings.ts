import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "singleton";

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
};

// Giá trị mặc định khi chưa lưu cấu hình.
const DEFAULTS: SiteSettings = {
  siteName: "Halivivu",
  tagline: "Hỗ trợ thông tin du lịch Việt Nam.",
  description:
    "Tra cứu và khám phá điểm đến Việt Nam: ăn gì, chơi gì, ở đâu, đi lại thế nào.",
  contactEmail: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
};

// Đọc cấu hình site (gộp với mặc định). Dùng ở layout, header, footer, metadata.
export async function getSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!row) return DEFAULTS;
  return {
    siteName: row.siteName || DEFAULTS.siteName,
    tagline: row.tagline ?? DEFAULTS.tagline,
    description: row.description ?? DEFAULTS.description,
    contactEmail: row.contactEmail,
    facebookUrl: row.facebookUrl,
    instagramUrl: row.instagramUrl,
    youtubeUrl: row.youtubeUrl,
  };
}
