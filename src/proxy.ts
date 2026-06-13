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
  const role = req.auth?.user?.role;
  const isStaff = STAFF_ROLES.includes(role ?? "");

  // Trang /login: đã đăng nhập rồi thì về trang chủ; còn lại cho vào.
  if (pathname === "/login") {
    if (isLoggedIn) return Response.redirect(new URL("/", origin));
    return;
  }

  // Khu CMS /cms: cần đăng nhập + là staff (admin/editor).
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
  // Bỏ qua: api, _next/static, _next/image, favicon, và file tĩnh có đuôi mở rộng.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
