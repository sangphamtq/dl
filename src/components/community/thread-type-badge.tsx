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

export type ThreadTypeMeta = {
  Icon: LucideIcon;
  /** màu icon nhấn theo intent — pill vẫn trung tính để không cầu vồng */
  accent: string;
};

export const THREAD_TYPE_META: Record<string, ThreadTypeMeta> = {
  share: { Icon: Sparkles, accent: "text-warm" },
  question: { Icon: HelpCircle, accent: "text-sky-600 dark:text-sky-400" },
  trip: { Icon: Users, accent: "text-primary" },
  discussion: { Icon: MessageSquare, accent: "text-muted-foreground" },
  sale: { Icon: Tag, accent: "text-primary" },
};

export const threadTypeMeta = (type: string): ThreadTypeMeta =>
  THREAD_TYPE_META[type] ?? THREAD_TYPE_META.discussion;

export const threadTypeIcon = (type: string): LucideIcon =>
  threadTypeMeta(type).Icon;

// Nhãn loại bài — pill trung tính, icon mang màu intent (kín đáo).
export function ThreadTypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const { Icon, accent } = threadTypeMeta(type);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon className={cn("size-3.5", accent)} aria-hidden />
      {THREAD_TYPE_LABELS[type] ?? type}
    </span>
  );
}
