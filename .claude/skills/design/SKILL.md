---
name: design
description: Hệ thống thiết kế & nguyên tắc giao diện cho website thông tin du lịch. Dùng MỖI KHI dựng hoặc chỉnh sửa bất kỳ trang, component, layout, card, hay yếu tố thị giác nào (trang Place, card Listing, trang chi tiết, blog, header, form…). Đảm bảo UI nhất quán, tối giản kiểu biên tập, lấy ảnh làm chủ.
---

# Design Skill — Website du lịch (tối giản, biên tập, ảnh làm chủ)

Hướng dẫn thị giác cho dự án. Đọc trước khi làm UI. Stack: **Next.js 16 + Tailwind v4 +
shadcn/ui (style `new-york`, base color `neutral`, dựng trên Radix UI)**. Mô hình dữ liệu/route xem `CLAUDE.md`.

## 1. Triết lý thiết kế

**Tối giản, biên tập, ảnh làm chủ** (magazine/editorial, kiểu Airbnb).
- **Ảnh là nhân vật chính.** Chữ và khung chỉ làm nền đỡ cho ảnh điểm đến/món ăn/lưu trú.
- **Nhiều khoảng trắng**, ít đường viền, ít đổ bóng. Sạch sẽ, thoáng, đáng tin.
- **Phân cấp rõ bằng kích thước & khoảng cách**, không bằng màu lòe loẹt.
- **Trung tính + một accent** (emerald — xanh ngọc lục bảo). Màu mạnh chỉ cho điểm nhấn nhỏ (nút chính, link, badge).
- Ưu tiên cảm giác **cao cấp, tin cậy, dễ đọc** hơn là "vui mắt".

## 2. Nền tảng (foundations)

### Màu — luôn dùng token theme, KHÔNG hardcode
Dùng biến semantic của shadcn trong `globals.css` (`bg-background`, `text-foreground`,
`text-muted-foreground`, `bg-primary`, `bg-muted`, `border`, `bg-card`…). **Không** viết
`bg-[#0d9488]` hay `text-gray-500` rải rác.
- **Nền/chữ:** `background`/`foreground` (neutral). Chữ phụ: `text-muted-foreground`.
- **Accent chính = emerald** (đã set trong `globals.css`): `--primary` ≈ `oklch(0.62 0.14 162)`
  (light) / `oklch(0.72 0.14 162)` (dark), kèm `--ring` cùng màu. Muốn đổi tông → chỉ sửa
  các token này, KHÔNG sửa từng component.
- **Dark mode** bắt buộc hoạt động: chỉ dùng token (đã có biến `.dark`), không màu cứng.
- Dùng màu mạnh **tiết chế**: nút primary, link, 1 badge "nổi bật". Phần còn lại trung tính.

### Typography
- Font: **Geist Sans** (đã cấu hình ở `layout.tsx`); `Geist Mono` cho mã/giờ giấc nếu cần.
- Thang chữ gợi ý: trang trí lớn `text-3xl`/`text-4xl` (tiêu đề trang/hero), `text-xl`/`2xl`
  (tiêu đề card lớn/section), `text-base` thân, `text-sm` phụ, `text-xs` meta.
- **Tiếng Việt nhiều dấu:** dùng `leading-relaxed`/`leading-7` cho đoạn văn để dấu không
  chạm dòng trên; tránh `leading-none` cho nhiều chữ. Heading dùng `tracking-tight`.
- Giới hạn bề rộng đoạn đọc: `max-w-prose` (~65 ký tự) cho thân bài blog.
- Hạn chế font-weight: `font-medium`/`font-semibold` cho nhấn; tránh `font-bold` tràn lan.

### Khoảng cách & layout
- **Mobile-first.** Thiết kế cho điện thoại trước, mở rộng bằng `sm: md: lg:`.
- Container nội dung: `max-w-6xl mx-auto px-4 sm:px-6` (trang rộng); bài blog hẹp hơn
  (`max-w-2xl`/`max-w-prose`).
- Nhịp khoảng cách dùng thang Tailwind (4px). Section cách nhau `py-10`/`py-16`; phần tử
  trong card `gap-3`/`gap-4`. **Hào phóng whitespace.**
- Lưới card: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5/6`.

### Bo góc, viền, bóng
- Bo góc vừa phải: `rounded-xl`/`rounded-2xl` cho card & ảnh (mềm, hiện đại).
- **Ít viền, ít bóng.** Ưu tiên phân tách bằng khoảng trắng/nền `bg-muted`. Nếu cần nâng:
  `shadow-sm`, hover `shadow-md` — không đổ bóng nặng.

## 3. Ảnh (quan trọng nhất — "ảnh làm chủ")

- **Luôn `next/image`** với `alt` lấy từ `Image.alt` (đừng để trống — a11y + SEO). Khai báo
  domain ảnh ngoài trong `next.config.ts`.
- **Tỷ lệ khung nhất quán** bằng `aspect-[...]` + `object-cover`:
  - Card listing/place: `aspect-[4/3]` hoặc `aspect-square`.
  - Hero trang Place/chi tiết: `aspect-[16/9]` hoặc `aspect-[21/9]`, có thể full-bleed.
  - Ảnh blog cover: `aspect-[16/9]`.
- **Ảnh bìa** = `Image` có `isCover` (fallback ảnh `order` nhỏ nhất). Gallery sắp theo `order`.
- Bo góc ảnh khớp card (`rounded-xl`). Có thể phủ gradient tối nhẹ ở đáy khi đặt chữ lên ảnh
  (`bg-gradient-to-t from-black/60`) để chữ trắng đọc rõ.
- Tránh ảnh méo: luôn `object-cover` trong khung tỷ lệ cố định, không đặt width/height thô.
- Có `caption`/`credit` thì hiện nhỏ, `text-xs text-muted-foreground` dưới gallery.
- **Skeleton/blur khi tải** để trang ảnh-nặng không giật (dùng `placeholder="blur"` hoặc
  khối `bg-muted animate-pulse`).

## 4. Mẫu component theo trang (bám route trong CLAUDE.md)

- **Card Listing** (trang `/diem-den/[placeSlug]/[loai]`): ảnh bìa trên cùng (`aspect-[4/3]`),
  dưới là `name` (`font-semibold`, 1–2 dòng `line-clamp-2`), mô tả ngắn `text-sm
  text-muted-foreground line-clamp-2`, hàng meta: `category`/giá (`priceRange` dạng `$$`)/
  vài `tag` (Badge nhỏ). Cả card là link tới trang chi tiết. Hover: nâng `shadow` + ảnh
  `scale-[1.02] transition`.
- **Trang Place** (`/diem-den/[placeSlug]`): **hero ảnh lớn** + tên Place + mô tả ngắn +
  breadcrumb. Bên dưới chia **section theo loại** (Hoạt động, Địa điểm, Đặc sản, Quán ăn,
  Lưu trú) — mỗi section: tiêu đề + lưới card + link "Xem tất cả". **Transport** render
  **inline** ở đây (accordion/section, nhóm theo `direction`: đến nơi / tại chỗ).
- **Trang chi tiết Listing** (`/[loai]/[slug]`, template generic `ListingDetail`): gallery
  ảnh đầu trang → tên + meta (category/giá/địa chỉ) → mô tả → **khối thông tin theo loại**
  (giờ mở cửa/bản đồ với cơ sở; Spot liên kết & đơn vị đặt chỗ với Activity; quán ăn bán
  đặc sản…) → breadcrumb về Place cha → "mục liên quan". Bố cục 1 cột mobile, 2 cột (nội
  dung + sidebar thông tin) ở `lg`.
- **Blog** (`/blog`, `/blog/[postSlug]`): danh sách = card editorial (cover `16/9` + tiêu đề
  + excerpt + meta tác giả/ngày). Trang bài: cột hẹp `max-w-2xl`, cover lớn, typography đọc
  dài thoải mái (`prose` thủ công bằng token), chèn ảnh trong bài.
- **Header**: tối giản — logo trái, tìm kiếm/điều hướng giữa-phải, trạng thái đăng nhập
  (Avatar) bên phải. Sticky, nền `bg-background/80 backdrop-blur` + viền đáy mảnh.
- **Breadcrumb**: Tỉnh › Điểm đến › (loại) › tên — vì URL phẳng nên breadcrumb là nơi
  thể hiện phân cấp. Dùng `text-sm text-muted-foreground`, phân tách bằng icon `chevron`.

## 5. Quy ước dùng shadcn/ui

- **Thêm component qua CLI**: `pnpm dlx shadcn@latest add <tên>` (input, badge, dialog,
  dropdown-menu, navigation-menu, breadcrumb, skeleton, tabs, accordion…). Đừng tự dựng lại
  cái shadcn đã có.
- Component ở `src/components/ui/` **được phép sửa** (là code dự án). Component ghép của dự
  án (ListingCard, PlaceHero…) đặt ở `src/components/` (ngoài `ui/`).
- Style `new-york` dựng trên **Radix UI**: đổi thẻ gốc bằng prop **`asChild`** (vd
  `<TooltipTrigger asChild><button/>`). Ghép class bằng **`cn()`** từ `@/lib/utils`.
- Icon: **lucide-react**, kích thước theo context (`size-4`/`size-5`), màu `currentColor`.
- Biến thể nút: `default` (primary emerald) cho hành động chính; `outline`/`ghost` cho phụ;
  `link` cho liên kết. Một màn hình **chỉ một** primary action nổi bật.
- **Link nhìn như nút:** ưu tiên `buttonVariants` cho liên kết —
  `<Link className={cn(buttonVariants({ variant, size }), "...")}>` (render `<a>` đúng ngữ
  nghĩa). Hoặc `<Button asChild><Link/></Button>`. Menu item navigable:
  `<DropdownMenuItem asChild><Link/></DropdownMenuItem>`.

## 6. Accessibility & chất lượng

- `alt` cho mọi ảnh (từ `Image.alt`); icon trang trí thêm `aria-hidden`.
- Tương phản đạt WCAG AA — không đặt `text-muted-foreground` lên nền ảnh sáng (thêm gradient).
- Focus thấy rõ (shadcn đã có `focus-visible:ring`); không bỏ outline.
- Tap target ≥ 40px trên mobile; link/nút đủ rộng.
- Thứ tự heading hợp lý (`h1` mỗi trang một lần).

## 7. Chuyển động (motion)

Tinh tế, có mục đích: `transition-all`/`transition-colors`, `duration-200`. Hover card
nâng nhẹ + ảnh zoom rất nhẹ. Tránh animation phô trương. Tôn trọng `prefers-reduced-motion`.

## 8. Checklist trước khi xong một UI

- [ ] Chỉ dùng **token theme**, không màu/khoảng cách hardcode; dark mode ổn.
- [ ] **Ảnh** có `alt`, tỷ lệ khung cố định, `object-cover`, bo góc khớp.
- [ ] **Mobile-first**: kiểm ở hẹp trước, rồi `sm/md/lg`.
- [ ] Tiêu đề/chữ phụ đúng thang; tiếng Việt `leading` thoáng.
- [ ] Tái dùng component shadcn + `cn()`; một primary action / màn hình.
- [ ] `pnpm exec tsc --noEmit` và `pnpm lint` sạch.
