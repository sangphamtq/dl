import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAblyRest } from "@/lib/ably";

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
