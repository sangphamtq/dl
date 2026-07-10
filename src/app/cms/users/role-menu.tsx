"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, ROLE_ORDER, type Role } from "./roles";
import { updateUserRole } from "./actions";

// Badge tĩnh hiển thị vai trò (dùng cho viewer không phải admin, hoặc dòng của
// chính mình — không cho tự đổi).
export function RoleBadge({ role }: { role: Role }) {
  const { label, variant, icon: Icon } = ROLES[role];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

// Badge có thể bấm để đổi vai trò (chỉ admin thấy, trừ dòng của chính mình).
export function RoleMenu({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  const [pending, startTransition] = useTransition();
  const { label, variant, icon: Icon } = ROLES[role];

  function onSelect(next: Role) {
    if (next === role) return;
    startTransition(async () => {
      await updateUserRole(userId, next);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
        >
          <Badge
            variant={variant}
            className="cursor-pointer gap-1 pr-1.5 hover:opacity-90"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Icon className="size-3" aria-hidden />
            )}
            {label}
            <ChevronDown className="size-3 opacity-70" aria-hidden />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Đổi vai trò</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_ORDER.map((r) => {
          const cfg = ROLES[r];
          const RIcon = cfg.icon;
          return (
            <DropdownMenuItem
              key={r}
              onSelect={() => onSelect(r)}
              className="flex items-start gap-2"
            >
              <RIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-medium">
                  {cfg.label}
                  {r === role && (
                    <Check className="size-3.5 text-primary" aria-hidden />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cfg.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RoleControl({
  userId,
  role,
  canEdit,
}: {
  userId: string;
  role: Role;
  canEdit: boolean;
}) {
  return canEdit ? (
    <RoleMenu userId={userId} role={role} />
  ) : (
    <RoleBadge role={role} />
  );
}
