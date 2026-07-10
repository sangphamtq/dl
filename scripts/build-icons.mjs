// Sinh 2 thứ từ bộ icon Iconify (hiện tại: Material Symbols, rounded/filled):
//   1. src/lib/icon-subset.json   — dữ liệu SVG offline cho <Ic icon="..."/>
//   2. src/components/icons.tsx    — bộ component icon dự án (tên theo quy ước cũ)
// Chạy lại khi thêm/bớt icon:  node scripts/build-icons.mjs
//
// Đổi bộ icon = đổi PKG + STYLE + (nếu cần) các tên trong DICT cho khớp bộ mới.
// NAMES = tên component icon dùng trong repo (theo quy ước lucide cũ để khỏi phải
// sửa JSX); DICT = ánh xạ tên khác biệt; EXTRAS = icon chỉ dùng qua <Ic>.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PKG = "@iconify-json/material-symbols/icons.json";
const STYLE = "-outline-rounded"; // Material: -outline-rounded = viền, bo tròn
const c = require(PKG);
const has = (n) => !!(c.icons[n] || c.aliases?.[n]);

// Giải alias (bộ icon có thể trỏ tên này → icon gốc khác).
function resolve(name, depth = 0) {
  if (depth > 5) return null;
  if (c.icons[name]) return c.icons[name];
  const a = c.aliases?.[name];
  if (a) {
    const base = resolve(a.parent, depth + 1);
    return base ? { ...base, ...a } : null;
  }
  return null;
}

// Mọi icon lucide đang dùng trong repo (PascalCase). Cập nhật khi import icon mới.
const LUCIDE =
  "AlertCircle AlignCenter AlignLeft AlignRight ArrowDownWideNarrow ArrowLeft ArrowRight ArrowUp ArrowUpRight BadgeCheck BedDouble Bell Bike Bold BookOpen Building2 Bus CalendarClock CalendarDays Camera Car CarTaxiFront Check CheckCheck CheckCircle2 CheckIcon ChefHat ChevronDown ChevronDownIcon ChevronLeft ChevronLeftIcon ChevronRight ChevronRightIcon ChevronUp ChevronUpIcon ChevronsUpDown CircleCheck CircleIcon Clock Cloud Compass ConciergeBell Construction Crosshair Database DatabaseZap Download ExternalLink Eye EyeOff FileText Flag Footprints Frown Globe Heading2 Heading3 Heart HelpCircle Home Image ImageIcon ImageOff ImagePlus Info Italic KeyRound Landmark Layers LayoutDashboard LayoutGrid Lightbulb Link2 List ListOrdered Loader2 Lock LockOpen LogOut Mail Map MapPin MapPinCheck MapPinCheckInside MapPinPlus MapPinned Maximize Meh Menu MessageCircle MessageSquare MessageSquareText MessagesSquare MoreHorizontal MoreHorizontalIcon Mountain Navigation Newspaper PanelLeftIcon Pause PenLine Pencil Phone Pin PinOff Plane PlaneLanding Play Plus Quote Redo2 RefreshCw Reply RotateCcw RotateCw Route Search SearchIcon Send Settings Share2 Shield ShieldAlert ShieldCheck ShieldQuestion ShieldX Ship Sliders Smile Sparkles Star Store Strikethrough Tag ThumbsUp Ticket TrainFront Trash2 TriangleAlert Underline Undo2 UploadCloud User UserPlus Users Utensils UtensilsCrossed Wallet X XCircle XIcon".split(
    " ",
  );

const kebab = (s) =>
  s
    .replace(/Icon$/, "")
    .replace(/([a-zA-Z])([0-9])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

// lucide-kebab → tên Material (bản KHÔNG hậu tố style). Chỉ liệt kê chỗ khác tên;
// còn lại dùng chính tên kebab của lucide.
const DICT = {
  "alert-circle": "error", "align-center": "format-align-center",
  "align-left": "format-align-left", "align-right": "format-align-right",
  "arrow-down-wide-narrow": "sort", "arrow-left": "arrow-back",
  "arrow-right": "arrow-right-alt", "arrow-up": "arrow-upward",
  "arrow-up-right": "arrow-outward", "badge-check": "verified",
  "bed-double": "king-bed", bell: "notifications", bike: "pedal-bike",
  bold: "format-bold", "book-open": "menu-book", "building-2": "apartment",
  bus: "directions-bus", "calendar-clock": "event",
  "calendar-days": "calendar-month", camera: "photo-camera",
  car: "directions-car", "car-taxi-front": "local-taxi", check: "check",
  "check-check": "done-all", "check-circle-2": "check-circle",
  "chef-hat": "restaurant", "chevron-down": "keyboard-arrow-down",
  "chevron-left": "chevron-left", "chevron-right": "chevron-right",
  "chevron-up": "keyboard-arrow-up", "chevrons-up-down": "unfold-more",
  "circle-check": "check-circle", circle: "circle", clock: "schedule",
  cloud: "cloud", compass: "explore", "concierge-bell": "room-service",
  construction: "construction", crosshair: "my-location", database: "database",
  "database-zap": "database", download: "download",
  "external-link": "open-in-new", eye: "visibility", "eye-off": "visibility-off",
  "file-text": "description", flag: "flag", footprints: "directions-walk",
  frown: "sentiment-dissatisfied", globe: "public", "heading-2": "format-h2",
  "heading-3": "format-h3", heart: "favorite", "help-circle": "help",
  home: "home", image: "image", "image-off": "hide-image",
  "image-plus": "add-photo-alternate", info: "info", italic: "format-italic",
  "key-round": "key", landmark: "account-balance", layers: "layers",
  "layout-dashboard": "dashboard", "layout-grid": "grid-view",
  lightbulb: "lightbulb", "link-2": "link", list: "list",
  "list-ordered": "format-list-numbered", "loader-2": "progress-activity",
  lock: "lock", "lock-open": "lock-open", "log-out": "logout", mail: "mail",
  map: "map", "map-pin": "location-on", "map-pin-check": "where-to-vote",
  "map-pin-check-inside": "where-to-vote", "map-pin-plus": "add-location",
  "map-pinned": "location-on", maximize: "fullscreen", meh: "sentiment-neutral",
  menu: "menu", "message-circle": "chat-bubble", "message-square": "chat",
  "message-square-text": "chat", "messages-square": "forum",
  "more-horizontal": "more-horiz", mountain: "landscape",
  navigation: "navigation", newspaper: "newspaper", "panel-left": "view-sidebar",
  pause: "pause", "pen-line": "edit", pencil: "edit", phone: "call",
  pin: "push-pin", "pin-off": "push-pin", plane: "flight",
  "plane-landing": "flight-land", play: "play-arrow", plus: "add",
  quote: "format-quote", "redo-2": "redo", "refresh-cw": "refresh",
  reply: "reply", "rotate-ccw": "rotate-left", "rotate-cw": "rotate-right",
  route: "route", search: "search", send: "send", settings: "settings",
  "share-2": "share", shield: "shield", "shield-alert": "gpp-maybe",
  "shield-check": "verified-user", "shield-question": "gpp-maybe",
  "shield-x": "gpp-bad", ship: "directions-boat", sliders: "tune",
  smile: "sentiment-satisfied", sparkles: "auto-awesome", star: "star",
  store: "storefront", strikethrough: "format-strikethrough", tag: "sell",
  "thumbs-up": "thumb-up", ticket: "confirmation-number", "train-front": "train",
  "trash-2": "delete", "triangle-alert": "warning", underline: "format-underlined",
  "undo-2": "undo", "upload-cloud": "cloud-upload", user: "person",
  "user-plus": "person-add", users: "group", utensils: "restaurant",
  "utensils-crossed": "restaurant", wallet: "account-balance-wallet", x: "close",
  "x-circle": "cancel",
};

// Icon chỉ dùng qua <Ic> (không phải tên lucide) — key ngữ nghĩa → tên Material.
const EXTRAS = {
  backpack: "backpack",
  signpost: "signpost",
  calendar: "calendar-month",
};

// key (dùng trong <Ic icon="key"/>) → tên Material đầy đủ (kèm STYLE)
const pairs = [];
for (const L of LUCIDE) pairs.push([kebab(L), DICT[kebab(L)] ?? kebab(L)]);
for (const [k, base] of Object.entries(EXTRAS)) pairs.push([k, base]);

const icons = {};
const missing = [];
for (const [key, base] of pairs) {
  if (icons[key]) continue;
  // ưu tiên đúng STYLE; nếu icon không có bản outline riêng (vd search) → lùi
  // về filled CÙNG shape; cuối cùng mới về bản mặc định.
  const cand = [
    `${base}${STYLE}`,
    `${base}${STYLE.replace("-outline", "")}`,
    base,
  ].find(has);
  const d = cand && resolve(cand);
  if (d)
    icons[key] = {
      body: d.body,
      ...(d.width ? { width: d.width } : {}),
      ...(d.height ? { height: d.height } : {}),
    };
  else missing.push(`${key} (${base}${STYLE})`);
}

fs.writeFileSync(
  new URL("../src/lib/icon-subset.json", import.meta.url),
  JSON.stringify({ prefix: "material-symbols", icons, width: c.width ?? 24, height: c.height ?? 24 }),
);

// ── Bộ component icon (thay chỗ import icon trước đây) ─────────────────────────────────────────────────────────
const exports = LUCIDE.map(
  (name) => `export const ${name} = make(${JSON.stringify(kebab(name))});`,
).join("\n");
const shim = `/* AUTO-GENERATED bởi scripts/build-icons.mjs — ĐỪNG sửa tay.
   Bộ icon của dự án: mỗi component render bằng Material Symbols (qua <Ic>).
   Tên component theo quy ước lucide cũ để không phải sửa JSX toàn repo.
   Import: \`import { Home, Search } from "@/components/icons"\`. */
import { Ic } from "@/components/icon";
import type { ComponentProps, ReactElement } from "react";

export type LucideProps = Omit<ComponentProps<typeof Ic>, "icon"> & {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};
export type LucideIcon = (props: LucideProps) => ReactElement;

function make(name: string): LucideIcon {
  return function LucideShimIcon({ size, absoluteStrokeWidth, ...props }: LucideProps) {
    void absoluteStrokeWidth;
    const dim = size != null ? { width: size, height: size } : {};
    return <Ic icon={name} {...dim} {...props} />;
  };
}

${exports}
`;
fs.writeFileSync(new URL("../src/components/icons.tsx", import.meta.url), shim);

console.log(
  `subset: ${Object.keys(icons).length} icons · icons.tsx: ${LUCIDE.length} exports · missing: ${missing.length ? missing.join(", ") : "0"}`,
);
