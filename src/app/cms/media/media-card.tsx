"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, Trash2, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { deleteMediaImage, updateMediaImage } from "./media-actions";

export type MediaItem = {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  credit: string | null;
  isCover: boolean;
  owner: { label: string; name: string; href: string | null } | null;
};

export function MediaCard({ item }: { item: MediaItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [alt, setAlt] = useState(item.alt ?? "");
  const [caption, setCaption] = useState(item.caption ?? "");
  const [credit, setCredit] = useState(item.credit ?? "");

  function onSave() {
    startTransition(async () => {
      const res = await updateMediaImage(item.id, { alt, caption, credit });
      if (res.ok) {
        setEditOpen(false);
        router.refresh();
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      await deleteMediaImage(item.id);
      setDeleteOpen(false);
    });
  }

  return (
    <div className="group overflow-hidden rounded-xl border">
      <div className="relative aspect-square bg-muted">
        <Image
          src={item.url}
          alt={item.alt ?? item.owner?.name ?? "Ảnh"}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
        {item.isCover && (
          <Badge className="absolute left-2 top-2 gap-1">
            <Star className="size-3 fill-current" aria-hidden />
            Bìa
          </Badge>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Sửa thông tin ảnh"
            disabled={pending}
            onClick={() => setEditOpen(true)}
            className="size-7 shadow-sm"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Xóa ảnh"
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
            className="size-7 shadow-sm hover:text-destructive"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1 p-2.5">
        {item.owner ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="shrink-0">
              {item.owner.label}
            </Badge>
            {item.owner.href ? (
              <Link
                href={item.owner.href}
                className="truncate text-sm font-medium hover:underline"
              >
                {item.owner.name}
              </Link>
            ) : (
              <span className="truncate text-sm font-medium">
                {item.owner.name}
              </span>
            )}
          </div>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Chưa gắn
          </Badge>
        )}
        {item.alt && (
          <p className="truncate text-xs text-muted-foreground">{item.alt}</p>
        )}
        {item.credit && (
          <p className="truncate text-xs text-muted-foreground">
            Nguồn: {item.credit}
          </p>
        )}
      </div>

      {/* Dialog sửa thông tin ảnh */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin ảnh</DialogTitle>
            <DialogDescription>
              Mô tả (alt), chú thích và nguồn ảnh.
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <Image
              src={item.url}
              alt={alt || "Ảnh"}
              fill
              sizes="500px"
              className="object-contain"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`alt-${item.id}`}>Mô tả (alt)</Label>
              <Input
                id={`alt-${item.id}`}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Mô tả ngắn nội dung ảnh (a11y, SEO)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`caption-${item.id}`}>Chú thích</Label>
              <Textarea
                id={`caption-${item.id}`}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Chú thích hiển thị dưới ảnh (tùy chọn)"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`credit-${item.id}`}>Nguồn</Label>
              <Input
                id={`credit-${item.id}`}
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="vd: Ảnh của Nguyễn Văn A / Unsplash"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button type="button" onClick={onSave} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh sẽ bị xóa khỏi thư viện và kho lưu trữ. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
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
    </div>
  );
}
