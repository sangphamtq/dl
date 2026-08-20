"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, MoreHorizontal, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTemplate, deleteTemplate } from "./actions";

export function NewTemplateButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      onClick={() =>
        start(async () => {
          const res = await createTemplate();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          router.push(`/cms/lich-trinh/${res.data.id}`);
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      Tạo lịch trình mẫu
    </Button>
  );
}

export function TemplateRowActions({
  id,
  title,
  slug,
}: {
  id: string;
  title: string;
  slug: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Tuỳ chọn cho ${title}`}>
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/cms/lich-trinh/${id}`}>Sửa thông tin</Link>
          </DropdownMenuItem>
          {slug && (
            <DropdownMenuItem asChild>
              <Link href={`/lich-trinh/${slug}`} target="_blank">
                <ExternalLink className="size-4" aria-hidden />
                Xem trang công khai
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xoá “{title}”?</DialogTitle>
            <DialogDescription>
              Bản sao mà người dùng đã nhân bản KHÔNG bị ảnh hưởng — chỉ mẫu này bị xoá.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Huỷ</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteTemplate(id);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  setConfirmOpen(false);
                  toast(`Đã xoá “${title}”`);
                })
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
