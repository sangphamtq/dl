import { Heart, MessageCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

export function PostStats({
  likes,
  comments,
  className,
}: {
  likes: number;
  comments: number;
  className?: string;
}) {
  if (!likes && !comments) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {likes > 0 && (
        <span className="inline-flex items-center gap-1">
          <Heart className="size-3.5" aria-hidden />
          {likes}
        </span>
      )}
      {comments > 0 && (
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-3.5" aria-hidden />
          {comments}
        </span>
      )}
    </span>
  );
}
