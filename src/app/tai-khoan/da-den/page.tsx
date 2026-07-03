import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { DaDenBoard } from "@/components/account/da-den-board";

export const metadata = { title: "Nơi đã đến · Hành Trình Việt" };

export default async function DaDenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/tai-khoan/da-den");

  // Tỉnh đã đến của user + bản đồ slug→id để đánh dấu mọi tỉnh.
  const [rows, provinces] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: session.user.id, place: { kind: "province" } },
      select: { place: { select: { slug: true } } },
    }),
    prisma.place.findMany({
      where: { kind: "province" },
      select: { slug: true, id: true },
    }),
  ]);

  const initialVisited = rows.map((r) => r.place.slug);
  const slugToId = Object.fromEntries(provinces.map((p) => [p.slug, p.id]));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden bg-gradient-to-b from-sky-100/70 via-sky-50/40 to-background dark:from-muted/30 dark:via-muted/10">
        {/* Họa tiết vòng tròn đồng tâm (sau nội dung) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-10 -z-10 size-[36rem] rounded-full border border-primary/10 [mask-image:radial-gradient(circle,black,transparent_70%)]"
        >
          <div className="absolute inset-12 rounded-full border border-primary/10" />
          <div className="absolute inset-28 rounded-full border border-warm/10" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-sm font-medium text-warm">Hành trình của bạn</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Nơi bạn đã đến
          </h1>

          <DaDenBoard initialVisited={initialVisited} slugToId={slugToId} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
