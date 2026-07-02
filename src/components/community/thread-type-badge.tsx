import {
  HelpCircle,
  MessageSquare,
  Sparkles,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { THREAD_TYPE_LABELS } from "@/lib/community";

const ICONS: Record<string, LucideIcon> = {
  share: Sparkles,
  question: HelpCircle,
  trip: Users,
  discussion: MessageSquare,
  sale: Tag,
};

export const threadTypeIcon = (type: string): LucideIcon =>
  ICONS[type] ?? MessageSquare;

// Nhãn loại bài — trung tính (nền muted), phân biệt bằng icon.
// Riêng "sale" (rao dịch vụ) tô tông primary để nổi bật.
export function ThreadTypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type] ?? MessageSquare;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        type === "sale"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {THREAD_TYPE_LABELS[type] ?? type}
    </span>
  );
}
