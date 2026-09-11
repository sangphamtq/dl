import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-safe";
import type { HeroLayout } from "@/generated/prisma/enums";

export const SETTINGS_ID = "singleton";

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  heroLayout: HeroLayout;
};

const DEFAULTS: SiteSettings = {
  siteName: "Halivivu",
  tagline: "Hỗ trợ thông tin du lịch Việt Nam.",
  description:
    "Tra cứu và khám phá điểm đến Việt Nam: ăn gì, chơi gì, ở đâu, đi lại thế nào.",
  contactEmail: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  heroLayout: "center",
};

export const getSettings = cache(async function getSettings(): Promise<SiteSettings> {
  const row = await safeQuery(
    () => prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID } }),
    null,
  );
  if (!row) return DEFAULTS;
  return {
    siteName: row.siteName || DEFAULTS.siteName,
    tagline: row.tagline ?? DEFAULTS.tagline,
    description: row.description ?? DEFAULTS.description,
    contactEmail: row.contactEmail,
    facebookUrl: row.facebookUrl,
    instagramUrl: row.instagramUrl,
    youtubeUrl: row.youtubeUrl,
    heroLayout: row.heroLayout,
  };
});
