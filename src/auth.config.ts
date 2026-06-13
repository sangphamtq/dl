import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/client";
import Google from "next-auth/providers/google";

// Cấu hình edge-safe: KHÔNG import giá trị Prisma/adapter ở đây.
// (import type bị xoá khi compile → an toàn cho edge.)
// Dùng chung cho proxy.ts (edge middleware) và auth.ts (Node, có adapter).
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // `user` chỉ có khi đăng nhập (từ adapter, chạy ở Node) → nhét id/role vào token.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role ?? "user") as UserRole;
      }
      return token;
    },
    // Copy id/role từ token sang session để dùng ở client/server component.
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? session.user.id;
        session.user.role = (token.role as UserRole | undefined) ?? "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
