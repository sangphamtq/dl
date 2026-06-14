import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { PostForm, type PostFormValues } from "../../post-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [post, images] = await Promise.all([
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
      },
    }),
    prisma.image.findMany({
      where: { postId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!post) notFound();

  const initial: Partial<PostFormValues> = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content,
    category: post.category ?? "",
    tags: post.tags.join(", "),
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
        <PostForm mode="edit" postId={post.id} initial={initial} />
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
