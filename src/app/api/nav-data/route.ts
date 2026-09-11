import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUnreadCount } from "@/lib/notifications";
import { getProvinces } from "@/lib/locations";
import { getHomeProvince } from "@/lib/home-province";

export const dynamic = "force-dynamic";

export async function GET() {
  const [session, provinces] = await Promise.all([auth(), getProvinces()]);
  const user = session?.user;
  const [unread, homeProvince] = await Promise.all([
    user?.id ? getUnreadCount(user.id) : Promise.resolve(0),
    getHomeProvince(user?.id),
  ]);

  return NextResponse.json(
    {
      user: user
        ? {
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? null,
            role: user.role ?? null,
          }
        : null,
      unread,
      provinces: provinces.map((p) => p.name),
      homeProvince,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
