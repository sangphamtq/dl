import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getThread } from "@/lib/community-feed";
import { ablyEnabled } from "@/lib/ably";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PostCard } from "@/components/community/post-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await prisma.thread.findUnique({
    where: { slug },
    select: { body: true, isHidden: true },
  });
  if (!t || t.isHidden) return {};
  const text = t.body.replace(/\s+/g, " ").trim().slice(0, 70);
  return { title: `${text || "Bài viết"} · Cộng đồng` };
}

export default async function ThreadPermalinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "editor";

  const post = await getThread(slug, currentUserId);
  if (!post || (post.isHidden && !isStaff)) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/cong-dong" className="hover:text-foreground">
              Cộng đồng
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="text-foreground/70">Bài viết</span>
          </nav>

          <PostCard
            post={post}
            currentUserId={currentUserId}
            isStaff={isStaff}
            isAuthed={!!currentUserId}
            realtimeEnabled={ablyEnabled()}
            showPlace
            defaultOpen
            repliesPreloaded
            deleteRedirectTo="/cong-dong"
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
