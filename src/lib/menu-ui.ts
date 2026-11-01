/**
 * Kiểu menu thả xuống dùng chung (gốc: menu tài khoản trên header): khung bo 10px nổi bằng bóng mềm, mục cao 36px bo 6px, rê
 * / phím = nền xám nhạt (KHÔNG mượn `accent` xanh của theme), vạch ngăn lùi vào trong. Dùng: `user-menu.tsx`, `trip-dock.tsx`.
 */
export const MENU_CONTENT =
  "rounded-[10px] border-border/70 p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.22)]";
export const MENU_ITEM =
  "h-9 gap-3 rounded-[6px] px-2.5 text-sm text-foreground focus:bg-foreground/[0.06] focus:text-foreground data-[state=open]:bg-foreground/[0.06] [&_svg:not([class*='text-'])]:text-foreground/60";
/** Mục xoá / bỏ: cùng khuôn, chữ đỏ giữ nguyên khi rê. */
export const MENU_ITEM_DANGER =
  "h-9 gap-3 rounded-[6px] px-2.5 text-sm text-destructive focus:bg-destructive/[0.08] focus:text-destructive";
export const MENU_SEP = "mx-1 my-1 bg-border/70";
export const MENU_LABEL = "px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground";
