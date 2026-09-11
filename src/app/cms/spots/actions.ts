"use server";

import { revalidatePath, updateTag } from "next/cache";
import { revalidateListingPages } from "@/lib/revalidate-public";
import { auth } from "@/auth";
import { ORS_CACHE_TAG } from "@/lib/routing";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { SpotCategory, PublishStatus } from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { normalizeUrl } from "@/lib/url";
import {
  normalizeExtraFees,
  type ExtraFeeInput,
  type TicketTier,
} from "@/lib/tickets";

const STAFF = ["admin", "editor"];

function emptyableHtml(html: string): string | null {
  const stripped = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped ? html.trim() : null;
}

export type TicketTierInput = { label: string; price: string; note: string };

export type HighlightInput = {
  title: string;
  body: string;
};

export type SpotActivityContentInput = {
  activityId: string;
  name: string;
  blurb: string;
  imageUrl: string;
  imageAlt: string;
};

export type SpotFormInput = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  placeId: string;
  address: string;
  lat: string;
  lng: string;
  openingHours: string;
  phone: string;
  website: string;
  bookingUrl: string;
  mapUrl: string;
  bestTime: string;
  bestTimeNote: string;
  ticketFree: boolean;
  ticketTiers: TicketTierInput[];
  ticketInfo: string;
  extraFees: ExtraFeeInput[];
  notice: string;
  gettingThere: string;
  tips: string;
  highlights: HighlightInput[];
  activityContent: SpotActivityContentInput[];
  tags: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function code(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

type HighlightData = {
  order: number;
  title: string;
  body: string | null;
};

async function normalize(
  input: SpotFormInput,
  selfId?: string,
): Promise<
  | { data: Prisma.SpotUncheckedCreateInput; highlights: HighlightData[] }
  | { error: string }
> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(name)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng.` };

  const dup = await prisma.spot.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại (trong Địa điểm nhỏ).` };

  if (!input.placeId) return { error: "Phải chọn nơi (Place) chứa địa điểm này." };
  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    select: { id: true },
  });
  if (!place) return { error: "Place không tồn tại." };

  const lat = num(input.lat);
  const lng = num(input.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng))
    return { error: "Toạ độ (lat/lng) phải là số." };
  if (lat != null && (lat < -90 || lat > 90))
    return { error: "Vĩ độ (lat) phải trong khoảng -90 đến 90." };
  if (lng != null && (lng < -180 || lng > 180))
    return { error: "Kinh độ (lng) phải trong khoảng -180 đến 180." };

  const category =
    input.category && input.category in SpotCategory
      ? (input.category as SpotCategory)
      : null;

  const tags = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const tips = input.tips
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  const highlights: HighlightData[] = [];
  for (const h of input.highlights) {
    const title = h.title.trim();
    if (!title) continue;
    highlights.push({
      order: highlights.length,
      title,
      body: h.body.trim() || null,
    });
  }

  const tiers: TicketTier[] = [];
  if (!input.ticketFree) {
    for (const t of input.ticketTiers) {
      const label = t.label.trim();
      if (!label) continue;
      const price = num(t.price);
      if (Number.isNaN(price))
        return { error: `Giá vé "${label}" phải là số.` };
      if (price != null && price < 0)
        return { error: `Giá vé "${label}" không được âm.` };
      tiers.push({ label, price, note: t.note.trim() || null });
    }
  }

  const extra = normalizeExtraFees(input.extraFees);
  if ("error" in extra) return { error: extra.error };

  return {
    highlights,
    data: {
      name,
      slug,
      tagline: input.tagline.trim() || null,
      description: input.description.trim() || null,
      category,
      placeId: input.placeId,
      address: input.address.trim() || null,
      lat,
      lng,
      openingHours: input.openingHours.trim() || null,
      phone: input.phone.trim() || null,
      website: normalizeUrl(input.website),
      bookingUrl: normalizeUrl(input.bookingUrl),
      mapUrl: normalizeUrl(input.mapUrl),
      bestTime: input.bestTime.trim() || null,
      bestTimeNote: input.bestTimeNote.trim() || null,
      ticketFree: input.ticketFree,
      ticketTiers:
        tiers.length > 0 ? (tiers as Prisma.InputJsonValue) : Prisma.DbNull,
      ticketInfo: input.ticketInfo.trim() || null,
      extraFees:
        extra.fees.length > 0
          ? (extra.fees as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      notice: input.notice.trim() || null,
      gettingThere: emptyableHtml(input.gettingThere),
      tips,
      tags,
      provinceCode: code(input.provinceCode),
      provinceName: input.provinceName.trim() || null,
      wardCode: code(input.wardCode),
      wardName: input.wardName.trim() || null,
    },
  };
}

export async function createSpot(input: SpotFormInput): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };
  const spot = await prisma.spot.create({
    data: { ...res.data, highlights: { create: res.highlights } },
  });
  revalidatePath("/cms/spots");
  revalidateListingPages();
  updateTag(ORS_CACHE_TAG);
  return { ok: true, id: spot.id };
}

export async function updateSpot(
  id: string,
  input: SpotFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.spot.update({
    where: { id },
    data: {
      ...res.data,
      highlights: { deleteMany: {}, create: res.highlights },
    },
  });
  for (const c of input.activityContent) {
    await prisma.spotActivity.updateMany({
      where: { spotId: id, activityId: c.activityId },
      data: {
        blurb: c.blurb.trim() || null,
        imageUrl: normalizeUrl(c.imageUrl),
        imageAlt: c.imageAlt.trim() || null,
      },
    });
  }
  revalidatePath("/cms/spots");
  revalidateListingPages();
  revalidatePath(`/cms/spots/${id}`);
  revalidatePath(`/cms/spots/${id}/edit`);
  updateTag(ORS_CACHE_TAG);
  return { ok: true, id };
}

export async function deleteSpot(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.spot.delete({ where: { id } });
  revalidatePath("/cms/spots");
  revalidateListingPages();
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.spot.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/spots");
  revalidateListingPages();
  revalidatePath(`/cms/spots/${id}`);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.spot.update({ where: { id }, data: { isFeatured: featured } });
  revalidatePath("/cms/spots");
  revalidateListingPages();
  revalidatePath(`/cms/spots/${id}`);
  return { ok: true, id };
}

export async function updateOrder(
  id: string,
  order: string,
): Promise<ActionResult> {
  await requireStaff();
  const value = order.trim() === "" ? null : Number(order);
  if (value !== null && !Number.isFinite(value))
    return { ok: false, error: "Thứ tự phải là số." };
  await prisma.spot.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/spots");
  revalidateListingPages();
  revalidatePath(`/cms/spots/${id}`);
  return { ok: true, id };
}
