import { NextRequest } from "next/server";
import { recordView } from "@/lib/views";
import { rateLimit, ipKey, isBotRequest } from "@/lib/rate-limit";

// Ghi lượt xem cho Place. Gọi từ client (beacon) khi người dùng thật sự xem
// trang — tránh đếm dư do prefetch/SSR render. /api/* không qua proxy auth.
export async function POST(req: NextRequest) {
  if (isBotRequest(req)) return new Response(null, { status: 204 });
  if (!rateLimit(ipKey(req, "view"), 80))
    return new Response(null, { status: 429 });
  try {
    const { placeId } = await req.json();
    if (typeof placeId === "string" && placeId) {
      await recordView("place", placeId);
    }
  } catch {
    // id sai / body lỗi → bỏ qua, vẫn trả 204.
  }
  return new Response(null, { status: 204 });
}
