import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";
import { BACKGROUND_COLOR, THEME_COLOR } from "@/lib/pwa";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();

  return {
    id: "/",
    name: `${s.siteName} — ${s.tagline}`,
    short_name: s.siteName,
    description: s.description,
    lang: "vi",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    categories: ["travel", "navigation", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Khám phá điểm đến", short_name: "Điểm đến", url: "/diem-den" },
      { name: "Bản đồ", short_name: "Bản đồ", url: "/ban-do" },
      { name: "Lịch trình của tôi", short_name: "Lịch trình", url: "/lich-trinh/cua-toi" },
      { name: "Tìm kiếm", short_name: "Tìm kiếm", url: "/tim-kiem" },
    ],
  };
}
