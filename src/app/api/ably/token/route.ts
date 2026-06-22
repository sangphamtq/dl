import { NextResponse } from "next/server";
import { getAblyRest } from "@/lib/ably";

// Cấp token cho browser đăng ký realtime — chỉ cho phép SUBSCRIBE kênh post:*,
// không cho publish. Key bí mật ở server không lộ ra client.
export async function GET() {
  const client = getAblyRest();
  if (!client)
    return NextResponse.json({ error: "Ably chưa cấu hình" }, { status: 503 });

  const tokenRequest = await client.auth.createTokenRequest({
    capability: { "post:*": ["subscribe"] },
  });
  return NextResponse.json(tokenRequest);
}
