import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "../post-form";
import { getRefOptions } from "../ref-options";

export default async function NewPostPage() {
  const refOptions = await getRefOptions();
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/posts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Bài viết
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Viết bài mới</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bạn sẽ là tác giả. Ảnh thêm được sau khi tạo (ở trang sửa).
      </p>

      <div className="mt-4">
        <PostForm mode="create" refOptions={refOptions} />
      </div>
    </div>
  );
}
