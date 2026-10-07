import Link from "next/link";
import { ArticleTocBox } from "@/components/blog/article-toc-box";
import { Glyph } from "@/components/site/glyphs";
import { articleProseClass } from "@/lib/prose";
import { prepareArticle } from "@/lib/toc";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export type TransportArticleData = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  updatedAt: Date;
};

export function TransportArticle({ post }: { post: TransportArticleData }) {
  const { html, toc } = prepareArticle(post.content);
  const blogHref = `/blog/${post.slug}`;

  return (
    <div className="lg:flex lg:items-start lg:gap-14">
      <article className="min-w-0 max-w-[48rem] flex-1">
        <h2 className="text-pretty text-3xl font-bold tracking-tight sm:text-4xl">
          {post.title}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Cập nhật <b className="font-semibold text-foreground">{dateFmt.format(post.updatedAt)}</b>
        </p>

        {post.excerpt && (
          <p className="mt-6 text-pretty font-[family-name:var(--font-display)] text-[1.2rem] leading-[1.55] text-foreground sm:text-[1.3rem]">
            {post.excerpt}
          </p>
        )}

        {toc.length >= 2 && (
          <div className="lg:hidden">
            <ArticleTocBox items={toc} />
          </div>
        )}

        <div
          className={cn(
            articleProseClass,
            "mt-6 [&_h2]:scroll-mt-32 [&_h3]:scroll-mt-32",
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <Link
          href={blogHref}
          className="group mt-10 inline-flex items-center gap-1.5 border-t border-border pt-5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Thích hay bình luận trên trang bài viết
          <Glyph name="forward" className="size-4 shrink-0" />
        </Link>
      </article>

      {toc.length >= 2 && (
        <aside className="hidden lg:sticky lg:top-28 lg:block lg:w-[20rem] lg:shrink-0">
          <ArticleTocBox items={toc} />
        </aside>
      )}
    </div>
  );
}
