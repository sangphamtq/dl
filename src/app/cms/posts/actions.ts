"use server";

import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PublishStatus } from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { cleanHtml } from "@/lib/sanitize";
import { POST_CATEGORIES } from "./constants";

const STAFF = ["admin", "editor"];
const utapi = new UTApi();

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

async function requireStaff(): Promise<{ id: string; role: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role) || !session?.user?.id)
    throw new Error("Không có quyền.");
  return { id: session.user.id, role };
}

// Editor chỉ được sửa/xóa bài của chính mình; admin sửa tất cả.
async function canEdit(
  postId: string,
  staff: { id: string; role: string },
): Promise<boolean> {
  if (staff.role === "admin") return true;
  const p = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  return !!p && p.authorId === staff.id;
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
      content: cleanHtml(input.content),
      category,
      tags,
    },
  };
}

export async function createPost(input: PostFormInput): Promise<ActionResult> {
  const { id: authorId } = await requireStaff();
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
  const staff = await requireStaff();
  if (!(await canEdit(id, staff)))
    return { ok: false, error: "Bạn chỉ sửa được bài của chính mình." };
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
  const staff = await requireStaff();
  if (!(await canEdit(id, staff)))
    return { ok: false, error: "Bạn chỉ xóa được bài của chính mình." };

  // Dọn ảnh trên UploadThing: ảnh gallery (Image.postId) + ảnh inline trong content.
  const post = await prisma.post.findUnique({
    where: { id },
    select: { content: true, images: { select: { url: true } } },
  });
  if (post) {
    const urls = [
      ...post.images.map((i) => i.url),
      ...(post.content.match(/https?:\/\/[^"')\s]+/g) ?? []),
    ];
    const keys = urls
      .map((u) => u.match(/\/f\/([^/?"'\s]+)/)?.[1])
      .filter((k): k is string => Boolean(k));
    if (keys.length) {
      try {
        await utapi.deleteFiles(keys);
      } catch {
        // bỏ qua lỗi storage
      }
    }
  }

  await prisma.post.delete({ where: { id } });
  revalidatePath("/cms/posts");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
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
  await requireStaff();
  await prisma.post.update({ where: { id }, data: { isFeatured: featured } });
  revalidatePath("/cms/posts");
  revalidatePath(`/cms/posts/${id}`);
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
  await prisma.post.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/posts");
  revalidatePath(`/cms/posts/${id}`);
  return { ok: true, id };
}
