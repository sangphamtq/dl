import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAblyRest } from "@/lib/ably";

// Cấp token cho browser đăng ký realtime — chỉ cho phép SUBSCRIBE. Kênh feed
// công khai cho mọi người; kênh thông báo riêng user:<id> chỉ cấp cho đúng user
// đó (gắn clientId) để không nghe được thông báo người khác.
export async function GET() {
  const client = getAblyRest();
  if (!client)
    return NextResponse.json({ error: "Ably chưa cấu hình" }, { status: 503 });

  const session = await auth();
  const uid = session?.user?.id;

  const capability: Record<string, string[]> = {
    "post:*": ["subscribe"],
    "thread:*": ["subscribe"],
    "place-feed:*": ["subscribe"],
    "cong-dong": ["subscribe"],
  };
  if (uid) capability[`user:${uid}`] = ["subscribe"];

  const tokenRequest = await client.auth.createTokenRequest({
    ...(uid ? { clientId: uid } : {}),
    capability: JSON.stringify(capability),
  });
  return NextResponse.json(tokenRequest);
}
