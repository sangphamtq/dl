import { Shield, PenLine, Users as UsersIcon } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { type Role } from "./roles";
import { RoleControl } from "./role-menu";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function UsersPage() {
  const session = await auth();
  const me = session?.user;
  const isAdmin = me?.role === "admin";

  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });

  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    editor: users.filter((u) => u.role === "editor").length,
  };

  const stats = [
    { label: "Tổng tài khoản", value: counts.total, icon: UsersIcon },
    { label: "Quản trị viên", value: counts.admin, icon: Shield },
    { label: "Biên tập viên", value: counts.editor, icon: PenLine },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Người dùng</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tài khoản đăng nhập & phân quyền truy cập hệ thống.
      </p>

      {/* Thống kê nhanh */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                {label}
              </span>
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {value}
            </div>
          </Card>
        ))}
      </div>

      {!isAdmin && (
        <p className="mt-6 text-sm text-muted-foreground">
          Bạn đang xem ở chế độ chỉ đọc. Chỉ quản trị viên mới đổi được vai trò.
        </p>
      )}

      {/* Danh sách người dùng */}
      <div className="mt-6 overflow-hidden rounded-xl border">
        {/* Header bảng (chỉ desktop) */}
        <div className="hidden items-center gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:flex">
          <span className="flex-1">Tài khoản</span>
          <span className="w-20 text-center">Bài viết</span>
          <span className="w-28">Tham gia</span>
          <span className="w-40">Vai trò</span>
        </div>

        <ul className="divide-y">
          {users.map((u) => {
            const role = u.role as Role;
            const isSelf = u.id === me?.id;
            const initial = (u.name ?? u.email ?? "?").charAt(0).toUpperCase();
            return (
              <li
                key={u.id}
                className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:gap-4"
              >
                {/* Tài khoản */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="size-9 shrink-0 rounded-lg">
                    {u.image && (
                      <AvatarImage src={u.image} alt={u.name ?? "Avatar"} />
                    )}
                    <AvatarFallback className="rounded-lg text-sm">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {u.name ?? "Chưa đặt tên"}
                      </span>
                      {isSelf && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Bạn
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {u.email ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Meta + vai trò: hàng ngang gọn trên mobile, cột cố định trên desktop */}
                <div className="flex items-center justify-between gap-4 pl-12 md:pl-0">
                  <span className="text-sm text-muted-foreground md:w-20 md:text-center">
                    <span className="md:hidden">Bài viết: </span>
                    {u._count.posts}
                  </span>
                  <span className="text-sm text-muted-foreground md:w-28">
                    {dateFmt.format(u.createdAt)}
                  </span>
                  <div className="md:w-40">
                    <RoleControl
                      userId={u.id}
                      role={role}
                      canEdit={isAdmin && !isSelf}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {users.length === 0 && (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            Chưa có người dùng nào.
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Lưu ý: sau khi đổi vai trò, người dùng cần đăng xuất và đăng nhập lại để
        quyền mới có hiệu lực.
      </p>
    </div>
  );
}
