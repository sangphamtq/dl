import { NextRequest } from "next/server";
import { recordView, isViewEntity } from "@/lib/views";
import { rateLimit, ipKey, isBotRequest } from "@/lib/rate-limit";

// Ghi lượt xem cho một listing: cộng ViewStat theo ngày + tăng popularity
// (counter all-time). Gọi từ client (beacon) khi thật sự xem trang.
// /api/* không qua proxy auth; chỉ tăng đếm nên không cần đăng nhập.
export async function POST(req: NextRequest) {
  if (isBotRequest(req)) return new Response(null, { status: 204 });
  if (!rateLimit(ipKey(req, "view"), 80))
    return new Response(null, { status: 429 });
  try {
    const { type, id } = await req.json();
    // 'place' đi qua route riêng; ở đây chỉ nhận các loại listing.
    if (isViewEntity(type) && type !== "place" && typeof id === "string" && id) {
      await recordView(type, id);
    }
  } catch {
    // id sai / body lỗi → bỏ qua
  }
  return new Response(null, { status: 204 });
}
