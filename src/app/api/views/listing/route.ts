import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, ipKey } from "@/lib/rate-limit";

const ALLOWED = new Set([
  "activity",
  "spot",
  "specialty",
  "eatery",
  "accommodation",
]);

// Tăng popularity cho một listing. Gọi từ client (beacon) khi thật sự xem trang.
// /api/* không qua proxy auth; chỉ tăng đếm nên không cần đăng nhập.
export async function POST(req: NextRequest) {
  if (!rateLimit(ipKey(req, "view"), 80))
    return new Response(null, { status: 429 });
  try {
    const { type, id } = await req.json();
    if (typeof type === "string" && ALLOWED.has(type) && typeof id === "string" && id) {
      const model = prisma[type as keyof typeof prisma] as unknown as {
        update: (args: unknown) => Promise<unknown>;
      };
      await model.update({
        where: { id },
        data: { popularity: { increment: 1 } },
      });
    }
  } catch {
    // id sai / body lỗi → bỏ qua
  }
  return new Response(null, { status: 204 });
}
