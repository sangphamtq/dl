import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { claimTripInvites } from "@/lib/trip-invites";

// Đăng nhập nhanh CHỈ Ở DEV: vào bằng email của một User có sẵn trong DB, KHÔNG
// mật khẩu — để test các tài khoản seed (CTV…) khi auth thật chỉ có OAuth.
// TẮT hoàn toàn ở production. Đặt ở đây (Node, có Prisma) để auth.config.ts vẫn
// edge-safe cho proxy.ts.
const devLogin =
  process.env.NODE_ENV !== "production"
    ? [
        Credentials({
          id: "dev",
          name: "Dev (email)",
          credentials: { email: { label: "Email", type: "email" } },
          async authorize(creds) {
            const email =
              typeof creds?.email === "string"
                ? creds.email.trim().toLowerCase()
                : "";
            if (!email) return null;
            return (await prisma.user.findUnique({ where: { email } })) ?? null;
          },
        }),
      ]
    : [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, ...devLogin],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  events: {
    async signIn({ user }) {
      if (user.id) await claimTripInvites(user.id, user.email);
    },
  },
});
