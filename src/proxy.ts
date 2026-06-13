import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: tạo instance NextAuth KHÔNG adapter (edge-safe, không Prisma).
// (Next.js 16 đổi quy ước "middleware" → "proxy".)
const { auth } = NextAuth(authConfig);

// Vai trò được vào CMS /admin: admin (toàn quyền) và editor (biên tập blog).
const STAFF_ROLES = ["admin", "editor"];

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isOnLogin = pathname === "/login";
  const role = req.auth?.user?.role;

  // Chưa đăng nhập → đẩy về /login (trừ chính trang login).
  if (!isLoggedIn && !isOnLogin) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Đã đăng nhập mà vào /login → về trang chủ.
  if (isLoggedIn && isOnLogin) {
    return Response.redirect(new URL("/", origin));
  }

  // Khu CMS /cms: chỉ staff (admin/editor).
  if (pathname.startsWith("/cms") && !STAFF_ROLES.includes(role ?? "")) {
    return Response.redirect(new URL("/", origin));
  }
});

export const config = {
  // Bỏ qua: api, _next/static, _next/image, favicon, và file tĩnh có đuôi mở rộng.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
