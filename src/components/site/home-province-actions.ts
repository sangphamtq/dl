"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HOME_PROVINCE_COOKIE } from "@/lib/home-province";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Lưu tỉnh khách chọn (null = bỏ chọn). Ghi cookie cho mọi khách; nếu đã đăng
// nhập thì đồng bộ vào User.homeProvince để giữ qua nhiều thiết bị.
export async function setHomeProvince(name: string | null): Promise<void> {
  const value = name?.trim() || null;
  const store = await cookies();

  if (value) {
    store.set(HOME_PROVINCE_COOKIE, value, {
      maxAge: ONE_YEAR,
      path: "/",
      sameSite: "lax",
    });
  } else {
    store.delete(HOME_PROVINCE_COOKIE);
  }

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { homeProvince: value },
    });
  }
}
