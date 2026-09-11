import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DaDenBoard } from "@/components/account/da-den-board";
import { parseMapCardOptions } from "@/lib/map-card";

export const metadata = { title: "Nơi đã đến" };

export default async function DaDenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/tai-khoan/da-den");

  const [rows, provinces, me] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: session.user.id, place: { kind: "province" } },
      select: { place: { select: { slug: true } } },
    }),
    prisma.place.findMany({
      where: { kind: "province" },
      select: { slug: true, id: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mapCardOptions: true },
    }),
  ]);

  const initialVisited = rows
    .map((r) => r.place?.slug)
    .filter((s): s is string => !!s);
  const slugToId = Object.fromEntries(provinces.map((p) => [p.slug, p.id]));
  const accountName = session.user.name ?? "";
  const options = parseMapCardOptions(me?.mapCardOptions, accountName);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] text-foreground sm:tracking-[0.14em]">
            Nơi bạn đã đến
          </h1>

          <DaDenBoard
            initialVisited={initialVisited}
            initialOptions={options}
            accountName={accountName}
            slugToId={slugToId}
          />
        </div>
      </main>
    </div>
  );
}
