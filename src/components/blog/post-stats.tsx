import { Heart, MessageCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

// Số lượt tim + bình luận của một bài, hiển thị trên card/list. Ẩn chỉ số bằng 0;
// nếu cả hai bằng 0 thì không render gì (card gọn cho bài chưa có tương tác).
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
