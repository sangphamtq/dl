"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/settings";

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
};

// Lưu cấu hình site (upsert singleton). Revalidate toàn site vì header/footer/
// metadata dùng chung ở root layout.
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
  };

  await prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// Công cụ: làm mới toàn bộ cache trang (header/footer/nội dung công khai).
export async function revalidateSite(): Promise<Result> {
  await requireAdmin();
  revalidatePath("/", "layout");
  return { ok: true };
}
