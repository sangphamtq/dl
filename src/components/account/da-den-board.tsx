"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CTRL } from "@/lib/radius";
import { PROVINCE_COUNT, PROVINCE_NAME_BY_SLUG } from "@/lib/provinces";
import { REGIONS } from "@/lib/regions";
import { VietnamMap } from "@/components/account/vietnam-map";
import {
  MapCustomizeButton,
  MapExportButton,
} from "@/components/account/share-map-button";
import type { MapCardOptions } from "@/lib/map-card";
import { toggleCheckIn } from "@/app/(site)/diem-den/check-in-actions";

// Checklist nhóm theo miền; mỗi miền tỉnh sắp theo bảng chữ cái tiếng Việt.
const REGION_GROUPS = REGIONS.map((r) => ({
  label: r.label,
  provinces: [...r.slugs]
    .map((slug) => ({ slug, name: PROVINCE_NAME_BY_SLUG[slug] ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi")),
}));

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

/* ──────────────────────────────────────────────────────────────────
   Trang "Nơi đã đến": bản đồ + checklist tỉnh, chung một state nên bấm ở đâu
   cũng cập nhật cả hai.

   Bản trước đóng cả hai vào MỘT khung `rounded-3xl border bg-card/50 shadow-lg
   backdrop-blur`, với một thẻ tiến độ bo tròn nổi đè lên góc bản đồ. Bốn thứ
   phải sửa, và cả bốn đều là luật chung của dự án chứ không phải khẩu vị:

     · **bo góc lạc hệ** — `rounded-3xl` (24px) / `2xl` (16px) / `full` trên một
       site chạy bộ 6 · 4 · 3px;
     · **hai độ nổi cùng lúc** trên một khối (viền + bóng + nền mờ), trong khi
       quy ước là một khối khai độ nổi ĐÚNG MỘT lần;
     · **khung bọc không mang thông tin** — nó chỉ vẽ lại một hình chữ nhật
       quanh hai thứ vốn đã tự đứng được (tấm bản đồ và một danh sách có tiêu đề
       miền làm neo). Bỏ khung thì bản đồ sáng hẳn lên trên nền trang;
     · **thẻ tiến độ trôi trên bản đồ** — bản đồ Việt Nam rất hẹp và dọc nên nó
       không thực sự đè lên gì, chỉ lửng lơ giữa một vùng trống. Con số tiến độ
       là chuyện của CẢ TRANG, nên nó lên đầu trang.

   Vòng tròn phần trăm cũng đổi thành **một vạch ngang**: vạch nói cùng lượng
   thông tin trong một hình đã có sẵn trong hệ (chữ nhật, bo `R_BADGE`), và
   quan trọng hơn — **ảnh chia sẻ mà trang này xuất ra đã dùng đúng một vạch
   ngang** (`buildShareCard`). Nay trang và ảnh khớp nhau.
   ────────────────────────────────────────────────────────────────── */
export function DaDenBoard({
  initialVisited,
  initialOptions,
  accountName,
  slugToId,
}: {
  initialVisited: string[];
  /** Tuỳ chỉnh đã lưu của CHÍNH người này (`User.mapCardOptions`). */
  initialOptions: MapCardOptions;
  /** Tên trên tài khoản — điền sẵn vào ảnh, và là chỗ "Đặt lại" quay về. */
  accountName: string;
  slugToId: Record<string, string>;
}) {
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(initialVisited),
  );
  // Giữ bản sao ở client để trang đổi màu NGAY khi lưu, không chờ vòng
  // `revalidatePath` của server action.
  const [opts, setOpts] = useState<MapCardOptions>(initialOptions);
  const accent = opts.accent;
  const [, startTransition] = useTransition();

  const total = visited.size;
  const percent = Math.round((total / PROVINCE_COUNT) * 100);
  const left = PROVINCE_COUNT - total;

  function setMark(slug: string, on: boolean) {
    setVisited((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  function toggle(slug: string, name: string) {
    const id = slugToId[slug];
    if (!id) {
      toast.error(`${name} chưa có dữ liệu để đánh dấu.`);
      return;
    }
    const was = visited.has(slug);
    setMark(slug, !was); // optimistic
    startTransition(async () => {
      const res = await toggleCheckIn({ kind: "place", id });
      if (!res.ok) {
        setMark(slug, was);
        toast.error(res.error);
        return;
      }
      setMark(slug, res.data.checked);
      if (was && res.data.checked)
        toast(`${name} vẫn được đánh dấu vì có điểm đến con đã đến.`);
    });
  }

  return (
    <>
      {/* ── Dải trạng thái của cả trang ────────────────────────────────
          Con số lớn đứng trước, hai dữ kiện phụ đi sau bằng đúng khuôn
          "glyph + số đậm  khoảng trắng rộng" của mọi mục trên site — không dấu
          chấm giữa. */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="flex items-baseline gap-2">
            {/* Con số để màu CHỮ CHÍNH, không nhuộm theo màu nhấn: `accent` là
                một hex người dùng tự chọn nên không ai bảo đảm nó đọc được trên
                nền trang (cam mặc định `#e3852f` đã chỉ đạt ~2,5:1). Luật của
                trang này: **màu nhấn chỉ tô MẢNG (bản đồ, vạch tiến độ, ô đánh
                dấu), không bao giờ tô CHỮ.** */}
            <span className="font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-6xl">
              {total}
            </span>
            <span className="text-lg font-medium text-muted-foreground">
              / {PROVINCE_COUNT} tỉnh thành
            </span>
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Stat glyph="route">
              <N>{percent}%</N> bản đồ đã tô
            </Stat>
            {left > 0 && (
              <Stat glyph="pin">
                còn <N>{left}</N> nơi chưa tới
              </Stat>
            )}
          </div>
        </div>

        {/* HAI nút, hai việc khác hẳn nhau về tần suất: chỉnh là việc làm MỘT
            LẦN (và nay lưu vĩnh viễn), xuất ảnh là việc làm LẠI mỗi lần đi thêm
            một tỉnh. Bản trước gộp thành một nút "Tuỳ chỉnh & tải ảnh" nên muốn
            tấm ảnh mới vẫn phải mở bảng điều khiển, đi qua sáu ô nhập rồi mới
            tới nút tải. */}
        <div className="flex flex-wrap items-center gap-2">
          <MapCustomizeButton
            visited={[...visited]}
            total={total}
            opts={opts}
            accountName={accountName}
            onSaved={setOpts}
          />
          <MapExportButton
            visited={[...visited]}
            total={total}
            opts={opts}
          />
        </div>
      </div>

      {/* Vạch tiến độ — VUÔNG (bo `R_BADGE`), tràn hết bề ngang nội dung: nó là
          thanh trạng thái của cả trang chứ không phải một huy hiệu của riêng
          tấm bản đồ. */}
      <div
        className={cn(R_BADGE, "mt-5 h-2 w-full overflow-hidden bg-muted")}
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={PROVINCE_COUNT}
        aria-label={`Đã đến ${total} trên ${PROVINCE_COUNT} tỉnh thành`}
      >
        <div
          className="h-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `${(total / PROVINCE_COUNT) * 100}%`,
            backgroundColor: accent,
          }}
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Bấm vào tỉnh trên bản đồ hoặc trong danh sách để đánh dấu đã đến.
      </p>

      {/* ── Bản đồ + checklist, KHÔNG khung bọc ────────────────────────
          Checklist để ĐÚNG HAI cột (bản trước là 3 từ `sm`). Hai lý do, cùng
          một phép đo: ở 3 cột cả danh sách chỉ cao ~370px trong khi tấm bản đồ
          bên trái cao ~600px, nên nửa dưới cột phải là một mảng trắng to bằng
          một phần ba khối — thứ dễ thấy nhất trên bản cũ. Hai cột kéo danh sách
          lên ~620px, vừa khớp bản đồ, và mỗi ô rộng gấp rưỡi nên tên dài
          ("Quảng Ninh", "Thừa Thiên Huế") thôi phải bó sát mép. */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <VietnamMap
            visited={visited}
            accent={accent}
            className="mx-auto w-full max-w-[34rem]"
            onToggle={(slug) =>
              toggle(slug, PROVINCE_NAME_BY_SLUG[slug] ?? slug)
            }
          />
        </div>

        {/* Tên tỉnh giữ font viết tay (Mali): đây đúng vai "nhãn viết tay" mà
            skill `design` dành cho font đó, và nó là chữ DUY NHẤT của trang
            khớp với tấm ảnh chia sẻ — ảnh cũng nhúng Mali cho checklist. Tiêu
            đề miền thì KHÔNG: nhãn cấu trúc dùng bộ chữ chung. */}
        <div>
          <h2 className={cn(MICRO, "text-muted-foreground")}>
            Đánh dấu theo miền
          </h2>

          <div className="mt-4 space-y-7">
            {REGION_GROUPS.map((region) => {
              const done = region.provinces.filter((p) =>
                visited.has(p.slug),
              ).length;
              return (
                <section key={region.label}>
                  <h3 className="flex items-baseline gap-2 border-b border-border pb-2">
                    <span className={cn(MICRO, "text-foreground")}>
                      {region.label}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      <b className="font-semibold text-foreground">{done}</b>/
                      {region.provinces.length}
                    </span>
                  </h3>

                  <ul className="mt-1.5 columns-2 gap-x-4 [&>li]:break-inside-avoid">
                    {region.provinces.map(({ slug, name }) => (
                      <li key={slug}>
                        <ProvinceRow
                          name={name}
                          on={visited.has(slug)}
                          accent={accent}
                          onClick={() => toggle(slug, name)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* Một dòng tỉnh. Ô đánh dấu VUÔNG `R_BADGE` — cùng hình với ô "Chỉ đánh giá có
   viết" ở mục Đánh giá; ô tròn là hình của RADIO (chọn một trong nhiều), trong
   khi đây là 34 công tắc độc lập. */
function ProvinceRow({
  name,
  on,
  accent,
  onClick,
}: {
  name: string;
  on: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        R_CTRL,
        "group flex w-full items-center gap-2.5 py-1.5 pr-2 text-left transition-colors hover:bg-muted/60",
      )}
    >
      <span
        // Ô đã đánh dấu tô bằng màu nhấn của người dùng → qua `style`. Dấu tick
        // để TRẮNG: nền ô là một hex bất kỳ nên không suy ra được màu chữ tương
        // phản, mà trắng trên sáu màu gợi ý lẫn phần lớn màu tự chọn đều đọc
        // được (người chọn màu nhấn hầu như luôn chọn màu đậm).
        style={on ? { backgroundColor: accent, borderColor: accent } : undefined}
        className={cn(
          R_BADGE,
          "grid size-[1.125rem] shrink-0 place-items-center border transition-colors",
          on ? "text-white" : "border-border group-hover:border-foreground/40",
        )}
      >
        {on && <Glyph name="tick" className="size-3" />}
      </span>
      <span
        style={{ fontFamily: "var(--font-rounded)" }}
        className={cn(
          "truncate text-[0.9375rem] leading-tight transition-colors",
          on ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {name}
      </span>
    </button>
  );
}

function Stat({
  glyph,
  children,
}: {
  glyph: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph
        name={glyph}
        className="size-[1.05rem] shrink-0 text-muted-foreground/70"
      />
      {children}
    </span>
  );
}

function N({ children }: { children: React.ReactNode }) {
  return (
    <b className="font-semibold tabular-nums text-foreground">{children}</b>
  );
}
