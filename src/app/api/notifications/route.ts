import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUnreadCount, getRecentNotifications } from "@/lib/notifications";

// GET /api/notifications        → { unread, items }
// GET /api/notifications?c=1     → { unread }   (poll nhẹ chỉ lấy số chưa đọc)
export async function GET(req: NextRequest) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return Response.json({ unread: 0, items: [] });

  const unread = await getUnreadCount(uid);
  if (req.nextUrl.searchParams.get("c") === "1")
    return Response.json({ unread });

  const items = await getRecentNotifications(uid, 15);
  return Response.json({ unread, items });
}
