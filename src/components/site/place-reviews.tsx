"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  PenLine,
  Trash2,
  Heart,
  CircleCheck,
  Meh,
  Frown,
  ThumbsUp,
  TriangleAlert,
  MapPinCheckInside,
  MapPinPlus,
  MapPin,
  Plus,
  MoreHorizontal,
  Check,
  Info,
  type LucideIcon,
} from "@/components/icons";
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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { LoginDrawer } from "@/components/site/login-drawer";
import { StarRating } from "@/components/site/star-rating";
import { SectionHeading } from "@/components/site/section-heading";
import { submitReview, deleteReview } from "@/app/diem-den/review-actions";
import {
  REVIEW_STANCES,
  REVIEW_HIGHLIGHTS,
  REVIEW_CAVEATS,
  stanceMeta,
  labelsFor,
  MAX_CONTENT,
  SCORE_POS,
  SCORE_NEG,
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
// Card cảm nhận khi được chọn trong FORM viết đánh giá — cả card nhuộm tông.
const STANCE_SELECTED: Record<StanceTone, string> = {
  positive: "border-primary/40 bg-primary/10 text-primary",
  posSoft: "border-primary/30 bg-primary/10 text-primary",
  negSoft: "border-warm/40 bg-warm/10 text-warm",
  negative: "border-destructive/40 bg-destructive/10 text-destructive",
};
// Chip nhãn trong form (chọn điểm cộng / cần lưu ý).
const HL_CHIP = "bg-primary/10 text-primary";
const CV_CHIP = "bg-warm/10 text-warm";

// Màu CHỮ của mức cảm nhận trên danh sách review (không nền, không viền).
const STANCE_TEXT: Record<StanceTone, string> = {
  positive: "text-primary",
  posSoft: "text-primary/85",
  negSoft: "text-warm",
  negative: "text-destructive",
};

const initial = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase();

// Chỉ hiện ngày — giờ trong ngày không có giá trị với người đọc đánh giá.
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Đích đánh giá: điểm đến (place) hoặc địa điểm (spot).
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

// ── Section chính ─────────────────────────────────────────────────
export function ReviewsSection({
  target,
  summary,
  reviews,
  myReview,
  isAuthed,
}: {
  target: ReviewTarget;
  summary: ReviewSummary;
  reviews: ReviewListItem[];
  myReview: MyReview | null;
  isAuthed: boolean;
}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0); // đổi mỗi lần mở → remount form
  const [showAll, setShowAll] = useState(false);
  const [stanceFilter, setStanceFilter] = useState<ReviewStance | null>(null);
  const [contentOnly, setContentOnly] = useState(false);
  const router = useRouter();

  // Đồng bộ khi check-in/bỏ đánh dấu xảy ra ở nơi khác (nút hero, form khác):
  // refresh để danh sách + tổng hợp cập nhật (review hiện/ẩn theo check-in).
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

  // Mở form đánh giá (đánh giá = xác nhận đã đến — submit sẽ tự check-in).
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
      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
    >
      <PenLine className="size-4" aria-hidden />
      {myReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
    </button>
  );

  return (
    <section id="danh-gia" className="scroll-mt-32">
      {/* Cùng khuôn tiêu đề với MỌI mục khác của trang (nhãn viết tay + tiêu đề
          display + đường bay + con số). Đây là cái tên của một mục trong cùng
          một trang, nên nó phải đọc ra như các mục kia — không phải chỗ để tôi
          tự ý dùng biến thể khác. Không truyền `href`: đánh giá không có trang
          danh mục riêng, chỗ đó dành cho nút viết đánh giá. */}
      <SectionHeading
        eyebrow="Đánh giá"
        title={`Vivu-er nói gì về ${target.name}`}
        count={hasReviews ? summary.total : undefined}
        unit="đánh giá"
        actions={writeBtn}
      />

      {hasReviews ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
          {/* Trái: tổng hợp (dính khi cuộn trên desktop) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            {/* Mặt thẻ cho cả hai cột. Đây là section DUY NHẤT của trang không
                có thẻ nào: mọi mục khác (Địa điểm, Ẩm thực, Lưu trú, Cộng đồng)
                đều lấp dải bằng ô ảnh hoặc khung `bg-card`, nền `muted` chỉ lộ
                ra ở khe. Ở đây chữ và vạch mảnh nằm thẳng trên nền nên gần như
                cả dải là màu `muted` — cùng một tông ấy mà đọc ra tối và đục
                hơn hẳn các mục trên. Giải pháp không phải bỏ tint (sẽ vỡ nhịp
                trắng–nhạt xen kẽ của trang) mà là trả section về đúng ngôn ngữ
                thẻ của các mục còn lại. */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <Summary
                summary={summary}
                activeStance={stanceFilter}
                onSelectStance={(s) =>
                  setStanceFilter((cur) => (cur === s ? null : s))
                }
              />
            </div>
          </div>

          {/* Phải: danh sách đánh giá */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
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
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <p className="font-medium">Chưa có đánh giá nào</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Là Vivu-er đầu tiên chia sẻ cảm nhận về {target.name}.
          </p>
          <button
            type="button"
            onClick={onWrite}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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

// ── Panel hero tổng hợp — "mặt" biên tập, đúng ngôn ngữ design system ─
// Nút ⓘ giải thích cách tính điểm — tự đọc trọng số SCORE_POS/SCORE_NEG (đổi
// trọng số trong review-meta là bảng này tự cập nhật).
function ScoreInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Cách tính điểm đáng đi"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="text-sm font-semibold">Sao tổng hợp từ cảm nhận</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Không phải sao khách tự chấm — sao suy từ cảm nhận của Vivu-er theo
          trọng số (mỗi đánh giá luôn đẩy một hướng cố định):
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {REVIEW_STANCES.map((s) => {
            const pos = SCORE_POS[s.value];
            const neg = SCORE_NEG[s.value];
            return (
              <li
                key={s.value}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted-foreground">{s.label}</span>
                <span className="shrink-0 tabular-nums font-medium">
                  {pos > 0 ? (
                    <span className="text-primary">+{pos} điểm</span>
                  ) : neg > 0 ? (
                    <span className="text-warm">−{neg} điểm</span>
                  ) : (
                    <span className="text-muted-foreground">trung tính</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 border-t border-border/50 pt-2 text-xs text-muted-foreground">
          Sao = phần cộng ÷ (cộng + trừ) × 5.
        </p>
      </PopoverContent>
    </Popover>
  );
}

// Phân bố 4 mức — mỗi hàng là một nút lọc. Nhãn + số + % viết thẳng, thanh mảnh
// bên dưới. Không chấm màu, không viên chip: nhãn đã nói rõ mức nào, thêm một
// chấm màu cạnh nó chỉ là màu cho có.
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
              "block w-full rounded-lg px-2 py-2 text-left transition-colors",
              empty ? "cursor-default" : on ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <div className="flex items-baseline gap-2 text-sm">
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
              <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                {s.pct}%
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
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

// Nhãn nổi bật: một dòng tiêu đề + các nhãn nối bằng dấu chấm giữa. Bản trước
// đóng mỗi nhãn thành một viên chip màu — bốn nhãn thành bốn viên, cộng với chip
// trên từng đánh giá bên phải nữa thì cả mục thành một rổ viên thuốc.
function AspectGroup({
  title,
  items,
}: {
  title: string;
  items: { value: string; label: string; count: number }[];
}) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{title}: </span>
      {items.map((it, i) => (
        <span key={it.value}>
          {i > 0 && <span className="text-muted-foreground"> · </span>}
          <span className="text-foreground/90">{it.label}</span>
          {it.count > 1 && (
            <span className="tabular-nums text-muted-foreground"> {it.count}</span>
          )}
        </span>
      ))}
    </p>
  );
}

// Cột tổng hợp. Không bọc card nổi có đổ bóng: nó là một khối chữ + mấy thanh
// mảnh, dựng thành thẻ nổi chỉ để trông "có thiết kế".
//
// KHÔNG in câu kết luận kiểu "Gần như ai cũng thấy đáng đi": đó là một câu do
// hàm if-else sinh ra theo ngưỡng phần trăm, đọc như lời biên tập mà không ai
// viết. Số liệu tự nói đủ.
function Summary({
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
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums leading-none">
          {summary.stars.toFixed(1).replace(".", ",")}
        </span>
        <span className="text-sm text-muted-foreground">/ 5</span>
        <ScoreInfo />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <StarRating value={summary.stars} size="size-4" />
        <span className="text-sm tabular-nums text-muted-foreground">
          {summary.total} đánh giá
        </span>
      </div>

      <div className="mt-5 border-t border-border/60 pt-3">
        <StanceRows
          summary={summary}
          active={activeStance}
          onSelect={onSelectStance}
        />
      </div>

      {(topHl.length > 0 || topCv.length > 0) && (
        <div className="mt-4 space-y-1.5 border-t border-border/60 pt-4">
          {topHl.length > 0 && <AspectGroup title="Điểm cộng" items={topHl} />}
          {topCv.length > 0 && <AspectGroup title="Cần lưu ý" items={topCv} />}
        </div>
      )}
    </div>
  );
}

// ── Một review ────────────────────────────────────────────────────
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

        {/* Mức cảm nhận: CHỮ có màu theo tông, không viên chip. Mỗi đánh giá một
            viên chip màu, cạnh cột tổng hợp cũng đầy chip, thì cả mục thành một
            rổ viên thuốc. */}
        <p className={cn("mt-1 text-sm font-medium", STANCE_TEXT[meta.tone])}>
          {meta.label}
        </p>

        {review.content && (
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {review.content}
          </p>
        )}

        {hlLabels.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {hlLabels.join(" · ")}
          </p>
        )}
        {cvLabels.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Lưu ý: {cvLabels.join(" · ")}
          </p>
        )}
      </div>
    </li>
  );
}

// ── Form viết / sửa ───────────────────────────────────────────────
// Target rút gọn cho form (không cần slug/region) — dùng chung ReviewsSection & CheckInButton.
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
      // Gửi review = đã xác nhận "đã đến": báo cho nút check-in + section cập nhật.
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
      <DialogContent className="max-h-[88vh] max-w-lg gap-0 overflow-hidden rounded-2xl p-0">
        {/* Header — bối cảnh nơi + xác nhận đã đánh dấu */}
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3 pr-12">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
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
