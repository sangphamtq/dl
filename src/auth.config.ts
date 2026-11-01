import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/client";
import Google from "next-auth/providers/google";

// Cấu hình edge-safe: KHÔNG import giá trị Prisma/adapter ở đây.
// (import type bị xoá khi compile → an toàn cho edge.)
// Dùng chung cho proxy.ts (edge middleware) và auth.ts (Node, có adapter).
// Provider tự đọc env: AUTH_GOOGLE_ID/SECRET. Đăng nhập Facebook ĐÃ BỎ (2026-11-02).
export const authConfig = {
  providers: [
    // Nối theo email: người từng vào bằng Facebook đăng nhập Google cùng email thì về đúng tài khoản cũ (Google đã xác minh
    // email nên an toàn). Bỏ cờ này là họ gặp lỗi OAuthAccountNotLinked.
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role ?? "user") as UserRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? session.user.id;
        session.user.role = (token.role as UserRole | undefined) ?? "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
