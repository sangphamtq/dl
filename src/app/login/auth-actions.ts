"use server";

import { signIn } from "@/auth";

// Server actions đăng nhập dùng chung cho trang /login và login drawer.
// redirectTo: đường dẫn quay lại sau khi đăng nhập (mặc định trang chủ).

export async function signInGoogle(redirectTo?: string) {
  await signIn("google", { redirectTo: redirectTo || "/" });
}

export async function signInFacebook(redirectTo?: string) {
  await signIn("facebook", { redirectTo: redirectTo || "/" });
}

// Đăng nhập nhanh dev (email, không mật khẩu). Chặn cứng ở production.
export async function signInDev(
  redirectTo: string | undefined,
  formData: FormData,
) {
  if (process.env.NODE_ENV === "production") return;
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  await signIn("dev", { email, redirectTo: redirectTo || "/" });
}
