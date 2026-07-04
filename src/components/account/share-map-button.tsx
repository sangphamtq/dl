"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Sliders } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PROVINCE_COUNT, PROVINCE_NAME_BY_SLUG } from "@/lib/provinces";
import { REGIONS } from "@/lib/regions";
import { PILL_BASE, PILL_SURFACE } from "@/components/site/check-in-button";
import { VN_MAP_PATHS } from "./vietnam-map-paths";
import { VN_ISLANDS, VN_MAP_VIEWBOX_WIDE } from "./vietnam-islands";

// ── Tuỳ chọn cá nhân hoá ảnh ────────────────────────────────────────────────
export type ShareOptions = {
  eyebrow: string;
  headline: string; // dùng {n} để chèn "X/63"
  name: string;
  watermark: string;
  accent: string; // màu nhấn (hex)
  showMap: boolean;
  showList: boolean;
};

const DEFAULTS: ShareOptions = {
  eyebrow: "HÀNH TRÌNH VIỆT",
  headline: "Tôi đã đến {n} tỉnh thành",
  name: "",
  watermark: "Khám phá Việt Nam cùng Halivivu",
  accent: "#e3852f",
  showMap: true,
  showList: true,
};

const ACCENT_SWATCHES = [
  "#e3852f",
  "#e11d48",
  "#0ea5e9",
  "#16a34a",
  "#7c3aed",
  "#0f172a",
];

const LAND = "#e7e5e4";
const INK = "#0f172a";
const MUTED = "#64748b";
const W = 1360;

// Checklist (giống danh sách ngoài trang): ô tròn tích + tên, căn trái, cột dọc.
const ITEM_FS = 22;
const ITEM_H = 37; // dòng siết lại, bớt khoảng trống dọc
const CIRCLE_R = 13;
const ITEM_GAP = 12; // khoảng cách ô tròn → chữ

// Font viết tay Mali (nhúng vào ảnh) cho phần checklist.
const LIST_FONT = "'MaliShare', 'Be Vietnam Pro', system-ui, sans-serif";

function escapeXml(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

// Một mục checklist "○/✓ Tên" tại (x, cy).
function checklistItem(
  x: number,
  cy: number,
  name: string,
  visited: boolean,
  accent: string,
): string {
  const cx = x + CIRCLE_R;
  const r = CIRCLE_R;
  const checkD = `M${(cx - r * 0.45).toFixed(1)} ${(cy + r * 0.05).toFixed(1)} l${(r * 0.33).toFixed(1)} ${(r * 0.36).toFixed(1)} l${(r * 0.58).toFixed(1)} -${(r * 0.72).toFixed(1)}`;
  const circle = visited
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}"/>
  <path d="${checkD}" fill="none" stroke="#ffffff" stroke-width="${(r * 0.22).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#cbd5e1" stroke-width="2.4"/>`;
  const tx = x + CIRCLE_R * 2 + ITEM_GAP;
  return `${circle}
  <text x="${tx}" y="${cy}" dominant-baseline="central" font-size="${ITEM_FS}" font-weight="${visited ? 600 : 500}" fill="${visited ? INK : MUTED}">${escapeXml(name)}</text>`;
}

function mapBlock(
  x: number,
  top: number,
  mapW: number,
  accent: string,
  visited: Set<string>,
  total: number,
) {
  const [, , vw, vh] = VN_MAP_VIEWBOX_WIDE.split(" ").map(Number);
  const mapH = Math.round((mapW * vh) / vw);
  const cx = x + mapW / 2;
  const shapes = [
    ...VN_MAP_PATHS,
    ...VN_ISLANDS.map((i) => ({ slug: i.parentSlug, d: i.d })),
  ]
    .map(
      (p) =>
        `<path d="${p.d}" fill="${visited.has(p.slug) ? accent : LAND}" stroke="#ffffff" stroke-width="0.6"/>`,
    )
    .join("");
  const barW = mapW - 60;
  const barX = cx - barW / 2;
  const barY = top + mapH + 34;
  const fillW = Math.round((barW * total) / PROVINCE_COUNT);
  const percent = Math.round((total / PROVINCE_COUNT) * 100);
  const svg = `<svg x="${x}" y="${top}" width="${mapW}" height="${mapH}" viewBox="${VN_MAP_VIEWBOX_WIDE}">${shapes}</svg>
  <rect x="${barX}" y="${barY}" width="${barW}" height="16" rx="8" fill="#e2e8f0"/>
  <rect x="${barX}" y="${barY}" width="${fillW}" height="16" rx="8" fill="${accent}"/>
  <text x="${cx}" y="${barY + 46}" text-anchor="middle" font-size="26" font-weight="700" fill="${INK}">Hoàn thành ${percent}%</text>`;
  return { svg, bottom: barY + 60 };
}

function listBlock(
  centerX: number,
  top: number,
  colW: number,
  accent: string,
  visited: Set<string>,
) {
  const leftX = Math.round(centerX - colW / 2);
  // 3 cột ở khổ thường; rộng hơn thì thêm cột.
  const cols = Math.max(3, Math.round(colW / 300));
  const colWidth = colW / cols;

  let y = top;
  // Tiêu đề căn TRÁI, khớp danh sách ngoài trang.
  let svg = `<text x="${leftX}" y="${y + 18}" font-size="21" font-weight="800" fill="${INK}">Năm nay bạn đã đi được những đâu?</text>`;
  y += 44;

  for (const region of REGIONS) {
    const items = region.slugs
      .map((s) => ({
        name: PROVINCE_NAME_BY_SLUG[s] ?? s,
        visited: visited.has(s),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
    const done = items.filter((i) => i.visited).length;
    // Tên miền căn TRÁI: nhãn màu nhấn + số đã đến/tổng (xám), như ngoài trang.
    svg += `<text x="${leftX}" y="${y + 13}" font-size="17" font-weight="700" letter-spacing="1.2" fill="${accent}">${escapeXml(region.label.toUpperCase())} <tspan fill="${MUTED}" font-weight="600">${done}/${region.slugs.length}</tspan></text>`;

    // Xếp theo CỘT DỌC (fill từng cột từ trên xuống) — giống CSS columns.
    const rowsPerCol = Math.ceil(items.length / cols);
    items.forEach((it, i) => {
      const col = Math.floor(i / rowsPerCol);
      const rowIdx = i % rowsPerCol;
      const ix = Math.round(leftX + col * colWidth);
      const cy = y + 28 + rowIdx * ITEM_H + ITEM_H / 2;
      svg += checklistItem(ix, cy, it.name, it.visited, accent);
    });
    y = y + 28 + rowsPerCol * ITEM_H + 12;
  }
  return { svg: `<g font-family="${LIST_FONT}">${svg}</g>`, bottom: y - 14 };
}

function buildShareCard(
  visited: Set<string>,
  total: number,
  opts: ShareOptions,
  fontCss = "",
) {
  const { accent, showMap, showList } = opts;

  // ── Header (eyebrow + headline + tên) ──
  const hasName = opts.name.trim().length > 0;
  const count = `${total}/${PROVINCE_COUNT}`;
  const parts = opts.headline.split("{n}");
  const headlineInner =
    escapeXml(parts[0]) +
    (parts.length > 1
      ? `<tspan fill="${accent}">${count}</tspan>${escapeXml(parts.slice(1).join("{n}"))}`
      : "");
  let header = `<text x="${W / 2}" y="110" text-anchor="middle" font-size="26" font-weight="600" letter-spacing="4" fill="${accent}">${escapeXml(opts.eyebrow)}</text>
  <text x="${W / 2}" y="184" text-anchor="middle" font-size="52" font-weight="800" fill="${INK}">${headlineInner}</text>`;
  if (hasName)
    header += `<text x="${W / 2}" y="226" text-anchor="middle" font-size="27" font-style="italic" fill="${MUTED}">— ${escapeXml(opts.name.trim())}</text>`;
  const contentTop = (hasName ? 256 : 220) + 36;

  // ── Thân (bản đồ và/hoặc danh sách) ──
  let body = "";
  let contentBottom = contentTop;

  if (showMap && showList) {
    const mapW = 480;
    const [, , vw, vh] = VN_MAP_VIEWBOX_WIDE.split(" ").map(Number);
    const mapTotalH = Math.round((mapW * vh) / vw) + 70;
    const listX = 560;
    const colW = W - listX - 48;
    const listCX = listX + colW / 2;
    const listH = listBlock(listCX, 0, colW, accent, visited).bottom;
    const contentH = Math.max(mapTotalH, listH);
    const mapTop = contentTop + Math.max(0, (contentH - mapTotalH) / 2);
    const listTop = contentTop + Math.max(0, (contentH - listH) / 2);
    body =
      mapBlock(56, mapTop, mapW, accent, visited, total).svg +
      listBlock(listCX, listTop, colW, accent, visited).svg;
    contentBottom = contentTop + contentH;
  } else if (showMap) {
    const mapW = 760;
    const m = mapBlock((W - mapW) / 2, contentTop, mapW, accent, visited, total);
    body = m.svg;
    contentBottom = m.bottom;
  } else if (showList) {
    const colW = W - 220;
    const l = listBlock(W / 2, contentTop, colW, accent, visited);
    body = l.svg;
    contentBottom = l.bottom;
  }

  const wmY = contentBottom + 64;
  const H = wmY + 36;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
  <defs>
    <style>${fontCss}</style>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eff8fc"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${header}
  ${body}
  <text x="${W / 2}" y="${wmY}" text-anchor="middle" font-size="24" fill="${MUTED}">${escapeXml(opts.watermark)}</text>
</svg>`;

  return { svg, w: W, h: H };
}

// Nhúng font Mali (woff2 base64) để chữ checklist hiện đúng font khi xuất ảnh.
const MALI_SUBSETS = [
  {
    file: "mali-latin.woff2",
    range:
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  },
  {
    file: "mali-latin-ext.woff2",
    range:
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+030B,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  },
  {
    file: "mali-vietnamese.woff2",
    range:
      "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+1EA0-1EF9,U+20AB",
  },
];

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

async function loadMaliFontCss(): Promise<string> {
  const faces = await Promise.all(
    MALI_SUBSETS.map(async (s) => {
      const buf = await (await fetch(`/fonts/${s.file}`)).arrayBuffer();
      return `@font-face{font-family:'MaliShare';font-style:normal;font-weight:500;src:url(data:font/woff2;base64,${bufToBase64(buf)}) format('woff2');unicode-range:${s.range};}`;
    }),
  );
  return faces.join("");
}

async function svgToPngBlob(svg: string, w: number, h: number): Promise<Blob> {
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new Image();
  img.src = url;
  // decode() chờ ảnh + font nhúng giải mã xong (đáng tin hơn onload cho font).
  try {
    await img.decode();
  } catch {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Không tải được ảnh bản đồ."));
    });
  }
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xuất ảnh.");
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh."))),
      "image/png",
    ),
  );
}

// ── Editor cá nhân hoá + preview trực tiếp ──────────────────────────────────
function ShareEditor({
  visited,
  total,
  open,
  onOpenChange,
}: {
  visited: string[];
  total: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [opts, setOpts] = useState<ShareOptions>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [fontCss, setFontCss] = useState("");
  const set = <K extends keyof ShareOptions>(k: K, v: ShareOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  // Nạp font Mali (nhúng) khi mở editor.
  useEffect(() => {
    if (open && !fontCss) loadMaliFontCss().then(setFontCss).catch(() => {});
  }, [open, fontCss]);

  const card = useMemo(
    () => buildShareCard(new Set(visited), total, opts, fontCss),
    [visited, total, opts, fontCss],
  );
  const previewUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(card.svg);

  async function download() {
    setBusy(true);
    try {
      const blob = await svgToPngBlob(card.svg, card.w, card.h);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "da-den-viet-nam.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã tải ảnh về máy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xuất được ảnh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Tuỳ chỉnh ảnh chia sẻ</DialogTitle>
          <DialogDescription>
            Chỉnh nội dung, màu sắc rồi tải ảnh cá nhân hoá của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[78vh] gap-0 overflow-hidden sm:grid-cols-[1fr_300px]">
          {/* Preview */}
          <div className="overflow-auto bg-muted/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Xem trước ảnh chia sẻ"
              className="mx-auto w-full rounded-xl border border-border/60 shadow-sm"
            />
          </div>

          {/* Controls */}
          <div className="space-y-4 overflow-auto border-t border-border/60 p-5 sm:border-l sm:border-t-0">
            <Field label="Dòng nhãn">
              <Input
                value={opts.eyebrow}
                onChange={(e) => set("eyebrow", e.target.value)}
              />
            </Field>
            <Field label="Tiêu đề (dùng {n} cho số tỉnh)">
              <Input
                value={opts.headline}
                onChange={(e) => set("headline", e.target.value)}
              />
            </Field>
            <Field label="Tên của bạn (tuỳ chọn)">
              <Input
                value={opts.name}
                placeholder="vd: Minh Anh"
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Dòng chân ảnh">
              <Input
                value={opts.watermark}
                onChange={(e) => set("watermark", e.target.value)}
              />
            </Field>

            <Field label="Màu nhấn">
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Màu ${c}`}
                    onClick={() => set("accent", c)}
                    className={cn(
                      "size-7 rounded-full border-2 transition-transform hover:scale-110",
                      opts.accent.toLowerCase() === c.toLowerCase()
                        ? "border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Màu tuỳ chọn"
                  value={opts.accent}
                  onChange={(e) => set("accent", e.target.value)}
                  className="size-7 cursor-pointer rounded-full border border-border/60 bg-transparent p-0"
                />
              </div>
            </Field>

            <div className="space-y-2.5 pt-1">
              <ToggleRow
                label="Hiện bản đồ"
                checked={opts.showMap}
                onChange={(v) => set("showMap", v || !opts.showList)}
              />
              <ToggleRow
                label="Hiện danh sách tỉnh"
                checked={opts.showList}
                onChange={(v) => set("showList", v || !opts.showMap)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpts(DEFAULTS)}
              >
                Đặt lại
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-full"
                onClick={download}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                Tải ảnh
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function ShareMapButton({
  visited,
  total,
}: {
  visited: string[];
  total: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(PILL_BASE, PILL_SURFACE)}
      >
        <Sliders className="size-4" aria-hidden />
        Tuỳ chỉnh &amp; tải ảnh
      </button>
      <ShareEditor
        visited={visited}
        total={total}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
