import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { PostForm, type PostFormValues } from "../../post-form";
import { getRefOptions } from "../../ref-options";

// PostRef → "type:id" để nạp vào multi-select.
function refToken(r: {
  placeId: string | null;
  activityId: string | null;
  spotId: string | null;
  specialtyId: string | null;
  eateryId: string | null;
  accommodationId: string | null;
}): string | null {
  if (r.placeId) return `place:${r.placeId}`;
  if (r.activityId) return `activity:${r.activityId}`;
  if (r.spotId) return `spot:${r.spotId}`;
  if (r.specialtyId) return `specialty:${r.specialtyId}`;
  if (r.eateryId) return `eatery:${r.eateryId}`;
  if (r.accommodationId) return `accommodation:${r.accommodationId}`;
  return null;
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [post, images, refOptions] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: true,
        tags: true,
        refs: {
          orderBy: { order: "asc" },
          select: {
            placeId: true,
            activityId: true,
            spotId: true,
            specialtyId: true,
            eateryId: true,
            accommodationId: true,
          },
        },
      },
    }),
    prisma.image.findMany({
      where: { postId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
    getRefOptions(),
  ]);

  if (!post) notFound();

  const initial: Partial<PostFormValues> = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content,
    category: post.category ?? "",
    tags: post.tags.join(", "),
    refs: post.refs.map(refToken).filter((x): x is string => x !== null),
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/posts/${post.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {post.title}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {post.title}
      </h1>

      <div className="mt-4">
        <PostForm
          mode="edit"
          postId={post.id}
          refOptions={refOptions}
          initial={initial}
        />
      </div>

      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Ảnh trong bài & ảnh bìa (cover hiển thị ở danh sách blog)."
        >
          <ListingImages ownerType="post" ownerId={post.id} images={images} />
        </FormSection>
      </div>
    </div>
  );
}
