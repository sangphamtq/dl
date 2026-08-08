"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  BedDouble,
  ArrowRight,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  AccommodationDetail,
  type AccommodationDetailData,
} from "@/components/site/accommodation-detail";

type Stay = AccommodationDetailData;

// Khu vực hiển thị trên thẻ: đoạn cuối của địa chỉ SAU KHI bỏ những đoạn chỉ
// nhắc lại tên điểm đến ("TP. Phan Thiết"). Không bỏ thì mọi thẻ đều ghi đúng
// một chữ "TP. Phan Thiết" — vô nghĩa vì cả trang đã là Phan Thiết rồi; bỏ đi
// thì ra "Mũi Né" / "Hàm Tiến", tức là thứ khách thật sự cân nhắc.
function areaOf(address: string | null, placeName: string): string | null {
  if (!address) return null;
  const strip = (s: string) =>
    s
      .toLowerCase()
      .replace(/^(tp\.?|thành phố|thị xã|huyện|xã|phường)\s+/i, "")
      .trim();
  const place = strip(placeName);
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => strip(p) !== place);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB NƠI LƯU TRÚ — danh bạ chỗ ở ĐÃ XÁC MINH CHÍNH CHỦ, không phải OTA.
//
// Cả mục này chỉ có một lý do tồn tại (xem CLAUDE.md): thứ mà group Facebook
// không làm được là **niềm tin có cấu trúc** — đúng chủ, đúng kênh, cảnh báo cọc.
// Nên thiết kế đặt trạng thái xác minh làm XƯƠNG SỐNG chứ không phải một huy
// hiệu nhỏ ở góc ảnh:
//
//  · Danh sách TÁCH LÀM HAI NHÓM — "Đã xác minh chính chủ" và "Chưa xác minh",
//    mỗi nhóm có một câu nói rõ điều đó nghĩa là gì. Trộn chung rồi phân biệt
//    bằng một cái badge thì người đọc lướt qua sẽ không thấy sự khác nhau —
//    mà sự khác nhau đó chính là sản phẩm.
//  · Vì đã tách nhóm nên BỎ nút lọc "chỉ chỗ đã xác minh": nó thành thừa.
//  · THẺ GIỮ TỐI THIỂU: ảnh + huy hiệu xác minh, loại hình · khu vực, tên, mô
//    tả. Kênh liên hệ, tag và chính sách cọc đều đã gỡ khỏi thẻ — chúng sống ở
//    popup / trang chi tiết, tức là đúng lúc khách đã chọn một chỗ cụ thể để
//    cân nhắc, chứ không phải khi còn đang lướt so sánh cả chục thẻ.
//
// HAI ĐÍCH mỗi thẻ, tách bằng VỊ TRÍ để khỏi giẫm nhau:
//  · Bấm bất kỳ đâu trong thẻ → trang chi tiết `/luu-tru/[slug]` (đích chia sẻ,
//    chủ nhà dán vào group FB). Link thật gắn ở TÊN quán rồi `after:inset-0`
//    trải vùng bấm ra cả thẻ — trình đọc màn hình vẫn đọc đúng tên, không phải
//    một cái "link" trống.
//  · "Xem nhanh" → popup, `z-10` để nổi trên vùng bấm đó. Có HAI bản, tách
//    bằng `@media (pointer: …)`: máy có chuột thì lúc nghỉ thẻ SẠCH TRƠN, rê
//    vào ảnh mới hiện nhãn giữa khung; máy cảm ứng (không có hover) thì một
//    viên nhỏ luôn hiện ở góc ảnh.
// ═══════════════════════════════════════════════════════════════════════════
export function AccommodationSection({
  accommodations,
  placeName,
  openSlug,
}: {
  accommodations: Stay[];
  placeName: string;
  openSlug?: string;
}) {
  const bySlug = useMemo(
    () => new Map(accommodations.map((a) => [a.slug, a])),
    [accommodations],
  );
  const [selected, setSelected] = useState<string | null>(() =>
    openSlug && bySlug.has(openSlug) ? openSlug : null,
  );
  const [cat, setCat] = useState("all");

  const active = selected ? bySlug.get(selected) : undefined;

  const catOptions = useMemo(() => {
    const present = new Set(accommodations.map((a) => a.category).filter(Boolean));
    return Object.keys(ACCOMMODATION_CATEGORY_LABELS).filter((c) =>
      present.has(c),
    );
  }, [accommodations]);

  // Dữ kiện thật của danh bạ, thay cho lời hứa chung chung.
  const verifiedCount = accommodations.filter((a) => a.isVerified).length;
  const zaloCount = accommodations.filter((a) => a.zalo).length;

  const filtered = accommodations.filter(
    (a) => cat === "all" || a.category === cat,
  );
  const verified = filtered.filter((a) => a.isVerified);
  const unverified = filtered.filter((a) => !a.isVerified);

  return (
    <div>
      {/* ── Mở đầu: định vị + ba dữ kiện tính từ chính dữ liệu ── */}
      <header>
        <p className="text-sm font-semibold text-primary">Nơi lưu trú</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Chỗ ở đã xác minh chính chủ ở {placeName}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Stat icon={BedDouble}>
            <b className="font-semibold text-foreground">
              {accommodations.length}
            </b>{" "}
            chỗ ở
          </Stat>
          {verifiedCount > 0 && (
            <Stat icon={BadgeCheck}>
              <b className="font-semibold text-foreground">{verifiedCount}</b> đã
              xác minh chính chủ
            </Stat>
          )}
          {zaloCount > 0 && (
            <Stat icon={MessageCircle}>
              <b className="font-semibold text-foreground">{zaloCount}</b> có Zalo
              trực tiếp
            </Stat>
          )}
        </div>
      </header>

      {/* ── Dải an toàn: nói thẳng đây KHÔNG phải nơi đặt phòng, và quy tắc
             chuyển khoản. Đây là câu phải đọc trước khi cọc, không phải một
             đoạn giới thiệu — nên nó là một dải riêng, không trộn vào header. ── */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-primary/[0.07] p-4 sm:p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">
            Đây là danh bạ thông tin, không phải nơi đặt phòng.
          </p>
          <p className="mt-1 text-muted-foreground">
            Bạn tự chốt trực tiếp với chủ nhà qua kênh hiển thị tại đây. Chỉ
            chuyển khoản tới tài khoản do chính chủ cung cấp qua các kênh này —
            cảnh giác số tài khoản lạ trong phần bình luận.
          </p>
        </div>
      </div>

      {/* ── Lọc theo loại hình. Không còn nút "chỉ chỗ đã xác minh": danh sách
             đã tách sẵn hai nhóm nên nút đó thành thừa. ── */}
      {catOptions.length > 1 && (
        <div className="hide-scrollbar mt-6 flex items-center gap-2 overflow-x-auto">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            Tất cả
          </Chip>
          {catOptions.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {label(ACCOMMODATION_CATEGORY_LABELS, c)}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            Không có chỗ ở nào thuộc loại hình này.
          </p>
          <button
            type="button"
            onClick={() => setCat("all")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả {accommodations.length} chỗ ở
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {verified.length > 0 && (
            <StayGroup
              tone="verified"
              title="Đã xác minh chính chủ"
              count={verified.length}
              note="Đã liên hệ và xác nhận đây đúng là chủ cơ sở; kênh liên hệ bên dưới là kênh thật."
              stays={verified}
              placeName={placeName}
              onOpen={setSelected}
            />
          )}
          {unverified.length > 0 && (
            <StayGroup
              tone="unverified"
              title="Chưa xác minh"
              count={unverified.length}
              note="Chưa liên hệ xác nhận được chính chủ. Thông tin để tham khảo — tự kiểm tra kỹ trước khi đặt cọc."
              stays={unverified}
              placeName={placeName}
              onOpen={setSelected}
            />
          )}
        </div>
      )}

      {/* Popup chi tiết — cùng khuôn với tab Ẩm thực: dưới `sm` dán đáy màn
          hình và trượt lên, từ `sm` là popup giữa màn đủ rộng cho bố cục hai
          cột ảnh | nội dung. */}
      <Dialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full max-w-none gap-0 overflow-hidden border-0 p-0 shadow-2xl",
            "top-auto bottom-0 left-0 max-h-[92dvh] translate-x-0 translate-y-0 rounded-3xl rounded-b-none",
            "data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
            "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:max-w-[min(64rem,calc(100vw-3rem))] sm:rounded-b-3xl",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0",
          )}
        >
          {active && (
            <>
              <AccommodationDetail data={active} />
              {/* Nút đóng tự dựng: chữ X trần mặc định chìm nghỉm trên ảnh. */}
              <DialogClose
                className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                aria-label="Đóng"
              >
                <X className="size-4" aria-hidden />
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
      {children}
    </span>
  );
}

// Một nhóm theo trạng thái xác minh — tiêu đề nói rõ trạng thái đó NGHĨA LÀ GÌ.
// "Đã xác minh" mà không giải thích thì cũng chỉ là một cái nhãn tự phong.
function StayGroup({
  tone,
  title,
  count,
  note,
  stays,
  placeName,
  onOpen,
}: {
  tone: "verified" | "unverified";
  title: string;
  count: number;
  note: string;
  stays: Stay[];
  placeName: string;
  onOpen: (slug: string) => void;
}) {
  const ok = tone === "verified";
  return (
    <section>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            ok ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {ok ? (
            <BadgeCheck className="size-5" aria-hidden />
          ) : (
            <ShieldAlert className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
            <span className="ml-2 text-base font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {note}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stays.map((a) => (
          <StayCard
            key={a.slug}
            a={a}
            placeName={placeName}
            onOpen={() => onOpen(a.slug)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Thẻ chỗ ở: MỘT khuôn duy nhất ──
// Bản cũ có hai khuôn (một thẻ "Đề xuất" lớn + hàng ngang cho phần còn lại),
// mà thẻ lớn chỉ to hơn chứ không mang thêm thông tin gì; tệ hơn, "đề xuất" chỉ
// là phần tử đầu danh sách nên nó ĐỔI theo bộ lọc — một nhãn hứa hẹn sự tuyển
// chọn biên tập vốn không tồn tại.
function StayCard({
  a,
  placeName,
  onOpen,
}: {
  a: Stay;
  placeName: string;
  onOpen: () => void;
}) {
  const area = areaOf(a.address, placeName);
  const category =
    (a.category ? label(ACCOMMODATION_CATEGORY_LABELS, a.category) : null) ??
    "Lưu trú";

  return (
    // Thẻ KHÔNG còn là một nút. Cả thẻ dẫn sang trang chi tiết `/luu-tru/[slug]`
    // bằng "stretched link": link thật nằm ở TÊN quán (nên trình đọc màn hình
    // đọc đúng "Sunny House Homestay" chứ không phải "link"), rồi `after:inset-0`
    // trải vùng bấm ra cả thẻ. Nút "Xem nhanh" đặt trên ẢNH, tách hẳn khỏi khối
    // chữ và nâng `z-10` để nằm trên vùng bấm đó — hai đích không giẫm nhau.
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-sm shadow-black/5 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/5">
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
        <Image
          src={coverUrl(a.images, a.slug)}
          alt={a.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            !a.isVerified && "saturate-[0.7]",
          )}
        />
        {a.isVerified ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
            Đã xác minh
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
            Chưa xác minh
          </span>
        )}

        {/* ── Xem nhanh — hai bản, mỗi thiết bị chỉ thấy đúng MỘT ──
            Tách bằng `@media (pointer: …)` chứ không phải breakpoint bề ngang:
            cái quyết định ở đây là CÓ CHUỘT HAY KHÔNG, không phải màn to hay
            nhỏ (máy tính bảng có cảm ứng vẫn màn rộng). Dùng `display` để ẩn
            chứ không dùng `opacity`, nhờ vậy cái bị ẩn cũng biến khỏi cây trợ
            năng — trình đọc màn hình chỉ gặp một nút, không phải hai. */}

        {/* Chuột: lúc nghỉ thẻ sạch trơn; rê vào thì ảnh tối nhẹ và nhãn hiện
            giữa khung. Cũng hiện khi tab tới bằng bàn phím. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Xem nhanh ${a.name}`}
          className="absolute inset-0 z-10 hidden place-items-center bg-black/30 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:fine)]:grid"
        >
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-lg">
            Xem nhanh
          </span>
        </button>

        {/* Cảm ứng: không có hover nên phải luôn hiện — viên nhỏ ở góc, không
            phủ ảnh. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Xem nhanh ${a.name}`}
          className="absolute bottom-2.5 right-2.5 z-10 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md [@media(pointer:fine)]:hidden"
        >
          Xem nhanh
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{category}</span>
          {area && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {area}
              </span>
            </>
          )}
        </p>

        {/* Mũi tên "đi tiếp" nằm ngay cạnh TÊN — đó mới là chỗ mắt dừng lại, và
            nhờ vậy khỏi cần một hàng CTA riêng ở đáy thẻ. */}
        <h4 className="mt-1 flex items-start justify-between gap-2 font-semibold leading-snug tracking-tight">
          <Link
            href={`/luu-tru/${a.slug}`}
            className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
          >
            {a.name}
          </Link>
          <ArrowRight
            className="mt-0.5 size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </h4>

        {/* THẺ CHỈ CÒN BỐN THỨ: loại hình · khu vực → tên → mô tả.
            Đã lần lượt bỏ khỏi thẻ: hàng icon kênh liên hệ (12/12 chỗ đều có
            Zalo nên nó không phân biệt được thẻ nào với thẻ nào), hàng tag (mô
            tả đã nói cùng ý bằng câu văn đọc được), và dòng chính sách cọc.
            Cọc & kênh liên hệ vẫn còn nguyên ở popup và trang chi tiết — tức là
            đúng lúc khách đã chọn một chỗ cụ thể để cân nhắc, chứ không phải khi
            còn đang lướt so sánh mười hai thẻ. */}
        {a.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {a.description}
          </p>
        )}
      </div>
    </article>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
