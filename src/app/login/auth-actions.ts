"use server";

import { signIn } from "@/auth";

export async function signInGoogle(redirectTo?: string) {
  await signIn("google", { redirectTo: redirectTo || "/" });
}

export async function signInFacebook(redirectTo?: string) {
  await signIn("facebook", { redirectTo: redirectTo || "/" });
}

export async function signInDev(
  redirectTo: string | undefined,
  formData: FormData,
) {
  if (process.env.NODE_ENV === "production") return;
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  await signIn("dev", { email, redirectTo: redirectTo || "/" });
}
