import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const HOME_PROVINCE_COOKIE = "home-province";

export async function getHomeProvince(userId?: string): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(HOME_PROVINCE_COOKIE)?.value?.trim();
  if (fromCookie) return fromCookie;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { homeProvince: true },
    });
    return user?.homeProvince?.trim() || null;
  }
  return null;
}
