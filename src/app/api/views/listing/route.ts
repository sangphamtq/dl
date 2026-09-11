import { NextRequest } from "next/server";
import { recordView, isViewEntity } from "@/lib/views";
import { rateLimit, ipKey, isBotRequest } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (isBotRequest(req)) return new Response(null, { status: 204 });
  if (!rateLimit(ipKey(req, "view"), 80))
    return new Response(null, { status: 429 });
  try {
    const { type, id } = await req.json();
    if (isViewEntity(type) && type !== "place" && typeof id === "string" && id) {
      await recordView(type, id);
    }
  } catch {
    // id sai / body lỗi → bỏ qua
  }
  return new Response(null, { status: 204 });
}
