import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Route GET chứ không phải server action: Next chạy server action NỐI TIẾP theo
// từng client, nên một lượt hỏi định kỳ sẽ bắt thao tác thật của người dùng đứng chờ.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response(null, { status: 401 });

  const { id } = await params;
  const trip = await prisma.trip.findFirst({
    where: { id, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { version: true },
  });
  if (!trip) return new Response(null, { status: 404 });

  return Response.json({ version: trip.version }, { headers: { "Cache-Control": "no-store" } });
}
