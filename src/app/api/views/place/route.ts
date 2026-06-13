import { NextRequest } from "next/server";
import { recordPlaceView } from "@/lib/views";

// Ghi lượt xem cho Place. Gọi từ client (beacon) khi người dùng thật sự xem
// trang — tránh đếm dư do prefetch/SSR render. /api/* không qua proxy auth.
export async function POST(req: NextRequest) {
  try {
    const { placeId } = await req.json();
    if (typeof placeId === "string" && placeId) {
      await recordPlaceView(placeId);
    }
  } catch {
    // id sai / body lỗi → bỏ qua, vẫn trả 204.
  }
  return new Response(null, { status: 204 });
}
