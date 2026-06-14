"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  FileText,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAccommodation, togglePublish } from "./actions";

export function AccommodationRowActions({
  id,
  name,
  published,
}: {
  id: string;
  name: string;
  published: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Thao tác cho ${name}`}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/cms/accommodations/${id}`}>
              <FileText className="size-4" />
              Xem chi tiết
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/cms/accommodations/${id}/edit`}>
              <Pencil className="size-4" />
              Sửa
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await togglePublish(id, !published);
              });
            }}
          >
            {published ? (
              <>
                <EyeOff className="size-4" />
                Ẩn (nháp)
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Xuất bản
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Ảnh của cơ sở cũng sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await deleteAccommodation(id);
                  setConfirmOpen(false);
                });
              }}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
