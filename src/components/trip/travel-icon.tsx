import type { TravelMode } from "@/lib/trip-special";
import { cn } from "@/lib/utils";

/**
 * Icon phương tiện của THẺ VÉ — vẽ ĐẶC hai lớp (thân `currentColor`, chi tiết trắng), khác bộ nét mảnh `glyphs.tsx`: đây là
 * thứ duy nhất trên thẻ nói đó là phương tiện gì (tên phương tiện đã bỏ khỏi thẻ), nên phải đọc được ngay ở 28px.
 */
const PATHS: Record<TravelMode, React.ReactNode> = {
  plane: (
    <g transform="rotate(45 12 12)">
      <path
        d="M10.4 3.2a1.6 1.6 0 0 1 3.2 0v5.4l7.4 4.2v2.5l-7.4-2.3v4.3l2.5 1.9v1.7L12 19.6l-4.1 1.3v-1.7l2.5-1.9V13l-7.4 2.3v-2.5l7.4-4.2V3.2Z"
        fill="currentColor"
      />
    </g>
  ),
  train: (
    <>
      <rect x="5" y="2.6" width="14" height="15" rx="4" fill="currentColor" />
      <rect x="7.3" y="5" width="9.4" height="5.4" rx="1.3" fill="#fff" fillOpacity=".92" />
      <circle cx="8.9" cy="13.7" r="1.15" fill="#fff" />
      <circle cx="15.1" cy="13.7" r="1.15" fill="#fff" />
      <path d="M8.4 17.6 6 21.4M15.6 17.6l2.4 3.8M7.2 19.8h9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="2.8" width="16" height="15.4" rx="3" fill="currentColor" />
      <rect x="6" y="5.6" width="12" height="6.2" rx="1.2" fill="#fff" fillOpacity=".92" />
      <rect x="9.2" y="3.7" width="5.6" height="1.1" rx=".55" fill="#fff" fillOpacity=".6" />
      <circle cx="7.9" cy="14.8" r="1.2" fill="#fff" />
      <circle cx="16.1" cy="14.8" r="1.2" fill="#fff" />
      <rect x="5.6" y="17.6" width="3" height="3.4" rx="1" fill="currentColor" />
      <rect x="15.4" y="17.6" width="3" height="3.4" rx="1" fill="currentColor" />
    </>
  ),
  car: (
    <>
      <path
        d="M2.6 15.6v-2.2a2 2 0 0 1 1.5-1.9l2.4-.7 2-3.3a2.2 2.2 0 0 1 1.9-1.1h4.6a2.2 2.2 0 0 1 1.7.8l2.7 3.4 1.6.5a2 2 0 0 1 1.4 1.9v2.6a1 1 0 0 1-1 1H3.6a1 1 0 0 1-1-1Z"
        fill="currentColor"
      />
      <path d="M9.6 8.3 8.2 10.8h4.2V8h-2.1a.8.8 0 0 0-.7.3Z" fill="#fff" fillOpacity=".92" />
      <path d="M13.6 8v2.8h4.3l-1.9-2.5a.8.8 0 0 0-.6-.3h-1.8Z" fill="#fff" fillOpacity=".92" />
      <circle cx="7.3" cy="16.8" r="2.4" fill="currentColor" stroke="#fff" strokeWidth="1.4" />
      <circle cx="17" cy="16.8" r="2.4" fill="currentColor" stroke="#fff" strokeWidth="1.4" />
    </>
  ),
  motorbike: (
    <>
      <path d="M15.3 5.4h1.8l1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7.2 12.6h6.2l2.3-4.1h2.5l.9 3.3a4.6 4.6 0 0 1 .2 2.6h-3.1l-1.7 2.9H8.4a3 3 0 0 1-1.2-4.7Z"
        fill="currentColor"
      />
      <rect x="6" y="10.4" width="5.4" height="2.2" rx="1.1" fill="currentColor" fillOpacity=".55" />
      <circle cx="6.2" cy="17.4" r="2.6" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <circle cx="18.2" cy="17.4" r="2.6" fill="#fff" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  boat: (
    <>
      <path d="M11.6 9V3.8l4.6 2.3-4.6 2.3" fill="currentColor" fillOpacity=".55" />
      <rect x="6.8" y="9" width="9.6" height="5" rx="1.1" fill="currentColor" fillOpacity=".7" />
      <rect x="8.4" y="10.4" width="2" height="1.8" rx=".4" fill="#fff" />
      <rect x="12.8" y="10.4" width="2" height="1.8" rx=".4" fill="#fff" />
      <path d="M2.8 14h18.4l-2.3 4.3a2 2 0 0 1-1.8 1.1H6.9a2 2 0 0 1-1.8-1.1L2.8 14Z" fill="currentColor" />
      <path
        d="M3 22c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity=".45"
      />
    </>
  ),
};

/**
 * MỘT màu cho mọi Di chuyển (biên tập: "để chung một màu") — phân biệt phương tiện bằng HÌNH icon, màu chỉ nói "đây là
 * đoạn đi lại". Ngoại lệ có chủ ý của luật "màu mang nghĩa" (§3 CLAUDE.md): chỉ ở icon / ô icon, không tô chữ, không tô nền
 * thẻ. Xanh trời — tránh cam (= cảnh báo).
 */
export const TRAVEL_TILE = "bg-kind-travel/12 text-kind-travel";
export const TRAVEL_INK = "text-kind-travel";

export function TravelIcon({ mode, className }: { mode: TravelMode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-7", className)}>
      {PATHS[mode]}
    </svg>
  );
}

/** Icon ĐẶC của thẻ bữa ăn / lưu trú — cùng bộ, cùng cách vẽ với `TravelIcon`, để ô icon đầu thẻ cùng một ngôn ngữ. */
export type HeadKind = "meal" | "stay" | "spot" | "activity";

const KIND_PATHS: Record<HeadKind, React.ReactNode> = {
  spot: (
    <>
      <path d="M1.8 20.2 8.6 8.4a1 1 0 0 1 1.7 0l6.9 11.8Z" fill="currentColor" />
      <path d="m13.4 13.6 2.4-4a1 1 0 0 1 1.7 0l4.7 8.1a1.7 1.7 0 0 1-1.5 2.5h-4.2Z" fill="currentColor" fillOpacity=".55" />
      <path d="m7.4 10.5 1.4 1.5 1.3-1.3 1.4 1.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".8" />
      <circle cx="18.6" cy="4.6" r="1.9" fill="currentColor" fillOpacity=".55" />
    </>
  ),
  activity: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4Z" fill="#fff" fillOpacity=".92" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  meal: (
    <>
      <path d="M9 2.8c-.9 1.1.9 2.1 0 3.4M12.6 2.8c-.9 1.1.9 2.1 0 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".55" />
      <path d="m14.6 8.6 6.2-5.4M13 8.2l5.8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.6 9.8h18.8a1 1 0 0 1 1 1.1 10.4 10.4 0 0 1-20.8 0 1 1 0 0 1 1-1.1Z" fill="currentColor" />
      <path d="M5.8 13.2h12.4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
      <rect x="8.4" y="19.4" width="7.2" height="2.2" rx="1.1" fill="currentColor" />
    </>
  ),
  stay: (
    <>
      <rect x="2" y="4.4" width="2.8" height="16" rx="1.2" fill="currentColor" />
      <rect x="6.2" y="8.6" width="6" height="3.8" rx="1.6" fill="currentColor" fillOpacity=".55" />
      <path d="M4.8 12.6h14.4a2.8 2.8 0 0 1 2.8 2.8v2.8H4.8v-5.6Z" fill="currentColor" />
      <path d="M13.6 12.6v5.6" stroke="#fff" strokeWidth="1.3" opacity=".6" />
      <rect x="19.2" y="17.6" width="2.8" height="2.8" rx="1" fill="currentColor" />
    </>
  ),
};

/**
 * Màu ô icon đầu thẻ: mỗi LOẠI thẻ một màu (token `--kind-*` trong `globals.css`). Cùng ngoại lệ có chủ ý với
 * `TRAVEL_TILE`: chỉ tô ô icon, không tô chữ / nền thẻ; tránh cam (= cảnh báo) và đỏ (chữ cảnh báo đóng cửa nằm ngay dưới).
 */
export const KIND_TILE: Record<HeadKind, string> = {
  // Nơi tham quan / hoạt động: màu ƯU TIÊN của bảng (lý do của chuyến). Thứ tự ưu tiên ở `--kind-*` trong globals.css.
  spot: "bg-kind-place/12 text-kind-place",
  activity: "bg-kind-place/12 text-kind-place",
  meal: "bg-kind-meal/12 text-kind-meal",
  stay: "bg-kind-stay/12 text-kind-stay",
};
export const KIND_INK: Record<HeadKind, string> = {
  spot: "text-kind-place",
  activity: "text-kind-place",
  meal: "text-kind-meal",
  stay: "text-kind-stay",
};

export function KindIcon({ kind, className }: { kind: HeadKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-7", className)}>
      {KIND_PATHS[kind]}
    </svg>
  );
}
