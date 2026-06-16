---
name: design
description: Hệ thống thiết kế & nguyên tắc giao diện cho website thông tin du lịch. Dùng MỖI KHI dựng hoặc chỉnh sửa bất kỳ trang, component, layout, card, hay yếu tố thị giác nào (trang Place, card Listing, trang chi tiết, blog, header, form…). Đảm bảo UI nhất quán, thân thiện kiểu travel-app, ảnh làm chủ, nền xanh trời mềm + điểm nhấn cam.
---

# Design Skill — Website du lịch (travel-app thân thiện, ảnh làm chủ, xanh trời + cam)

Hướng dẫn thị giác cho dự án. Đọc trước khi làm UI. Stack: **Next.js 16 + Tailwind v4 +
shadcn/ui (style `new-york`, base color `neutral`, dựng trên Radix UI)**. Mô hình dữ liệu/route xem `CLAUDE.md`.

## 1. Triết lý thiết kế

**Thân thiện, sáng sủa, mời gọi — kiểu travel-app hiện đại** (tham chiếu: landing "Travling!").
Cảm giác chủ đạo: nhẹ nhàng, đáng tin, khơi gợi cảm hứng đi chơi.
- **Ảnh là nhân vật chính.** Ảnh điểm đến/món ăn/lưu trú được tôn lên bằng khung bo tròn,
  cắt tròn (circular crop), hoặc card nổi chồng lớp. Chữ và khung làm nền đỡ cho ảnh.
- **Nền sáng, nhiều khoảng trắng**, chuyển sắc xanh trời rất nhẹ (`sky`/`cyan`) ở hero & các
  dải section. Không gian thoáng, sạch.
- **Card nổi (floating cards):** nội dung quan trọng đặt trong card trắng bo góc lớn, đổ
  bóng mềm khuếch tán, thường **chồng lấn** lên ảnh hoặc lên dải nền màu để tạo chiều sâu.
- **Phân cấp bằng kích thước, độ đậm & khoảng cách.** Heading **đậm, đen, gọn**
  (`tracking-tight`); thân chữ xám trung tính.
- **Hai màu điểm nhấn:** **xanh trời/cyan** (chủ đạo — link, giá, badge, dải CTA) + **cam**
  (phụ — nút kêu gọi hành động chính như "Đăng ký", chấm mặt trời, điểm nhấn nhỏ). Phần lớn
  giao diện vẫn trung tính.
- **Họa tiết du lịch tiết chế:** vòng tròn đồng tâm sau ảnh tròn, đường bay nét đứt
  (dashed) nối các section, icon máy bay/định vị nhỏ. Dùng vừa đủ để vui mắt, không rối.

## 2. Nền tảng (foundations)

### Màu — luôn dùng token theme, KHÔNG hardcode
Dùng biến semantic của shadcn trong `globals.css` (`bg-background`, `text-foreground`,
`text-muted-foreground`, `bg-primary`, `bg-secondary`, `bg-muted`, `border`, `bg-card`…).
**Không** viết `bg-[#3bb8c4]` hay `text-gray-500` rải rác.
- **Nền/chữ:** `background` (trắng/xám rất nhạt) / `foreground` (gần đen). Chữ phụ:
  `text-muted-foreground`.
- **Accent chính = xanh trời/cyan** (set trong `globals.css`): `--primary` ≈
  `oklch(0.68 0.10 220)` (light) / `oklch(0.74 0.10 220)` (dark), kèm `--ring` cùng tông.
  Dùng cho: link, số giá, badge thông tin, dải CTA, logo.
- **Accent phụ = cam** (set qua `--secondary`/biến riêng `--accent-warm` nếu cần): ≈
  `oklch(0.72 0.17 50)`. **Chỉ** cho nút hành động chính nổi bật ("Đăng ký"/CTA) và chấm
  trang trí. Đừng lạm dụng cam cho diện tích lớn.
- **Dải nền xanh nhạt:** dùng gradient token nhẹ `bg-gradient-to-b from-sky-50 to-background`
  (hoặc biến theme tương đương) cho hero & section nền — luôn rất nhạt, không bão hòa.
- **Dải CTA/footer đậm:** nền `bg-primary` (xanh trời trung), chữ trắng, có thể thêm vòng
  tròn đồng tâm mờ làm họa tiết.
- **Dark mode** bắt buộc hoạt động: chỉ dùng token (đã có biến `.dark`), không màu cứng.
  Muốn đổi tông → chỉ sửa token, KHÔNG sửa từng component.

### Typography
- Font: **Geist Sans** (đã cấu hình ở `layout.tsx`); `Geist Mono` cho mã/giờ giấc nếu cần.
- Heading **đậm & gọn:** hero `text-4xl`/`text-5xl font-bold tracking-tight`; tiêu đề
  section `text-2xl`/`text-3xl font-bold`; tiêu đề card `text-base`/`text-lg font-semibold`.
- Thân `text-base`/`text-sm text-muted-foreground`; meta `text-xs`.
- **Tiếng Việt nhiều dấu:** dùng `leading-relaxed`/`leading-7` cho đoạn văn để dấu không
  chạm dòng trên; tránh `leading-none` cho nhiều chữ. Heading dùng `tracking-tight`.
- Giới hạn bề rộng đoạn đọc: `max-w-prose` (~65 ký tự) cho thân bài blog.
- **Giá tiền** là điểm nhấn quan trọng (card listing): dùng `text-primary font-semibold`.

### Khoảng cách & layout
- **Mobile-first.** Thiết kế cho điện thoại trước, mở rộng bằng `sm: md: lg:`.
- Container nội dung: `max-w-6xl mx-auto px-4 sm:px-6` (trang rộng); bài blog hẹp hơn
  (`max-w-2xl`/`max-w-prose`).
- Nhịp khoảng cách dùng thang Tailwind (4px). Section cách nhau **rộng rãi** `py-16`/`py-24`;
  phần tử trong card `gap-3`/`gap-4`. **Hào phóng whitespace** — đây là điểm cốt lõi của style này.
- Lưới card: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5/6` cho danh sách điểm đến
  (tham chiếu "Popular Destinations" 4 cột); listing nội dung khác có thể 3 cột.
- **Bố cục lệch (asymmetric):** nhiều section là 2 cột không cân — một bên ảnh tròn lớn, một
  bên chữ + danh sách (tham chiếu "Why Choose Us"). Dùng `lg:grid-cols-2 items-center gap-12`.

### Bo góc, viền, bóng
- Bo góc **lớn, mềm**: `rounded-2xl`/`rounded-3xl` cho card & ảnh; nút `rounded-full` hoặc
  `rounded-xl`.
- **Bóng mềm khuếch tán** cho card nổi: `shadow-lg shadow-black/5` (rất nhẹ, không xám đục).
  Card chồng lên ảnh/nền màu thì bóng giúp tách lớp. Tránh viền cứng — ưu tiên bóng + nền trắng.
- Viền chỉ khi cần tách trên nền trắng: `border border-border/60` mảnh.

## 3. Ảnh (quan trọng nhất — "ảnh làm chủ")

- **Luôn `next/image`** với `alt` lấy từ `Image.alt` (đừng để trống — a11y + SEO). Khai báo
  domain ảnh ngoài trong `next.config.ts`.
- **Tỷ lệ khung nhất quán** bằng `aspect-[...]` + `object-cover`:
  - Card listing/place: `aspect-[4/3]` (như "Popular Destinations").
  - Hero/feature: **ảnh cắt tròn** `rounded-full aspect-square object-cover` đặt trong vòng
    tròn nền xanh nhạt + vòng đồng tâm trang trí.
  - Ảnh blog cover: `aspect-[16/9]`.
- **Ảnh tròn + vòng đồng tâm (signature của style này):** ảnh `rounded-full` đặt trên một
  khối nền `bg-sky-100/bg-primary/10` lớn hơn, thêm 1–2 vòng `ring`/`border` mờ đồng tâm
  hoặc pseudo-element vòng tròn để tạo cảm giác "tỏa". Có thể đính **chấm cam** (mặt trời)
  hoặc **badge nhỏ** (vd "Jakarta → Bali") nổi ở mép.
- **Card ảnh nổi chồng lớp:** trong hero, đặt 1–2 card nhỏ (ảnh điểm đến + tên + định vị)
  chồng lấn lên ảnh chính, dùng `absolute` + `shadow-lg` + nền trắng bo góc.
- **Ảnh bìa** = `Image` có `isCover` (fallback ảnh `order` nhỏ nhất). Gallery sắp theo `order`.
- Bo góc ảnh khớp card (`rounded-2xl`). Phủ gradient tối nhẹ ở đáy khi đặt chữ lên ảnh
  (`bg-gradient-to-t from-black/50`) để chữ trắng đọc rõ.
- Tránh ảnh méo: luôn `object-cover` trong khung tỷ lệ cố định, không đặt width/height thô.
- Có `caption`/`credit` thì hiện nhỏ, `text-xs text-muted-foreground` dưới gallery.
- **Skeleton/blur khi tải** để trang ảnh-nặng không giật (`placeholder="blur"` hoặc khối
  `bg-muted animate-pulse`).

## 4. Họa tiết & trang trí (giữ nhẹ nhàng)

Những yếu tố tạo cá tính "travel-app" — dùng **tiết chế**, không để rối nội dung:
- **Vòng tròn đồng tâm** sau ảnh tròn hero (nền xanh rất nhạt, các vòng mờ dần).
- **Đường bay nét đứt** (`border-dashed` cong, hoặc SVG path) nối các section theo chiều dọc,
  có thể đính icon máy bay nhỏ ở đầu mút.
- **Chấm cam** (mặt trời) hoặc cụm chấm màu nhỏ làm điểm nhấn ở góc ảnh/section.
- **Bản đồ chấm lục giác/dot-grid** cho section kiểu "Lên kế hoạch" (nếu làm) — nền nhạt,
  các chấm màu rải rác + card thông tin nổi.
- Tất cả họa tiết đặt sau nội dung (`-z-10`/`pointer-events-none`), không cản đọc/bấm.

## 5. Mẫu component theo trang (bám route trong CLAUDE.md)

- **Card Listing** (trang `/diem-den/[placeSlug]/[loai]`): ảnh bìa trên cùng (`aspect-[4/3]`
  `rounded-2xl`), trên ảnh có thể có badge định vị nhỏ (góc trái); dưới là `name`
  (`font-semibold` `line-clamp-2`), dòng meta phụ (số ngày / category), và **giá nổi bật**
  `text-primary font-semibold` (vd "Rp 1.205.000 /malam" → "1.200.000đ /đêm"). Cả card là
  link tới chi tiết. Hover: nâng `shadow-lg` + ảnh `scale-[1.02] transition`.
- **Hero trang chủ / Place** (`/diem-den/[placeSlug]`): **bố cục 2 cột lệch** — trái: heading
  đậm lớn + mô tả ngắn + nút CTA (app badges hoặc "Khám phá"); phải: **ảnh tròn lớn** với
  vòng đồng tâm + card ảnh nổi chồng lớp + badge tuyến/định vị. Nền gradient xanh rất nhạt.
  Bên dưới chia **section theo loại** (Hoạt động, Địa điểm, Đặc sản, Quán ăn, Lưu trú) — mỗi
  section: tiêu đề đậm + lưới card + link "Xem tất cả". **Transport** render **inline** ở đây
  (accordion/section, nhóm theo `direction`: đến nơi / tại chỗ).
- **Section "đặc điểm" (feature list)** (kiểu "Why Choose Us"): 2 cột — ảnh tròn một bên,
  danh sách item một bên; mỗi item = card mỏng có **icon trong ô vuông bo góc** (lucide,
  nền `bg-primary/10`) + tiêu đề + mô tả ngắn. Tốt cho "Vì sao chọn nơi này" / nhóm tiện ích.
- **Trang chi tiết Listing** (`/[loai]/[slug]`, template generic `ListingDetail`): gallery
  ảnh đầu trang → tên + meta (category/giá/địa chỉ) → mô tả → **khối thông tin theo loại**
  (giờ mở cửa/bản đồ với cơ sở; Spot liên kết & đơn vị đặt chỗ với Activity; quán ăn bán đặc
  sản…) → breadcrumb về Place cha → "mục liên quan". Bố cục 1 cột mobile, 2 cột (nội dung +
  **sidebar card nổi** thông tin/đặt chỗ) ở `lg`.
- **Dải CTA** (kiểu "The Beauty of Indonesia"): panel **nền `bg-primary` chữ trắng** bo góc
  lớn, có vòng tròn đồng tâm mờ + đường bay nét đứt làm họa tiết, đặt 1–2 nút (chính nền
  trắng, phụ outline trắng). Đặt cuối trang trước footer.
- **Blog** (`/blog`, `/blog/[postSlug]`): danh sách = card editorial (cover `16/9` + tiêu đề
  + excerpt + meta tác giả/ngày). Trang bài: cột hẹp `max-w-2xl`, cover lớn, typography đọc
  dài thoải mái (`prose` thủ công bằng token), chèn ảnh trong bài.
- **Header**: tối giản — **logo trái** (chữ màu `text-primary` đậm, "Travling!"-style), nav
  giữa, **nút "Đăng nhập/Đăng ký" cam** bên phải; trạng thái đăng nhập → Avatar. Sticky, nền
  `bg-background/80 backdrop-blur` + viền đáy mảnh.
- **Footer**: nền đậm (`bg-primary` hoặc tối), chữ trắng/nhạt, cột link + app badges + icon
  mạng xã hội tròn.
- **Breadcrumb**: Tỉnh › Điểm đến › (loại) › tên — vì URL phẳng nên breadcrumb là nơi thể
  hiện phân cấp. Dùng `text-sm text-muted-foreground`, phân tách bằng icon `chevron`.

## 6. Quy ước dùng shadcn/ui

- **Thêm component qua CLI**: `pnpm dlx shadcn@latest add <tên>` (input, badge, dialog,
  dropdown-menu, navigation-menu, breadcrumb, skeleton, tabs, accordion, card…). Đừng tự dựng
  lại cái shadcn đã có.
- Component ở `src/components/ui/` **được phép sửa** (là code dự án). Component ghép của dự án
  (ListingCard, PlaceHero, FeatureItem, CtaPanel…) đặt ở `src/components/` (ngoài `ui/`).
- Style `new-york` dựng trên **Radix UI**: đổi thẻ gốc bằng prop **`asChild`** (vd
  `<TooltipTrigger asChild><button/>`). Ghép class bằng **`cn()`** từ `@/lib/utils`.
- Icon: **lucide-react**, kích thước theo context (`size-4`/`size-5`), màu `currentColor`.
  Icon "đặc điểm" đặt trong ô `rounded-xl bg-primary/10 p-2`.
- Biến thể nút: **nút CTA chính = nền cam** (`bg-secondary`/biến warm, `rounded-full`); hành
  động chính khác = `default` (primary xanh); phụ = `outline`/`ghost`; `link` cho liên kết.
  Một màn hình **chỉ một** CTA cam nổi bật.
- **Link nhìn như nút:** ưu tiên `buttonVariants` cho liên kết —
  `<Link className={cn(buttonVariants({ variant, size }), "...")}>`. Hoặc
  `<Button asChild><Link/></Button>`. Menu item navigable:
  `<DropdownMenuItem asChild><Link/></DropdownMenuItem>`.

## 7. Accessibility & chất lượng

- `alt` cho mọi ảnh (từ `Image.alt`); icon/họa tiết trang trí thêm `aria-hidden`.
- Tương phản đạt WCAG AA — chữ trắng trên nền cam/xanh phải đủ đậm; không đặt
  `text-muted-foreground` lên nền ảnh sáng (thêm gradient).
- Focus thấy rõ (shadcn đã có `focus-visible:ring`); không bỏ outline.
- Tap target ≥ 40px trên mobile; nút `rounded-full` vẫn đủ rộng.
- Thứ tự heading hợp lý (`h1` mỗi trang một lần).

## 8. Chuyển động (motion)

Tinh tế, có mục đích: `transition-all`/`transition-colors`, `duration-200`. Hover card nâng
nhẹ (`shadow-lg`) + ảnh zoom rất nhẹ. Họa tiết (đường bay, vòng tròn) có thể animate vào nhẹ
nhàng nhưng đừng phô trương. Tôn trọng `prefers-reduced-motion`.

## 9. Checklist trước khi xong một UI

- [ ] Chỉ dùng **token theme** (xanh trời chủ đạo + cam phụ), không màu/khoảng cách hardcode;
      dark mode ổn.
- [ ] **Ảnh** có `alt`, tỷ lệ khung cố định, `object-cover`, bo góc lớn khớp khung.
- [ ] Card nổi dùng **bóng mềm**, không viền cứng; bo góc `rounded-2xl`+.
- [ ] CTA cam **chỉ một** mỗi màn hình; giá hiển thị bằng `text-primary`.
- [ ] Họa tiết trang trí đặt sau nội dung, không cản đọc/bấm; giữ nhẹ.
- [ ] **Mobile-first**: kiểm ở hẹp trước, rồi `sm/md/lg`; whitespace hào phóng.
- [ ] Tiêu đề đậm `tracking-tight`; tiếng Việt `leading` thoáng.
- [ ] Tái dùng component shadcn + `cn()`.
- [ ] `pnpm exec tsc --noEmit` và `pnpm lint` sạch.
