"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Loader2,
  Trash2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  addVideo,
  deleteVideo,
  updateVideoCaption,
  moveVideo,
} from "./video-actions";

export type CmsVideo = {
  id: string;
  videoId: string;
  caption: string | null;
  thumbnail: string | null;
};

export function PlaceVideosManager({
  placeId,
  videos,
}: {
  placeId: string;
  videos: CmsVideo[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAdd() {
    if (!input.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addVideo(placeId, input, caption);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInput("");
      setCaption("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Thêm video */}
      <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Dán link TikTok hoặc ID video…"
          className="sm:flex-1"
        />
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Chú thích (để trống = lấy tiêu đề TikTok)"
          className="sm:flex-1"
        />
        <Button type="button" onClick={onAdd} disabled={pending || !input.trim()}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Thêm
        </Button>
      </div>

      {/* Danh sách */}
      {videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có video nào.</p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v, i) => (
            <VideoRow
              key={v.id}
              placeId={placeId}
              video={v}
              isFirst={i === 0}
              isLast={i === videos.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoRow({
  placeId,
  video,
  isFirst,
  isLast,
}: {
  placeId: string;
  video: CmsVideo;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [caption, setCaption] = useState(video.caption ?? "");

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border p-2">
      {/* Thumbnail dọc */}
      <div className="relative aspect-[9/16] w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt=""
            fill
            sizes="48px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Play className="size-4" aria-hidden />
          </span>
        )}
      </div>

      {/* Caption + ID */}
      <div className="min-w-0 flex-1">
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => {
            if ((video.caption ?? "") !== caption.trim())
              run(() => updateVideoCaption(video.id, placeId, caption));
          }}
          placeholder="Chú thích…"
          className="h-8 text-sm"
        />
        <p className="mt-1 truncate text-xs text-muted-foreground">
          ID: {video.videoId}
        </p>
      </div>

      {/* Thứ tự */}
      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={pending || isFirst}
          onClick={() => run(() => moveVideo(video.id, placeId, -1))}
          aria-label="Lên"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={pending || isLast}
          onClick={() => run(() => moveVideo(video.id, placeId, 1))}
          aria-label="Xuống"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>

      {/* Xóa */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
        aria-label="Xóa video"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa video này?</AlertDialogTitle>
            <AlertDialogDescription>
              Gỡ video khỏi danh sách của điểm đến. Không xóa video gốc trên TikTok.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                run(() => deleteVideo(video.id, placeId).then(() => setConfirmOpen(false)));
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
    </li>
  );
}
