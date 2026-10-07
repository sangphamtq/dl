"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  PenLine,
  Trash2,
  ThumbsUp,
  TriangleAlert,
  MapPinCheckInside,
  MapPinPlus,
  MapPin,
  Plus,
  MoreHorizontal,
  Info,
  type LucideIcon,
} from "@/components/icons";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";
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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { LoginDrawer } from "@/components/site/login-drawer";
import { StarRating } from "@/components/site/star-rating";
import { SectionHeading } from "@/components/site/section-heading";
import { submitReview, deleteReview } from "@/app/(site)/diem-den/review-actions";
import {
  REVIEW_STANCES,
  REVIEW_HIGHLIGHTS,
  REVIEW_CAVEATS,
  stanceMeta,
  STANCE_TEXT,
  MAX_CONTENT,
  type ReviewStance,
  type ReviewSummary,
  type StanceTone,
} from "@/lib/review-meta";

export type ReviewListItem = {
  id: string;
  author: { id: string; name: string | null; image: string | null };
  stance: ReviewStance;
  highlights: string[];
  caveats: string[];
  content: string | null;
  createdAt: string;
  isMine: boolean;
};

export type MyReview = {
  stance: ReviewStance;
  highlights: string[];
  caveats: string[];
  content: string | null;
};

const BAR_TONE: Record<StanceTone, string> = {
  positive: "bg-primary",
  posSoft: "bg-primary/45",
  neutral: "bg-foreground/15",
  negSoft: "bg-foreground/25",
  negative: "bg-foreground/40",
};
const STANCE_SELECTED: Record<StanceTone, string> = {
  positive: "border-primary/40 bg-primary/10 text-primary",
  posSoft: "border-primary/30 bg-primary/10 text-primary",
  neutral: "border-foreground/30 bg-muted text-foreground",
  negSoft: "border-warm/40 bg-warm/10 text-warm",
  negative: "border-destructive/40 bg-destructive/10 text-destructive",
};
const HL_CHIP = "bg-primary/10 text-primary";
const CV_CHIP = "bg-warm/10 text-warm";


const initial = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase();

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type ReviewTarget = {
  kind: "place" | "spot";
  id: string;
  slug: string;
  name: string;
  image?: string | null;
};

function targetHref(t: ReviewTarget) {
  return t.kind === "place" ? `/diem-den/${t.slug}` : `/dia-diem/${t.slug}`;
}

export function ReviewsSection({
  target,
  summary,
  reviews,
  myReview,
  isAuthed,
  serif = false,
}: {
  target: ReviewTarget;
  summary: ReviewSummary;
  reviews: ReviewListItem[];
  myReview: MyReview | null;
  isAuthed: boolean;
  serif?: boolean;
}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [stanceFilter, setStanceFilter] = useState<ReviewStance | null>(null);
  const [contentOnly, setContentOnly] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onSync(e: Event) {
      if ((e as CustomEvent<{ id: string }>).detail?.id !== target.id) return;
      setFormOpen(false);
      router.refresh();
    }
    window.addEventListener("halivivu:checkedin", onSync);
    window.addEventListener("halivivu:uncheckin", onSync);
    return () => {
      window.removeEventListener("halivivu:checkedin", onSync);
      window.removeEventListener("halivivu:uncheckin", onSync);
    };
  }, [target.id, router]);

  function onWrite() {
    if (!isAuthed) {
      setLoginOpen(true);
      return;
    }
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

  const writeBtn = (
    <button
      type="button"
      onClick={onWrite}
      className={cn(
        R_CTRL,
        "inline-flex w-full items-center justify-center gap-1.5 border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary/50 hover:text-primary",
      )}
    >
      <PenLine className="size-4" aria-hidden />
      {myReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
    </button>
  );

  return (
    <section id="danh-gia" className="scroll-mt-32">
      <SectionHeading
        serif={serif}
        title={`Vivu-er nói gì về ${target.name}`}
        size={hasReviews ? "lead" : "minor"}
      />

      {hasReviews ? (
        // Hai cột ngăn bằng MỘT vạch dọc, không đóng hộp: không phần nào ở đây là
        // một khối bấm được, và nền trang (xám ở điểm đến, trắng ở địa điểm) khác
        // nhau nên tấm nền riêng sẽ chìm ở một trong hai nơi.
        <div className="mt-7 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-0">
          <div className="md:sticky md:top-28 md:self-start md:pr-10 lg:pr-14">
            <Summary
              summary={summary}
              action={writeBtn}
              activeStance={stanceFilter}
              onSelectStance={(s) =>
                setStanceFilter((cur) => (cur === s ? null : s))
              }
            />
          </div>

          <div className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0 lg:pl-14">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {stanceFilter && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Đang lọc:</span>
                  <span className="font-medium">
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
                    R_BADGE,
                    "flex size-4 items-center justify-center border transition-colors",
                    contentOnly
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {contentOnly && <Glyph name="tick" className="size-3" />}
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
                    target={target}
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
        <div className={cn(R_CARD, "mt-6 border border-border bg-card p-5 sm:p-6")}>
          <p className="font-medium">Chưa có đánh giá nào</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Là Vivu-er đầu tiên chia sẻ cảm nhận về {target.name}.
          </p>
          <button
            type="button"
            onClick={onWrite}
            className={cn(R_CTRL, "mt-4 inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90")}
          >
            <PenLine className="size-4" aria-hidden />
            Đánh dấu đã đến & đánh giá
          </button>
        </div>
      )}

      {!isAuthed && (
        <LoginDrawer
          open={loginOpen}
          onOpenChange={setLoginOpen}
          redirectTo={targetHref(target)}
          title="Đăng nhập để đánh giá"
          description="Đăng nhập và đánh dấu đã đến để chia sẻ cảm nhận của bạn."
        />
      )}
      {isAuthed && (
        <ReviewForm
          key={openKey}
          open={formOpen}
          onOpenChange={setFormOpen}
          defaultExpanded
          target={target}
          initial={myReview}
        />
      )}
    </section>
  );
}

function ScoreInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Cách tính điểm"
          className="relative text-muted-foreground transition-colors before:absolute before:-inset-3 before:content-[''] hover:text-foreground"
        >
          <Info className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="text-sm font-semibold">Sao tổng hợp từ cảm nhận</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mỗi Vivu-er chọn một câu cảm nhận, mỗi câu ứng với một số sao. Điểm là
          trung bình số sao:
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {REVIEW_STANCES.map((s) => (
            <li key={s.value} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{s.label}</span>
              <StarRating value={s.stars} size="size-3" />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function StanceRows({
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
    <div className="-mx-2">
      {summary.stance.map((s) => {
        const on = active === s.value;
        const empty = s.count === 0;
        return (
          <button
            key={s.value}
            type="button"
            disabled={empty}
            onClick={() => onSelect(s.value)}
            aria-pressed={on}
            className={cn(
              R_CTRL,
              "block w-full px-2 py-2 text-left transition-colors",
              empty ? "cursor-default" : on ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <div className="flex items-baseline gap-2 text-sm">
              <span className="w-3 shrink-0 tabular-nums text-muted-foreground">
                {s.stars}
              </span>
              <span
                className={cn(
                  "truncate",
                  empty
                    ? "text-muted-foreground/60"
                    : on
                      ? "font-medium text-foreground"
                      : "text-foreground/80",
                )}
              >
                {s.label}
              </span>
              <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                {s.count}
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden bg-muted">
              <div
                className={cn("h-full", BAR_TONE[s.tone])}
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AspectGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: { value: string; label: string; count: number }[];
  tone?: "warn";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[0.65rem] font-semibold uppercase tracking-[0.14em]",
          tone === "warn" ? "text-warm-ink" : "text-muted-foreground",
        )}
      >
        {title}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {items.map((it) => (
          <li key={it.value} className="text-foreground/90">
            {it.label}
            {it.count > 1 && (
              <b className="ps-1.5 font-semibold tabular-nums text-foreground">{it.count}</b>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({
  summary,
  action,
  activeStance,
  onSelectStance,
}: {
  summary: ReviewSummary;
  action: React.ReactNode;
  activeStance: ReviewStance | null;
  onSelectStance: (s: ReviewStance) => void;
}) {
  const topHl = summary.highlights.slice(0, 3);
  const topCv = summary.caveats.slice(0, 2);
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-6xl font-semibold leading-none tracking-tight tabular-nums">
          {summary.stars.toFixed(1).replace(".", ",")}
        </span>
        <span className="text-sm text-muted-foreground">/ 5</span>
        <ScoreInfo />
      </div>
      <StarRating value={summary.stars} size="size-4" className="mt-3" />
      <p className="mt-1.5 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
        <span>
          <b className="font-semibold tabular-nums text-foreground">{summary.total}</b> đánh giá
        </span>
        <span>
          <b className="font-semibold tabular-nums text-foreground">{summary.worthGoingPct}%</b>{" "}
          thấy đáng đi
        </span>
      </p>

      <div className="mt-5">{action}</div>

      <div className="mt-6 border-t border-border pt-3">
        <StanceRows
          summary={summary}
          active={activeStance}
          onSelect={onSelectStance}
        />
      </div>

      {(topHl.length > 0 || topCv.length > 0) && (
        <div className="mt-4 space-y-4 border-t border-border pt-5">
          {topHl.length > 0 && <AspectGroup title="Điểm cộng" items={topHl} />}
          {topCv.length > 0 && <AspectGroup title="Cần lưu ý" items={topCv} tone="warn" />}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  target,
  onEdit,
}: {
  review: ReviewListItem;
  target: ReviewTarget;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = stanceMeta(review.stance);

  function onDelete() {
    if (!confirm("Xoá đánh giá của bạn?")) return;
    startTransition(async () => {
      const res = await deleteReview({ kind: target.kind, id: target.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã xoá đánh giá.");
      router.refresh();
    });
  }

  // Nhãn điểm cộng / lưu ý KHÔNG lặp lại ở từng đánh giá — cột tổng hợp đã gom
  // chúng; in thêm dưới mỗi bài làm mục này nói mọi thứ hai lần.
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
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold">
            {review.author.name ?? "Vivu-er ẩn danh"}
          </p>
          <p className="shrink-0 text-xs text-muted-foreground">
            {fmtDate(review.createdAt)}
          </p>

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

        <p className="mt-1 flex items-center gap-2">
          <StarRating value={meta.stars} size="size-3.5" />
          <span className={cn("text-sm font-medium", STANCE_TEXT[meta.tone])}>
            {meta.label}
          </span>
        </p>

        {review.content && (
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {review.content}
          </p>
        )}

      </div>
    </li>
  );
}

export type ReviewFormTarget = {
  kind: "place" | "spot";
  id: string;
  name: string;
  image?: string | null;
};

export function ReviewForm({
  open,
  onOpenChange,
  defaultExpanded,
  target,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultExpanded: boolean;
  target: ReviewFormTarget;
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
        target: { kind: target.kind, id: target.id },
        stance,
        highlights,
        caveats,
        content,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("halivivu:checkedin", { detail: { id: target.id } }),
      );
      toast.success("Đã lưu đánh giá — đã đánh dấu đã đến.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(R_CARD, "max-h-[88vh] max-w-lg gap-0 overflow-hidden p-0")}>
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3 pr-12">
          <div className={cn(R_BADGE, "relative size-10 shrink-0 overflow-hidden bg-muted")}>
            {target.image ? (
              <Image
                src={target.image}
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
              {initial ? "Sửa đánh giá" : "Đánh giá"} {target.name}
            </DialogTitle>
            {initial ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
                <MapPinCheckInside className="size-3.5 shrink-0" aria-hidden />
                Bạn đã đến đây
              </p>
            ) : (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warm">
                <MapPinPlus className="size-3.5 shrink-0" aria-hidden />
                Gửi đánh giá để xác nhận đã đến
              </p>
            )}
          </div>
        </div>
        <DialogDescription className="sr-only">
          Chọn cảm nhận chung (bắt buộc), thêm nhãn điểm cộng / cần lưu ý và viết
          cảm nhận nếu muốn.
        </DialogDescription>

        <div className="max-h-[62vh] space-y-5 overflow-y-auto px-5 py-5">
          <fieldset>
            <legend className="text-sm font-semibold">
              Cảm nhận chung của bạn <span className="text-warm">*</span>
            </legend>
            <div className="mt-2 space-y-1.5">
              {REVIEW_STANCES.map((s) => {
                const on = stance === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStance(s.value)}
                    aria-pressed={on}
                    className={cn(
                      R_CTRL,
                      "flex w-full items-center gap-2.5 border px-3 py-2 text-left transition-colors",
                      on
                        ? STANCE_SELECTED[s.tone]
                        : "border-border/60 hover:bg-muted/60",
                    )}
                  >
                    <StarRating value={s.stars} size="size-3.5" className="shrink-0" />
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
                  placeholder={`Điều gì khiến chuyến đi ${target.name} đáng nhớ? Mẹo cho người đi sau?`}
                  rows={3}
                  className="mt-2 resize-none"
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className={cn(R_CTRL, "flex w-full items-center justify-center gap-1.5 border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground")}
            >
              <Plus className="size-4" aria-hidden />
              Thêm chi tiết{" "}
              <span className="font-normal text-muted-foreground">
                (nhãn &amp; cảm nhận)
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <p className="hidden text-xs leading-snug text-muted-foreground sm:block">
            {initial
              ? "Hiển thị công khai kèm tên bạn."
              : "Gửi = đánh dấu đã đến."}
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
              {initial ? "Cập nhật" : "Đánh dấu đã đến"}
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
                R_CTRL,
                "border px-3 py-1 text-sm font-medium transition-colors",
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
