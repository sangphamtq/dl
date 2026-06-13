import { auth } from "@/auth";

// Bảo vệ mọi route trừ trang login, các API auth, và tài nguyên tĩnh.
// Người dùng chưa đăng nhập sẽ bị chuyển hướng tới /login.
// (Next.js 16 đổi quy ước "middleware" → "proxy".)
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isOnLogin) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isOnLogin) {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Bỏ qua: api, _next/static, _next/image, favicon, và file tĩnh có đuôi mở rộng.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
