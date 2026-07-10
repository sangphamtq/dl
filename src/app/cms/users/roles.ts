import type { ComponentProps } from "react";
import { Shield, PenLine, User } from "@/components/icons";
import type { Badge } from "@/components/ui/badge";

export type Role = "admin" | "editor" | "user";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

// Cấu hình hiển thị cho từng vai trò (nhãn tiếng Việt + style badge + icon).
export const ROLES: Record<
  Role,
  {
    label: string;
    description: string;
    variant: BadgeVariant;
    icon: typeof Shield;
  }
> = {
  admin: {
    label: "Quản trị viên",
    description: "Toàn quyền: nội dung, người dùng, cài đặt.",
    variant: "default",
    icon: Shield,
  },
  editor: {
    label: "Biên tập viên",
    description: "Soạn & xuất bản nội dung, bài viết.",
    variant: "secondary",
    icon: PenLine,
  },
  user: {
    label: "Người dùng",
    description: "Không có quyền truy cập trang quản trị.",
    variant: "outline",
    icon: User,
  },
};

export const ROLE_ORDER: Role[] = ["admin", "editor", "user"];
