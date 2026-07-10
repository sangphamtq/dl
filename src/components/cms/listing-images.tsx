"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadCloud, Loader2, Star, Trash2, AlertCircle } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import type { OwnerType } from "@/lib/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  deleteImage,
  setCoverImage,
  updateImageAlt,
} from "@/app/cms/listing-image-actions";

export type OwnerImage = {
  id: string;
  url: string;
  alt: string | null;
  isCover: boolean;
};

// Quản lý ảnh dùng chung cho mọi Listing (upload + đặt bìa + sửa alt + xóa).
export function ListingImages({
  ownerType,
  ownerId,
  images,
}: {
  ownerType: OwnerType;
  ownerId: string;
  images: OwnerImage[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("listingImage", {
    onClientUploadComplete: () => {
      setError(null);
      router.refresh();
    },
    onUploadError: (e) => setError(e.message),
  });

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    void startUpload(Array.from(files), { ownerType, ownerId });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isUploading)
            inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!isUploading) onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "hover:bg-muted/40",
          isUploading && "pointer-events-none opacity-60",
        )}
      >
        {isUploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
        )}
        <p className="text-sm text-muted-foreground">
          {isUploading ? "Đang tải lên…" : "Kéo thả ảnh vào đây hoặc bấm để chọn"}
        </p>
        <p className="text-xs text-muted-foreground">
          PNG/JPG/WebP · tối đa 8MB · tối đa 12 ảnh/lần
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              ownerType={ownerType}
              ownerId={ownerId}
              img={img}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({
  ownerType,
  ownerId,
  img,
}: {
  ownerType: OwnerType;
  ownerId: string;
  img: OwnerImage;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alt, setAlt] = useState(img.alt ?? "");

  function onSetCover() {
    if (img.isCover) return;
    startTransition(async () => {
      await setCoverImage(img.id, ownerType, ownerId);
    });
  }

  function onSaveAlt() {
    if ((img.alt ?? "") === alt.trim()) return;
    startTransition(async () => {
      await updateImageAlt(img.id, ownerType, ownerId, alt);
    });
  }

  function onDelete() {
    startTransition(async () => {
      await deleteImage(img.id, ownerType, ownerId);
      setConfirmOpen(false);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="relative aspect-[4/3] bg-muted">
        <Image
          src={img.url}
          alt={img.alt ?? ""}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover"
        />
        {img.isCover && (
          <Badge className="absolute left-2 top-2 gap-1">
            <Star className="size-3 fill-current" aria-hidden />
            Ảnh bìa
          </Badge>
        )}
        {pending && (
          <div className="absolute inset-0 grid place-items-center bg-background/50">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>

      <div className="space-y-2 p-2">
        <Input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={onSaveAlt}
          placeholder="Mô tả ảnh (alt)…"
          className="h-8 text-xs"
        />
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pending || img.isCover}
            onClick={onSetCover}
          >
            <Star
              className={cn("size-3.5", img.isCover && "fill-current")}
              aria-hidden
            />
            {img.isCover ? "Bìa" : "Đặt bìa"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
            aria-label="Xóa ảnh"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh sẽ bị xóa khỏi cả thư viện và kho lưu trữ. Không thể hoàn tác.
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
