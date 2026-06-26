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
