"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PublishStatus } from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { POST_CATEGORIES } from "./constants";

const STAFF = ["admin", "editor"];

export type PostFormInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string; // "" = none
  tags: string;
  refs: string[]; // "type:id" — liên kết tới Place/Listing (PostRef)
};

// type token → cột FK trên PostRef (exclusive arc; KHÔNG gồm transport).
const REF_FK: Record<string, string> = {
  place: "placeId",
  activity: "activityId",
  spot: "spotId",
  specialty: "specialtyId",
  eatery: "eateryId",
  accommodation: "accommodationId",
};

// "type:id"[] → data tạo PostRef (giữ thứ tự chọn).
function refCreateData(
  refs: string[],
): Prisma.PostRefUncheckedCreateWithoutPostInput[] {
  const out: Prisma.PostRefUncheckedCreateWithoutPostInput[] = [];
  refs.forEach((r, i) => {
    const [type, id] = r.split(":");
    const fk = REF_FK[type];
    if (fk && id) out.push({ order: i, [fk]: id } as Prisma.PostRefUncheckedCreateWithoutPostInput);
  });
  return out;
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaffId(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role) || !session?.user?.id)
    throw new Error("Không có quyền.");
  return session.user.id;
}

async function normalize(
  input: PostFormInput,
  selfId?: string,
): Promise<{ data: Omit<Prisma.PostUncheckedCreateInput, "authorId"> } | { error: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Tiêu đề không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(title)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng.` };

  const dup = await prisma.post.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại.` };

  const category =
    input.category && POST_CATEGORIES.some((c) => c.value === input.category)
      ? input.category
      : null;

  const tags = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    data: {
      title,
      slug,
      excerpt: input.excerpt.trim() || null,
      content: input.content,
      category,
      tags,
    },
  };
}

export async function createPost(input: PostFormInput): Promise<ActionResult> {
  const authorId = await requireStaffId();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };
  const post = await prisma.post.create({
    data: { ...res.data, authorId, refs: { create: refCreateData(input.refs) } },
  });
  revalidatePath("/cms/posts");
  return { ok: true, id: post.id };
}

export async function updatePost(
  id: string,
  input: PostFormInput,
): Promise<ActionResult> {
  await requireStaffId();
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.post.update({
    where: { id },
    data: {
      ...res.data,
      refs: { deleteMany: {}, create: refCreateData(input.refs) },
    },
  });
  revalidatePath("/cms/posts");
  revalidatePath(`/cms/posts/${id}`);
  revalidatePath(`/cms/posts/${id}/edit`);
  return { ok: true, id };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireStaffId();
  await prisma.post.delete({ where: { id } });
  revalidatePath("/cms/posts");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaffId();
  await prisma.post.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/posts");
  revalidatePath(`/cms/posts/${id}`);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaffId();
  await prisma.post.update({ where: { id }, data: { isFeatured: featured } });
  revalidatePath("/cms/posts");
  revalidatePath(`/cms/posts/${id}`);
  return { ok: true, id };
}

export async function updateOrder(
  id: string,
  order: string,
): Promise<ActionResult> {
  await requireStaffId();
  const value = order.trim() === "" ? null : Number(order);
  if (value !== null && !Number.isFinite(value))
    return { ok: false, error: "Thứ tự phải là số." };
  await prisma.post.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/posts");
  revalidatePath(`/cms/posts/${id}`);
  return { ok: true, id };
}
