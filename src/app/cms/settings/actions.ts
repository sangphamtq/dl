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
  // Kiểu hero đổi → mọi trang điểm đến phải render lại (revalidate cả route động).
  revalidatePath("/diem-den/[placeSlug]", "page");
  return { ok: true };
}

// Mọi route ĐỘNG công khai. `revalidatePath("/", "layout")` chỉ quét các đường
// dẫn TĨNH — nó không chạm tới các trang sinh từ tham số, nên từng mẫu route
// phải khai riêng ở đây (đó cũng là lý do `updateSettings` bên trên phải gọi
// thêm một dòng cho `/diem-den/[placeSlug]`).
//
// Ba nhánh của lịch trình cố ý KHÔNG có mặt: `/lich-trinh/cua-toi/…` và
// `/lich-trinh/s/…` là dữ liệu riêng của từng người, luôn đọc tươi.
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
