"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/settings";
import { HeroLayout } from "@/generated/prisma/enums";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin")
    throw new Error("Chỉ quản trị viên mới đổi được cài đặt.");
}

function clean(v: string): string | null {
  return v.trim() || null;
}

export type SettingsInput = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  heroLayout: HeroLayout;
};

export async function updateSettings(input: SettingsInput): Promise<Result> {
  await requireAdmin();

  const name = input.siteName.trim();
  if (!name) return { ok: false, error: "Tên site không được để trống." };

  const data = {
    siteName: name,
    tagline: clean(input.tagline),
    description: clean(input.description),
    contactEmail: clean(input.contactEmail),
    facebookUrl: clean(input.facebookUrl),
    instagramUrl: clean(input.instagramUrl),
    youtubeUrl: clean(input.youtubeUrl),
    heroLayout:
      input.heroLayout === HeroLayout.classic
        ? HeroLayout.classic
        : HeroLayout.center,
  };

  await prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  revalidatePath("/", "layout");
  revalidatePath("/diem-den/[placeSlug]", "page");
  return { ok: true };
}

const PUBLIC_DYNAMIC_ROUTES = [
  "/diem-den/[placeSlug]",
  "/diem-den/[placeSlug]/[loai]",
  "/dia-diem/[slug]",
  "/hoat-dong/[slug]",
  "/luu-tru/[slug]",
  "/blog/[slug]",
  "/lich-trinh/[slug]",
  "/cong-dong/[slug]",
  "/sale/[slug]",
];

// Công cụ: làm mới toàn bộ cache trang (header/footer/nội dung công khai).
//
// Dùng khi dữ liệu đổi mà KHÔNG đi qua CMS — chạy seed, sửa thẳng trong Prisma
// Studio, đổi bằng script. Sửa qua CMS thì không cần bấm: các action đã tự xoá
// cache đúng trang bị ảnh hưởng.
export async function revalidateSite(): Promise<Result> {
  await requireAdmin();
  revalidatePath("/", "layout");
  for (const route of PUBLIC_DYNAMIC_ROUTES) revalidatePath(route, "page");
  return { ok: true };
}
