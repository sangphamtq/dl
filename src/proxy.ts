import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: tạo instance NextAuth KHÔNG adapter (edge-safe, không Prisma).
// (Next.js 16 đổi quy ước "middleware" → "proxy".)
const { auth } = NextAuth(authConfig);

const STAFF_ROLES = ["admin", "editor"];

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isStaff = STAFF_ROLES.includes(role ?? "");

  if (pathname === "/login") {
    if (isLoggedIn) return Response.redirect(new URL("/", origin));
    return;
  }

  if (pathname.startsWith("/cms")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return Response.redirect(loginUrl);
    }
    if (!isStaff) return Response.redirect(new URL("/", origin));
  }

  // Mọi route khác (trang chủ, /diem-den, /blog…) đều công khai.
});

export const config = {
  matcher: ["/cms/:path*", "/login"],
};
