"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  PenLine,
  Trash2,
  MessageSquareText,
  Heart,
  CircleCheck,
  Meh,
  Frown,
  ThumbsUp,
  TriangleAlert,
  MapPinCheckInside,
  MapPin,
  Plus,
  MoreHorizontal,
  Check,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LoginDrawer } from "@/components/site/login-drawer";
import { submitReview, deleteReview } from "@/app/diem-den/review-actions";
import {
  REVIEW_STANCES,
  REVIEW_HIGHLIGHTS,
  REVIEW_CAVEATS,
  stanceMeta,
  labelsFor,
  MAX_CONTENT,
  type ReviewStance,
  type ReviewSummary,
  type StanceTone,
} from "@/lib/review-meta";

const STANCE_ICON: Record<ReviewStance, LucideIcon> = {
  love: Heart,
  worthOnce: CircleCheck,
  meh: Meh,
  bad: Frown,
};

export type ReviewListItem = {
  id: string;
  author: { id: string; name: string | null; image: string | null };
  stance: ReviewStance;
  highlights: string[];
  caveats: string[];
  content: string | null;
  createdAt: string; // ISO
  isMine: boolean;
};

export type MyReview = {
  stance: ReviewStance;
  highlights: string[];
  caveats: string[];
  content: string | null;
};

// Thanh biểu đồ — chỉ 1 accent: tích cực = xanh lá (2 sắc), tiêu cực = xám (2 sắc).
const BAR_TONE: Record<StanceTone, string> = {
  positive: "bg-primary",
  posSoft: "bg-primary/45",
  negSoft: "bg-foreground/20",
  negative: "bg-foreground/40",
};
const PILL_TONE: Record<StanceTone, string> = {
  positive: "bg-primary/10 text-primary",
  posSoft: "bg-primary/10 text-primary",
  negSoft: "bg-warm/10 text-warm",
  negative: "bg-destructive/10 text-destructive",
};
// Pill cảm nhận trên danh sách review — 1 accent: tích cực xanh, tiêu cực xám.
const STANCE_PILL: Record<StanceTone, string> = {
  positive: "bg-primary/10 text-primary",
  posSoft: "bg-primary/10 text-primary",
  negSoft: "bg-muted text-muted-foreground",
  negative: "bg-muted text-muted-foreground",
};
// Card cảm nhận khi được chọn — cả card nhuộm tông.
const STANCE_SELECTED: Record<StanceTone, string> = {
  positive: "border-primary/40 bg-primary/10 text-primary",
  posSoft: "border-primary/30 bg-primary/10 text-primary",
  negSoft: "border-warm/40 bg-warm/10 text-warm",
  negative: "border-destructive/40 bg-destructive/10 text-destructive",
};
const HL_CHIP = "bg-primary/10 text-primary";
const CV_CHIP = "bg-warm/10 text-warm";

const initial = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase();

function fmtDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

// ── Section chính ─────────────────────────────────────────────────
export function PlaceReviews({
  placeId,
  placeSlug,
  placeName,
  placeImage,
  summary,
  reviews,
  myReview,
  isAuthed,
  checkedIn,
}: {
  placeId: string;
  placeSlug: string;
  placeName: string;
  placeImage?: string | null;
  summary: ReviewSummary;
  reviews: ReviewListItem[];
  myReview: MyReview | null;
  isAuthed: boolean;
  checkedIn: boolean;
}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [openKey, setOpenKey] = useState(0); // đổi mỗi lần mở → remount form
  const [showAll, setShowAll] = useState(false);
  const [stanceFilter, setStanceFilter] = useState<ReviewStance | null>(null);
  const [contentOnly, setContentOnly] = useState(false);
  const router = useRouter();
  const effectiveCheckedIn = checkedIn || justCheckedIn;

  // Đồng bộ với nút check-in ở hero (sự kiện toàn cục, lọc theo placeId):
  // - check-in → mở form đánh giá NHANH + refresh (review cũ đang ẩn hiện lại).
  // - bỏ đánh dấu → refresh (review của mình tự ẩn khỏi danh sách & tổng hợp).
  useEffect(() => {
    function onCheckin(e: Event) {
      if ((e as CustomEvent<{ placeId: string }>).detail?.placeId !== placeId)
        return;
      setJustCheckedIn(true);
      setFormExpanded(false);
      setOpenKey((k) => k + 1);
      setFormOpen(true);
      router.refresh();
    }
    function onUncheckin(e: Event) {
      if ((e as CustomEvent<{ placeId: string }>).detail?.placeId !== placeId)
        return;
      setJustCheckedIn(false);
      setFormOpen(false);
      router.refresh();
    }
    window.addEventListener("halivivu:checkin", onCheckin);
    window.addEventListener("halivivu:uncheckin", onUncheckin);
    return () => {
      window.removeEventListener("halivivu:checkin", onCheckin);
      window.removeEventListener("halivivu:uncheckin", onUncheckin);
    };
  }, [placeId, router]);

  // Mở từ section đánh giá → mở FULL (bung sẵn nhãn + ô viết).
  function onWrite() {
    if (!isAuthed) {
      setLoginOpen(true);
      return;
    }
    if (!effectiveCheckedIn) {
      toast.info(
        myReview
          ? "Đánh giá của bạn đang ẩn vì đã bỏ đánh dấu. Đánh dấu đã đến lại để hiển thị và chỉnh sửa."
          : "Bạn cần đánh dấu đã đến nơi này trước khi đánh giá.",
      );
      return;
    }
    setFormExpanded(true);
    setOpenKey((k) => k + 1);
    setFormOpen(true);
  }

  const hasReviews = summary.total > 0;
  const INITIAL = 5;
  const filtered = reviews.filter(
    (r) =>
      (!stanceFilter || r.stance === stanceFilter) &&
      (!contentOnly || Boolean(r.content?.trim())),
  );
  const shown = showAll ? filtered : filtered.slice(0, INITIAL);

  return (
    <section id="danh-gia" className="scroll-mt-32">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="text-2xl font-bold tracking-tight">
          Vivu-er nói gì về {placeName}
        </h2>
        <button
          type="button"
          onClick={onWrite}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <PenLine className="size-4" aria-hidden />
          {myReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
        </button>
      </div>

      {hasReviews ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
          {/* Trái: tóm tắt + biểu đồ (sticky trên desktop) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SummaryPanel
              summary={summary}
              activeStance={stanceFilter}
              onSelectStance={(s) =>
                setStanceFilter((cur) => (cur === s ? null : s))
              }
            />
          </div>

          {/* Phải: tiếng nói — danh sách review */}
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              {stanceFilter && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Đang lọc:</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STANCE_PILL[stanceMeta(stanceFilter).tone],
                    )}
                  >
                    {stanceMeta(stanceFilter).label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStanceFilter(null)}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Bỏ lọc
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setContentOnly((v) => !v)}
                aria-pressed={contentOnly}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded border transition-colors",
                    contentOnly
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {contentOnly && <Check className="size-3" aria-hidden />}
                </span>
                Chỉ đánh giá có viết
              </button>
            </div>

            {shown.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {shown.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    placeId={placeId}
                    onEdit={onWrite}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                Không có đánh giá phù hợp bộ lọc.
              </p>
            )}

            {filtered.length > INITIAL && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                {showAll
                  ? "Thu gọn"
                  : `Xem thêm ${filtered.length - INITIAL} đánh giá`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-2 py-6 text-center">
          <MessageSquareText
            className="size-8 text-muted-foreground/50"
            aria-hidden
          />
          <p className="font-medium">Chưa có đánh giá nào</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Là Vivu-er đầu tiên chia sẻ cảm nhận về {placeName}.
          </p>
          <button
            type="button"
            onClick={onWrite}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PenLine className="size-4" aria-hidden />
            Viết đánh giá đầu tiên
          </button>
        </div>
      )}

      {!isAuthed && (
        <LoginDrawer
          open={loginOpen}
          onOpenChange={setLoginOpen}
          redirectTo={`/diem-den/${placeSlug}`}
          title="Đăng nhập để đánh giá"
          description="Đăng nhập và đánh dấu đã đến để chia sẻ cảm nhận của bạn."
        />
      )}
      {isAuthed && effectiveCheckedIn && (
        <ReviewForm
          key={openKey}
          open={formOpen}
          onOpenChange={setFormOpen}
          defaultExpanded={formExpanded}
          placeId={placeId}
          placeName={placeName}
          placeImage={placeImage}
          initial={myReview}
        />
      )}
    </section>
  );
}

// ── Panel hero tổng hợp — "mặt" biên tập, đúng ngôn ngữ design system ─
function verdictLead(pct: number) {
  if (pct >= 85) return "Gần như ai cũng thấy đáng đi";
  if (pct >= 70) return "Hầu hết thấy đáng đi";
  if (pct >= 50) return "Phần lớn thấy đáng đi";
  if (pct >= 30) return "Ý kiến khá chia";
  return "Nhiều người thấy chưa đáng đi";
}

// Biểu đồ phân bố 4 mức cảm nhận — thanh ngang, nhãn trực tiếp (không color-alone).
// Mỗi hàng là một nút lọc: bấm để chỉ xem review ở mức đó.
function StanceChart({
  summary,
  active,
  onSelect,
}: {
  summary: ReviewSummary;
  active: ReviewStance | null;
  onSelect: (s: ReviewStance) => void;
}) {
  const max = summary.total || 1;
  return (
    <div className="-mx-2 space-y-1">
      {summary.stance.map((s) => {
        const on = active === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onSelect(s.value)}
            aria-pressed={on}
            className={cn(
              "block w-full rounded-lg px-2 py-1.5 text-left transition-colors",
              on
                ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                : "hover:bg-muted/60",
            )}
          >
            <div className="flex items-baseline gap-2 text-xs">
              <span className={on ? "font-medium text-foreground" : "text-muted-foreground"}>
                {s.label}
              </span>
              <span className="tabular-nums text-muted-foreground/70">
                {s.count}
              </span>
              <span className="ml-auto tabular-nums font-medium text-muted-foreground">
                {s.pct}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", BAR_TONE[s.tone])}
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Nhóm nhãn nổi bật (điểm cộng / cần lưu ý) — tiêu đề màu + badge kèm số lượng.
function AspectGroup({
  title,
  accent,
  chip,
  items,
}: {
  title: string;
  accent: string;
  chip: string;
  items: { value: string; label: string; count: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn("mr-0.5 shrink-0 text-xs font-semibold", accent)}>
        {title}
      </span>
      {items.map((it) => (
        <span
          key={it.value}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            chip,
          )}
        >
          {it.label}
          <span className="tabular-nums opacity-70">{it.count}</span>
        </span>
      ))}
    </div>
  );
}

// Cột trái: tóm tắt + biểu đồ (card nổi mềm). Biểu đồ kiêm bộ lọc theo cảm nhận.
function SummaryPanel({
  summary,
  activeStance,
  onSelectStance,
}: {
  summary: ReviewSummary;
  activeStance: ReviewStance | null;
  onSelectStance: (s: ReviewStance) => void;
}) {
  const topHl = summary.highlights.slice(0, 4);
  const topCv = summary.caveats.slice(0, 3);
  return (
    <div className="rounded-2xl bg-card p-6 shadow-lg shadow-black/5">
      <div className="flex items-baseline gap-2.5">
        <span className="text-5xl font-bold tabular-nums leading-none text-primary">
          {summary.worthGoingPct}%
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          thấy đáng đi
        </span>
      </div>
      <p className="mt-2.5 text-sm">
        <span className="font-semibold">{verdictLead(summary.worthGoingPct)}</span>
        <span className="text-muted-foreground"> · {summary.total} đánh giá</span>
      </p>

      <div className="mt-6">
        <StanceChart
          summary={summary}
          active={activeStance}
          onSelect={onSelectStance}
        />
        <p className="mt-2 px-0.5 text-xs text-muted-foreground">
          Bấm một mức để lọc đánh giá
        </p>
      </div>

      {(topHl.length > 0 || topCv.length > 0) && (
        <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
          {topHl.length > 0 && (
            <AspectGroup
              title="Điểm cộng"
              accent="text-foreground/70"
              chip="bg-muted text-foreground/90"
              items={topHl}
            />
          )}
          {topCv.length > 0 && (
            <AspectGroup
              title="Cần lưu ý"
              accent="text-foreground/70"
              chip="bg-muted text-foreground/90"
              items={topCv}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Một review ────────────────────────────────────────────────────
function ReviewCard({
  review,
  placeId,
  onEdit,
}: {
  review: ReviewListItem;
  placeId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = stanceMeta(review.stance);

  function onDelete() {
    if (!confirm("Xoá đánh giá của bạn?")) return;
    startTransition(async () => {
      const res = await deleteReview(placeId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã xoá đánh giá.");
      router.refresh();
    });
  }

  const hlLabels = labelsFor("highlights", review.highlights).map((o) => o.label);
  const cvLabels = labelsFor("caveats", review.caveats).map((o) => o.label);

  return (
    <li className="flex gap-3 py-5 first:pt-0">
      <Avatar className="mt-0.5 size-9 shrink-0">
        {review.author.image && (
          <AvatarImage
            src={review.author.image}
            alt={review.author.name ?? "Vivu-er"}
          />
        )}
        <AvatarFallback>{initial(review.author.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold">
              {review.author.name ?? "Vivu-er ẩn danh"}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STANCE_PILL[meta.tone],
              )}
            >
              {meta.label}
            </span>
          </div>

          {review.isMine && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={pending}
                  aria-label="Tùy chọn đánh giá"
                  className="ml-auto shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 data-[state=open]:bg-muted"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <MoreHorizontal className="size-4" aria-hidden />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={onEdit}>
                  <PenLine className="size-4" aria-hidden />
                  Sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Xoá
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fmtDate(review.createdAt)}
        </p>

        {review.content && (
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {review.content}
          </p>
        )}

        {hlLabels.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {hlLabels.join(" · ")}
          </p>
        )}
        {cvLabels.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Lưu ý: {cvLabels.join(" · ")}
          </p>
        )}
      </div>
    </li>
  );
}

// ── Form viết / sửa ───────────────────────────────────────────────
function ReviewForm({
  open,
  onOpenChange,
  defaultExpanded,
  placeId,
  placeName,
  placeImage,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultExpanded: boolean;
  placeId: string;
  placeName: string;
  placeImage?: string | null;
  initial: MyReview | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stance, setStance] = useState<ReviewStance | null>(
    initial?.stance ?? null,
  );
  const [highlights, setHighlights] = useState<string[]>(
    initial?.highlights ?? [],
  );
  const [caveats, setCaveats] = useState<string[]>(initial?.caveats ?? []);
  const [content, setContent] = useState(initial?.content ?? "");
  // Bung chi tiết khi: mở ở chế độ full (từ section) HOẶC review đã có nhãn/nội
  // dung (để thấy điều mình từng viết). Form được remount mỗi lần mở (key ở
  // PlaceReviews) nên các giá trị khởi tạo luôn đúng theo từng lần mở.
  const hasExisting = Boolean(
    initial &&
      (initial.highlights.length || initial.caveats.length || initial.content),
  );
  const [showDetails, setShowDetails] = useState(defaultExpanded || hasExisting);

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) =>
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );

  function onSubmit() {
    if (!stance) {
      toast.info("Hãy chọn cảm nhận chung của bạn.");
      return;
    }
    startTransition(async () => {
      const res = await submitReview({
        placeId,
        stance,
        highlights,
        caveats,
        content,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã lưu đánh giá của bạn.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg gap-0 overflow-hidden rounded-2xl p-0">
        {/* Header — bối cảnh nơi + xác nhận đã đánh dấu */}
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3 pr-12">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {placeImage ? (
              <Image
                src={placeImage}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <MapPin className="size-5" aria-hidden />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <DialogTitle className="truncate text-base leading-tight">
              Đánh giá {placeName}
            </DialogTitle>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
              <MapPinCheckInside className="size-3.5 shrink-0" aria-hidden />
              Bạn đã đánh dấu đã đến
            </p>
          </div>
        </div>
        <DialogDescription className="sr-only">
          Chọn cảm nhận chung (bắt buộc), thêm nhãn điểm cộng / cần lưu ý và viết
          cảm nhận nếu muốn.
        </DialogDescription>

        {/* Body cuộn */}
        <div className="max-h-[62vh] space-y-5 overflow-y-auto px-5 py-5">
          {/* Cảm nhận chung */}
          <fieldset>
            <legend className="text-sm font-semibold">
              Cảm nhận chung của bạn <span className="text-warm">*</span>
            </legend>
            <div className="mt-2 space-y-1.5">
              {REVIEW_STANCES.map((s) => {
                const Icon = STANCE_ICON[s.value];
                const on = stance === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStance(s.value)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                      on
                        ? STANCE_SELECTED[s.tone]
                        : "border-border/60 hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        on ? "bg-background/70" : PILL_TONE[s.tone],
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 text-sm font-semibold">
                      {s.label}
                    </span>
                    <span
                      className={cn(
                        "ml-auto size-4 shrink-0 rounded-full border-2 transition-colors",
                        on ? "border-current bg-current" : "border-border",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Chi tiết tùy chọn — ẩn để đánh giá nhanh, mở khi muốn nói thêm */}
          {showDetails ? (
            <>
              <ChipPicker
                title="Điểm cộng"
                hint="Điều khiến bạn thích nơi này"
                icon={ThumbsUp}
                iconClass="text-primary"
                options={REVIEW_HIGHLIGHTS}
                selected={highlights}
                onToggle={(v) => toggle(highlights, setHighlights, v)}
                activeClass={HL_CHIP}
              />

              <ChipPicker
                title="Cần lưu ý"
                hint="Điều Vivu-er khác nên biết trước"
                icon={TriangleAlert}
                iconClass="text-warm"
                options={REVIEW_CAVEATS}
                selected={caveats}
                onToggle={(v) => toggle(caveats, setCaveats, v)}
                activeClass={CV_CHIP}
              />

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="review-content"
                    className="text-sm font-semibold"
                  >
                    Kể lại trải nghiệm{" "}
                    <span className="font-normal text-muted-foreground">
                      (tùy chọn)
                    </span>
                  </label>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {content.length}/{MAX_CONTENT}
                  </span>
                </div>
                <Textarea
                  id="review-content"
                  value={content}
                  onChange={(e) =>
                    setContent(e.target.value.slice(0, MAX_CONTENT))
                  }
                  placeholder={`Điều gì khiến chuyến đi ${placeName} đáng nhớ? Mẹo cho người đi sau?`}
                  rows={3}
                  className="mt-2 resize-none"
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="size-4" aria-hidden />
              Thêm chi tiết{" "}
              <span className="font-normal text-muted-foreground">
                (nhãn &amp; cảm nhận)
              </span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <p className="hidden text-xs leading-snug text-muted-foreground sm:block">
            Hiển thị công khai kèm tên bạn.
            <br />
            Sửa hoặc xoá bất cứ lúc nào.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button onClick={onSubmit} disabled={pending || !stance}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {initial ? "Cập nhật" : "Gửi đánh giá"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipPicker({
  title,
  hint,
  icon: Icon,
  iconClass,
  options,
  selected,
  onToggle,
  activeClass,
}: {
  title: string;
  hint: string;
  icon: LucideIcon;
  iconClass: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
  activeClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
        {selected.length > 0 && (
          <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            đã chọn {selected.length}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                on
                  ? cn(activeClass, "border-transparent")
                  : "border-border/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
