"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { normalizeUrl } from "@/lib/url";
import { isSaleService } from "@/lib/sale";

export type SaleFormInput = {
  displayName: string;
  bio: string;
  services: string[];
  zalo: string;
  phone: string;
  facebookUrl: string;
  website: string;
  avatarUrl: string;
  evidenceUrls: string[];
  areaIds: string[];
};

export type ActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const s = await auth();
  const id = s?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return id;
}

// Route con tĩnh dưới /sale (không được để slug hồ sơ che mất).
const SALE_SUBROUTES = new Set(["dang-ky"]);

async function uniqueSaleSlug(text: string, selfId?: string): Promise<string> {
  const base = slugify(text).slice(0, 60) || "ctv";
  let slug = base;
  let n = 1;
  // Tránh trùng slug (trong Sale), tiền tố dành riêng và route con tĩnh.
  while (true) {
    if (!RESERVED_SLUGS.has(slug) && !SALE_SUBROUTES.has(slug)) {
      const dup = await prisma.saleProfile.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!dup || dup.id === selfId) break;
    }
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// Tạo/cập nhật hồ sơ CTV của chính người đăng nhập. Luôn về trạng thái chờ
// duyệt (pending) trừ khi đang approved mà không đổi kênh liên hệ đã bảo chứng.
export async function submitSaleProfile(
  input: SaleFormInput,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để đăng ký." };
  }

  const displayName = input.displayName.trim();
  if (!displayName)
    return { ok: false, error: "Tên hiển thị không được để trống." };

  const zalo = input.zalo.trim() || null;
  const phone = input.phone.trim() || null;
  const facebookUrl = normalizeUrl(input.facebookUrl);
  if (!zalo && !phone && !facebookUrl)
    return {
      ok: false,
      error: "Cần ít nhất một kênh liên hệ (Zalo, SĐT hoặc Facebook).",
    };

  const website = normalizeUrl(input.website);
  const services = [...new Set(input.services.filter(isSaleService))];
  const avatarUrl = input.avatarUrl.trim() || null;
  const evidenceUrls = input.evidenceUrls
    .filter((u) => /^https?:\/\//.test(u))
    .slice(0, 8);

  const areaIds = [...new Set(input.areaIds.filter(Boolean))];
  const validAreas = areaIds.length
    ? await prisma.place.findMany({
        where: { id: { in: areaIds } },
        select: { id: true },
      })
    : [];

  const existing = await prisma.saleProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      slug: true,
      status: true,
      zalo: true,
      phone: true,
      facebookUrl: true,
    },
  });

  // Đổi kênh liên hệ đã được bảo chứng → phải xác minh lại (rớt về pending).
  const contactChanged =
    existing?.status === "approved" &&
    (existing.zalo !== zalo ||
      existing.phone !== phone ||
      existing.facebookUrl !== facebookUrl);

  const status: "pending" | "approved" =
    existing?.status === "approved" && !contactChanged ? "approved" : "pending";

  const slug = existing?.slug ?? (await uniqueSaleSlug(displayName));

  const areaRefs = validAreas.map((p) => ({ id: p.id }));
  const data = {
    displayName,
    bio: input.bio.trim() || null,
    services,
    zalo,
    phone,
    facebookUrl,
    website,
    avatarUrl,
    evidenceUrls,
    status,
    // Về pending thì xoá dấu xác minh & lý do từ chối cũ.
    ...(status === "pending" ? { verifiedAt: null, rejectReason: null } : {}),
  };

  const row = await prisma.saleProfile.upsert({
    where: { userId },
    create: { slug, userId, ...data, areas: { connect: areaRefs } },
    update: { ...data, areas: { set: areaRefs } },
  });

  revalidatePath("/sale/dang-ky");
  revalidatePath(`/sale/${row.slug}`);
  revalidatePath("/cms/sales");
  return { ok: true, slug: row.slug };
}
