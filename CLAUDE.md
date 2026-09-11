# CLAUDE.md

Website **hỗ trợ thông tin du lịch Việt Nam**: tỉnh → điểm đến lớn → mọi thứ cần để đi (ăn
gì, chơi gì, ở đâu, đi lại thế nào). Giao tiếp & nội dung **tiếng Việt**; code, tên biến,
comment kỹ thuật tiếng Anh.

> **Luật của tài liệu này:** chỉ ghi thứ **code không nói được** — mô hình khái niệm, quyết
> định đã chốt, và bẫy. Trường/kiểu cụ thể đọc thẳng `prisma/schema.prisma` (nguồn chân lý).
> Lịch sử quyết định chi tiết nằm trong git.

---

# 1. Mô hình dữ liệu

**Tỉnh** và **Điểm đến lớn** cùng là entity **`Place`** tự tham chiếu cha–con (`kind` ∈
`province` | `destination`). Tỉnh là một `Place` gốc.

Mọi **`Listing`** — tên chung cho `Activity` · `Spot` · `Specialty` · `Eatery` ·
`Accommodation` · `Transport`, **không phải một bảng** — gắn vào **một** `Place` qua
`placeId`. Biên tập gắn vào `Place` **cụ thể nhất** đang tồn tại. Truy vấn "mọi Listing của
một tỉnh" = `placeId` của tỉnh **và** mọi `Place` con.

- **Ràng buộc cây (validate ở tầng app):** `province` ⇒ `parentId = null`; `destination` ⇒
  `parentId` trỏ tới một `province`. **Đúng 2 mức**, không lồng destination.
- **`treatAsDestination`** (chỉ có nghĩa với tỉnh) — bật khi TỈNH tự nó là một điểm đến ("đi
  Ninh Bình", "đi Huế"); khi đó tỉnh xếp ngang hàng `destination` ở dải `/diem-den`.
  · **KHÔNG mượn `isFeatured`**: `isFeatured` = "có đề cử lên trước không";
    `treatAsDestination` = "nơi này có tự đứng thành một chuyến không". Quảng Ninh nổi bật vì
    nó CHỨA Hạ Long, chứ bản thân không phải nơi người ta đặt vé.
  · Tỉnh bật cờ mà vẫn còn điểm đến con thì **cả hai cùng nằm trong dải** — đã chốt, đừng
    thêm luật ẩn/hiện. Cờ này không quyết định thứ tự.
- ⚠️ **Coi chừng nhóm mô hình hoá sai**: tỉnh có ĐÚNG một điểm đến con kiểu "tỉnh mới là điểm
  đến, con chỉ là một thắng cảnh" (Ninh Bình→Tràng An, Đà Nẵng→Bà Nà, Hà Nội→Ba Vì,
  TP.HCM→Cần Giờ, Gia Lai→Biển Hồ). Cách đúng: gắn listing thẳng vào tỉnh, hạ "điểm đến con"
  xuống thành `Spot`. Khác hẳn nhóm Lào Cai→Sa Pa, Khánh Hòa→Nha Trang — nhóm đó đúng.

## Địa lý hành chính — HAI LỚP, đừng trộn

Từ **1/7/2025**: **63 → 34 tỉnh**, **bãi bỏ cấp huyện** (còn 2 cấp: tỉnh → xã/phường/đặc khu).

| | Lớp **HÀNH CHÍNH** | Lớp **DU LỊCH** |
|---|---|---|
| Là gì | `provinceCode/Name`, `wardCode/Name`, địa chỉ, bộ lọc | `Place.name` / `slug` / SEO |
| Nguồn | `provinces.open-api.vn` **v2** (`lib/locations.ts`) + `lib/provinces.ts` | Biên tập tự đặt |
| Luật | **Luôn theo đơn vị mới** | **Theo tên dân gian.** Slug đã xuất bản KHÔNG đổi |

- ⚠️ **KHÔNG quay lại API v1** — v1 là bộ 63 tỉnh kèm **cấp huyện**, một cấp chính quyền đã bị
  bãi bỏ; v2 không có khoá `districts`.
- **29 tên tỉnh cũ đã mất** nhưng nhiều tên là thương hiệu du lịch mạnh (Hà Giang, Mũi Né,
  Hội An…) → sống tiếp thành `Place` kind=`destination`, **giữ nguyên slug/URL**.
- Sau sáp nhập **tỉnh là trục duyệt kém** (Lâm Đồng ôm cả Đà Lạt lẫn Mũi Né) → `Place` là trục
  chính, tỉnh chỉ là metadata; `lib/regions.ts` (3 miền) bền hơn tỉnh.
- **`wardName` mất sức phân biệt** (Phan Thiết ~14 phường nay còn 2) → dùng `areaOf(address)`.
  Tên xã/phường lưu **không kèm tiền tố** (`stripPrefix` cắt sẵn; seed phải theo).
- **`vietnam-map-paths.ts` (34 đường viền) dựng bằng DISSOLVE** từ bộ 63 cũ. ⚠️ **Đừng nối
  chuỗi `d` suông** — `share-map-button.tsx` có `stroke` nên ranh giới tỉnh cũ hiện thành vệt.

## Spot vs Activity — ĐỌC KỸ

> Hai thứ này KHÔNG đối xứng, và `Activity` KHÔNG phải "một việc cho một chỗ".

- **`Spot` = một CHỖ** (chấm được lên bản đồ). Mọi địa điểm thực địa đều là `Spot`, **kể cả
  khi điểm hấp dẫn của nó là một việc** (leo Bài Thơ ngắm cảnh vẫn là `Spot` "Núi Bài Thơ").
- **`Activity` = một LOẠI TRẢI NGHIỆM dùng lại** trong một điểm đến, M:N tới nhiều `Spot`. Đặt
  tên ở mức trải nghiệm ("Tắm biển", "Chèo kayak"), **KHÔNG nhúng tên spot** (❌ "Leo núi Bài
  Thơ"). *Đúng:* "Tắm biển" ←M:N→ [Ti Tốp, Bãi Cháy, Tuần Châu] — Ti Tốp là **1 Spot** được 2
  Activity trỏ tới, khỏi tạo trang trùng.
- **Chỉ tạo `Activity` riêng khi thoả ≥1**: ① trải nhiều spot · ② có đơn vị/đặt chỗ/giá · ③ là
  nhu cầu tìm kiếm độc lập ("săn mây Sa Pa"). Không thoả → **để nguyên là `Spot`**.
- Quan hệ M:N này là **xương sống** của phần này. **Quản lý một chiều từ `Activity`**; trang
  `Spot` hiển thị ngược (read-only).
- **Tỉ trọng đổi theo điểm đến** (Hạ Long *activity-led*, Hội An *spot-led*) → UI phải co
  giãn, không ép hai lưới cân nhau.
- **Đơn vị cung cấp/đặt chỗ không tách entity** — lưu thẳng trên `Activity`. Cần trang riêng
  mới tách `Provider`.

### Tiền: `ticketTiers` = VÉ VÀO CỬA · `extraFees` = CHI PHÍ TẠI CHỖ

Cả `Spot` lẫn `Activity` đều có hai trường (`Json`, helper ở `lib/tickets.ts`).

- `ticketTiers` = khoản **bắt buộc để vào/tham gia**; `ticketPriceLabel()` lấy giá nhỏ nhất →
  chip "Từ …đ". `extraFees` = gửi xe, xe ôm bản địa, thuê phao… → card "Chi phí khác tại chỗ",
  **không** đụng chip hero.
- ⚠️ **ĐỪNG nhét dịch vụ vào `ticketTiers`** — một dòng "Gửi xe 10.000đ" biến giá vào cổng của
  cả địa điểm thành "Từ 10.000đ" ở 5–6 chỗ gọi hàm đó. Seed Tà Xùa từng mắc.
- Ba trường **không có** ở `TicketTier` là lý do phải tách kiểu: **`unit`** (vé luôn theo đầu
  người, dịch vụ thì không), **`priceTo`** (giá thoả thuận gần như luôn là một KHOẢNG),
  **`required`** ("cầm tối thiểu bao nhiêu tiền mặt").
- `price = null` ⇒ **"Thoả thuận"**, đừng bịa số. **CỐ Ý KHÔNG cộng tổng "tối thiểu cần
  mang"** — đơn vị lệch nhau (10.000đ/xe + 50.000đ/người) nên mọi phép cộng đều sai vô hình.
- Giữ **đúng thứ tự biên tập nhập** (đó là thứ tự gặp trên thực địa).
- **KHÔNG dựng "xe ôm bản địa" thành `Activity`** — không thoả cả ba tiêu chí trên.

## Đặc sản vs Quán ăn

> ⚠️ **`Specialty` ĐANG TẮT**: hiển thị công khai đã gỡ, `/cms/specialties` khoá bằng cờ
> `DISABLED`. **Bảng, quan hệ M:N, seed, ảnh vẫn còn NGUYÊN** — không xoá gì, không migration.
> Dựng lại UI thì lấy trong git (`food-menu.tsx`, `specialty-detail.tsx`, `food-cross-link.tsx`,
> `food-layout.ts`). Lý do tắt: phần lớn điểm đến chỉ có vài món thật sự là đặc sản, còn lại là
> "món ngon của một quán" — thứ `Specialty` không mô tả đúng. **Chốt hướng đi trước khi bật.**

- `Eatery` = một CHỖ ăn (giống `Spot`); `Specialty` = một MÓN dùng lại (giống `Activity`), gắn
  **2–4 quán tiêu biểu**, quản lý một chiều. Món signature chỉ-một-quán → để trong mô tả `Eatery`.
- **KHÔNG làm phần "quà / sản vật mua về"** — dự án chỉ nói chuyện ĂN TẠI CHỖ.
- **`Eatery.meals[]`** là **trục lọc chính của phần ĂN**, vuông góc với `category` (kiểu món).
  KHÔNG suy từ `openingHours`; biên tập gắn trực tiếp.
- **KHÔNG có `priceRange`** ở `Specialty` lẫn `Eatery` — cố tình bỏ, thang $/$$/$$$ không nói
  được gì hữu ích cho quán ăn. (Vẫn có ở `Spot`/`Accommodation`.)
- Quán view: **`venueKind`** (`eat`|`drink`|`both`, vuông góc với `category`) · **`viewType`**
  (trục lọc, thay cho tag chữ tự do kiểu "view đẹp") · **`bestTime`** (khác `openingHours`).
- ⚠️ **Ranh giới `Spot` ↔ `Eatery`**: chỗ **bán đồ ăn/uống và giá trị chính là ngồi lại** →
  `Eatery` (dù view đẹp); điểm ngắm **công cộng, không bán gì** → `Spot(viewpoint)`. **Không
  tạo cả hai cho cùng một chỗ.**

## Nơi lưu trú — định vị

> **Danh bạ chỗ ở ĐÃ XÁC MINH CHÍNH CHỦ, KHÔNG phải OTA.** Giá trị độc nhất so với group
> Facebook là **niềm tin có cấu trúc** — đúng kênh liên hệ, đúng người, tránh page nhái & lừa
> cọc. OTA đã lo phần đặt phòng cho khách sạn lớn; khoảng trống thật là **homestay nhỏ + lừa cọc**.

- ✅ TRONG: thông tin cơ sở · kênh liên hệ chính chủ đã xác minh (`zalo` là kênh chốt phòng ở
  VN, `facebookUrl` để đối chiếu page nhái) · huy hiệu xác minh · cảnh báo cọc · URL ổn định
  `/luu-tru/[slug]`.
  ❌ NGOÀI: lịch phòng, thanh toán/giữ cọc qua web, booking engine, review người dùng.
- ⚠️ **KHÔNG lưu số tài khoản (STK)** — STK dễ đổi → dữ liệu cũ thành sai = vô tình tiếp tay
  lừa đảo. `verifiedNote` **chỉ nội bộ**, không hiện public.
- ⚠️ **KHÔNG có `priceRange`** trong schema → hiện không có trục ngân sách. Cần lọc theo giá
  thì phải thêm trường trước.
- **Trang chi tiết `/luu-tru/[slug]` = canonical, ĐÍCH ĐỂ CHIA SẺ** (chủ homestay in link gửi
  khách) — ngoại lệ của nhóm "drawer-only" vì cần link ổn định chống nhái.

## `Transport`

> Nội dung **hướng dẫn**, có màn hình riêng `/diem-den/[placeSlug]/di-chuyen` (token trong
> route `[loai]`, **không tạo file route mới**). **KHÔNG trang chi tiết per-item, không slug,
> KHÔNG dùng ảnh** — nhận diện bằng icon theo `mode`.

- `direction` = `getTo` (đến nơi từ bên ngoài, có `fromName`) | `getAround` (phương tiện tại chỗ).
- `glyphs.tsx` có **7 hình vẽ theo HỌ** chứ không theo từng `mode`: `car` (ô tô·taxi·xe
  ghép·đưa đón) · `bus` · `train` · `plane` · `boat` · `two-wheel` (xe máy·xe đạp·xích lô) ·
  `walk`; `other` → `navigation`. Ở 16–20px taxi và ô tô chỉ khác cái mào đèn, mà **nhãn chữ
  ngay cạnh đã nói chính xác là gì**.

## Quy ước bảng

- **`category`** — enum, **tên field thống nhất là `category` ở mọi entity** (nhãn UI có thể
  khác); tập giá trị riêng theo loại, xem schema.
- **`tags[]`** — nhãn tự do dùng chung mọi `Listing`, cắt ngang để lọc. Cần quản lý tập trung
  mới nâng thành entity `Tag` + M:N.
- **`AdminFields`** — trang công khai luôn lọc `status = 'published'`; sắp xếp `isFeatured` →
  `order` → `popularity` → `createdAt`.
- **`Image`** và **`PostRef`** dùng **exclusive arc** (nhiều FK nullable, đúng MỘT được set;
  ràng buộc kiểm ở tầng app). `PostRef` **không gồm `transport`** (không có trang chi tiết).
- `Post.content` lưu **chuỗi HTML** từ TipTap; đọc lại **phải qua `lib/sanitize.ts`**.

> ⚠️ **BẤT BIẾN — ảnh `kind: "menu"` KHÔNG BAO GIỜ `isCover = true`.** Nhờ vậy mọi truy vấn
> `where: { isCover: true }` rải khắp dự án tự loại ảnh menu ra. Giữ ở ba nơi: route upload ·
> `setCoverImage` (từ chối ảnh menu) · `deleteImage` (chọn bìa thay thế chỉ trong `gallery`).
> **Chỗ nào lấy cả gallery mà KHÔNG lọc `isCover` thì phải tự lọc `kind: "gallery"`.**
>
> Prisma **không cho select cùng một quan hệ hai lần dưới hai tên** → `fetchEateryDetails` lấy
> `images` kèm `kind` rồi tách trong JS (vẫn một truy vấn).

---

# 2. URL & điều hướng

**URL ngắn & phẳng** — phân cấp thể hiện qua breadcrumb + nội dung trang, không qua path.

```
/diem-den/[placeSlug]          ·  /diem-den/[placeSlug]/[loai]
   [loai] = hoat-dong | dia-diem | am-thuc | luu-tru | di-chuyen
/hoat-dong/[slug]  /dia-diem/[slug]  /luu-tru/[slug]  /dac-san/[slug]  /quan-an/[slug]
```

- Trang chi tiết **không phụ thuộc Place trong URL** → ổn định kể cả khi đổi `placeId`.
  `am-thuc` và `di-chuyen` **không có trang chi tiết per-item**.
- **Slug** không dấu nối bằng `-`, **duy nhất trong từng loại**; trùng tên thì gắn địa danh.
  ⚠️ **Tiền tố là từ khoá dành riêng** — `RESERVED_SLUGS` / `RESERVED_TRIP_SLUGS` trong
  `src/lib/slug.ts`.
- **`/lich-trinh` chia theo CÔNG KHAI vs RIÊNG TƯ**: mẫu ở tầng một (có index, đích SEO), mọi
  thứ của người dùng dưới **một** tiền tố `/lich-trinh/cua-toi` (noindex, `sw.js` chặn cache
  bằng đúng một dòng). URL cũ đều có redirect vĩnh viễn.

## Trang điểm đến — layout chung của các tab con

```
diem-den/[placeSlug]/
├─ page.tsx      ← Tổng quan: hero LỚN (NGOÀI group)
├─ ban-do/       ← cũng ngoài group (bản đồ 100dvh)
└─ (tabs)/ layout.tsx (PlaceTabs + PeerBar, dựng MỘT lần) · loading.tsx · [loai]/ · cong-dong/
```

- Đổi tab thì Next chỉ tải lại `page`, **layout không dựng lại** → `getPlaceHero`,
  `getPlaceCounts`, `getVisitors`, `getReviewSummary`, `getDestinationPeerGroups` hết chạy
  lại. Hai hàm đầu bọc **`cache()`** vì layout và page cùng cần trong một request.
- **Tab con KHÔNG có hero** — danh tính gộp vào thanh tab (`PlaceTabs` nhận prop `place`).
  Truyền `place` cũng có nghĩa là **bỏ mục "Tổng quan" khỏi dải tab**. **Không có nút "đã
  đến"/chia sẻ ở tab con** (hành động cấp ĐIỂM ĐẾN) — nhờ vậy layout không cần phiên đăng
  nhập lẫn truy vấn check-in.
- ⚠️ **Giữ nguyên `h-12` cho `PlaceTabs`**: `FoodSection` (`top-12 lg:top-28`),
  `TransportSection`, `PlaceReviews` (`lg:top-28`) đều neo theo con số đó và cái sai sẽ im lặng.
- ⚠️ **Đổi tab thì CUỘN LÊN ĐỈNH — mặc định của Next, đừng ghi đè.** `scroll={false}` đã thử và
  bỏ: nó chỉ chạy giữa các tab con, còn Tổng quan ↔ tab con thì `PlaceTabs` unmount/mount lại
  nên không hiệu chỉnh được — mà đó mới là chỗ lệch nhiều nhất.
- ⚠️ Còn treo: `SiteSetting.heroLayout` chỉ áp cho trang tổng quan; `ban-do` chưa vào group nên
  vào đó là mất thanh tab.

## Header · BottomNav · TripDock

- Nav header ở `site-header.tsx` (mảng `NAV`); mobile là `mobile-menu-sheet.tsx` với danh sách
  **riêng** — **phải sửa cả hai chỗ** mới đồng bộ.
- ⚠️ **ĐANG TẠM ẨN** (route vẫn vào được bằng URL, chỉ gỡ lối vào): nhóm "Uy tín"
  (`/kiem-tra`, `/sale`) · "Cộng đồng" · bốn trang "Sắp có" · tab Cộng đồng trong
  `buildPlaceTabs` · khối "Hỏi đáp cộng đồng" (cờ `COMMUNITY_ENABLED`) · mục `cong-dong` trong
  `bottom-nav.tsx` và `lib/spot-nav.ts`. Lối vào Cộng đồng duy nhất còn lại là link ở
  `site-footer.tsx` — **cố ý giữ**.
  · `COMMUNITY_ENABLED` khai kiểu **`boolean`**, không để TS suy ra literal `false` — literal
    khiến TS coi nhánh JSX bên trong là không chạm tới được và mọi thu hẹp kiểu mất hiệu lực.
- **`BottomNav`** theo khuôn **UITabBar của iOS**, chỉ dưới `lg`: tràn hết bề ngang, dán đáy,
  không bo góc/đổ bóng, hairline 1px mép trên, cao **49pt**; mục đang mở chỉ đổi **icon viền →
  icon đặc** + màu tint. **Đừng "cải tiến" thành Material.**
  · Icon vẽ riêng ở **`nav-icons.tsx`** (viền/đặc), **KHÔNG dùng `Ic`/Material Symbols**; bộ
    này **dùng chung với cụm icon bên phải header**.
  · **Né thanh công cụ trình duyệt**: đo bằng `visualViewport` → `--browser-bottom-chrome`,
    cộng vào **PADDING** chứ không phải `bottom`; che > 160px thì coi là bàn phím ảo, bỏ qua.
  · ⚠️ **Thêm phần tử `fixed` bám đáy mới thì cộng `var(--bottom-nav-h)` vào `bottom`** — bám
    đáy–PHẢI thì cộng thêm **`var(--trip-dock-h)`**.
  · **Ẩn ở** `/cms` `/sale` `/login` `/offline` (`HIDDEN_ON` — giữ đồng bộ với
    `install-prompt.tsx` và `NEVER_CACHE` trong `sw.js`).
  · ⚠️ Không đọc session: **root layout không được gọi `auth()`** (sẽ phá `force-static` của
    `/offline`).
- **`TripDock`** — nút nổi ở mọi trang công khai, viên tròn 44px **giữa cạnh phải** (tránh dải
  đáy vốn đã đông, nhờ vậy không thanh nào phải chừa chỗ). Ẩn ở `/lich-trinh` `/ban-do` `/cms`
  `/sale` `/login` `/offline`.
  · ⚠️ `DndContext`/`DragOverlay` phải nằm **ngoài** `DrawerContent` (vaul đặt `transform` lên
    panel ⇒ `position: fixed` bên trong lệch gốc toạ độ); vùng danh sách cần `data-vaul-no-drag`.

---

# 3. Quy ước giao diện

Trước khi dựng/chỉnh giao diện: theo **skill `design`** (`.claude/skills/design/SKILL.md`).

- **Bo góc — bộ số nhỏ dùng chung toàn site**: `R_CARD` 6px · `R_CTRL` 4px · `R_BADGE` 3px
  (`lib/radius.ts`; CSS ghi số trực tiếp). KHÔNG `rounded-full`/`xl`/`2xl`/`3xl`.
- **KHÔNG dùng `·` làm dải phân cách** — ngăn bằng khoảng trắng rộng, mốc mỗi mẩu là số/từ
  khoá in đậm.
- **Icon thân trang lấy từ `components/site/glyphs.tsx`** (SVG tự vẽ: khung 24, nét 1.8, chỉ
  đường thẳng + cung tròn), KHÔNG phải `@/components/icons`. Hình mới giữ **chiều cao quang
  học ~60–70% khung**. ⚠️ `AddToTripButton` vẫn dùng icon Material (component dùng chung).
- **MÀU MANG NGHĨA**: **xanh = "đi lúc nào cho đúng"** (`bestTime`, `seasonText`) · **cam =
  cảnh báo** (`notice`) · xám = còn lại. **Giá KHÔNG dùng màu xanh.**
- **Chỉ thứ BẤM ĐƯỢC mới có viền**; tin phụ dùng nền. Mỗi khối khai độ nổi **một lần** — viền
  HOẶC bóng.
- ⚠️ **Chữ trên nền sáng dùng bản `-ink`** (`--warm-ink`, `--primary-ink`); `--warm`/`--primary`
  chỉ cho MẢNG nền đặc — dùng chúng làm chữ trên nền sáng chỉ đạt 1,7–2,8:1.
- **Khổ nhỏ nhất phải chạy được là 320px.** Hàng số liệu hero giữ MỘT HÀNG tới 320px bằng cách
  **bỏ CHỮ chứ không bỏ SỐ**; bong bóng "+N" phải **render hai bản** rồi để `display` chọn.
- ⚠️ **Kiểm layout hẹp KHÔNG chụp bằng `--window-size`** — Chrome headless trên macOS có bề
  rộng cửa sổ tối thiểu (~500px) nên nó chỉ **cắt** ảnh chứ không đặt viewport. Cách đúng: file
  HTML tạm nhúng `<iframe src="…" width="320">` rồi chụp file đó.

## Năm tab con + tab tổng quan của trang điểm đến

Mỗi tab **một component riêng**, dùng chung khung lọc ở **`listing-filter.tsx`**. Tab tổng quan
là **bản xem trước** của năm tab đó, dùng chung vật liệu ở **`preview-tile.tsx`**.

- ⚠️ **`ListingView` đã XOÁ — đừng dựng lại component "danh sách chung chung"**: mỗi loại có bộ
  trường và bộ câu hỏi khác nhau; cái chung duy nhất là khung lọc, và nó đã tách ra rồi.
  Cũng đừng dựng thẻ riêng cho từng mục xem trước — đó là thứ vừa phải dọn.
- **Khối mở đầu mọi tab**: không có nhãn nhỏ trên tiêu đề (thanh tab đã nói); tiêu đề theo
  giọng **"việc + nơi"**; dải dữ kiện **KHÔNG đếm lại thứ màn hình đã đếm** mà dùng
  **`compositionLine()`** (*Nhiều nhất là biển*…). Dùng "nhiều nhất" chứ không "phần lớn" —
  trên dữ liệu thật loại đông nhất chỉ chiếm khoảng một phần ba.
- ⚠️ **Con số trong dải phải đếm trên TOÀN BỘ danh sách, không trên mấy mục đang hiện.** Ở tab
  tổng quan có **bốn truy vấn GẦY** (`spotFacts` · `activityFacts` · `foodFacts` · `stayFacts`)
  chạy chung một `Promise.all`, truyền xuống qua prop `facts`.
- ⚠️ **KHÔNG in số sao lên thẻ.** `Review` là **`stance`** (love/worthOnce/meh/bad), không phải
  thang điểm. Bản cũ quy về sao: Bàu Trắng có ĐÚNG MỘT đánh giá "meh" nên thẻ hiện **"0,0"**.
  Nay hiện "3/4 khách thấy đáng đi" và **chỉ khi ≥ 3 lượt** (`MIN_REVIEWS`).
- **Giá chỉ nói khi CÓ BÁN VÉ** — 6/8 địa điểm Phan Thiết vào tự do nên "Miễn phí" lặp sáu lần
  không phân biệt được gì. Huy hiệu dựng từ `ticketTiers`, cố ý **không rơi về `ticketInfo`**
  (trường đó là câu văn, nhét vào huy hiệu góc ảnh thì vỡ).
- ⚠️ **`SpotSpotlight` đã gỡ hẳn, đừng dựng lại** — hero ngay trên đã là một dải ảnh tự đổi có
  play/pause, và một bản xem trước không được nặng hơn thứ nó xem trước.
- **Ẩm thực ở tab tổng quan**: không tách quán ăn / quán nước thành hai khối; `pickVenues` giữ
  **tối đa 2/4 ô cho quán nước** và vì vậy quán nước phải **truy vấn RIÊNG** — xếp chung rồi
  cắt thì chúng gần như không bao giờ lọt (đứng cuối theo `order`).
- **Lưu trú** lấy **trạng thái xác minh làm xương sống**: TÁCH HAI NHÓM theo `isVerified`, mỗi
  nhóm một câu nói rõ trạng thái đó nghĩa là gì (nên **không có** nút lọc "chỉ chỗ đã xác
  minh"). Thẻ giữ tối thiểu; kênh liên hệ/tag/chính sách cọc **chỉ ở popup / trang chi tiết**.
  · Thẻ có HAI đích tách bằng VỊ TRÍ: link thật ở TÊN + `after:absolute after:inset-0`
    (**đừng bọc cả thẻ trong `<a>` rồi nhét `<button>` vào** — HTML không cho lồng).
  · ⚠️ **"Xem nhanh" có HAI bản tách bằng `@media (pointer: …)`**, không phải breakpoint bề
    ngang — thứ quyết định là **có chuột hay không**. Ẩn bằng **`display`** chứ không bằng
    `opacity` (để bản bị ẩn biến khỏi cây trợ năng). **Đừng gộp lại thành một.**
  · ⚠️ Component này **KHÔNG dùng màu cứng** — theme có `primary`/`warm`, dùng token thì dark
    mode mới đúng.

### Màn hình Ẩm thực

- **Popup chi tiết** hai cột từ `lg`, thanh ghim đáy với **"Chỉ đường"** làm nút chính; khoá
  `lg:h-[min(88vh,44rem)]` — để cao tự do thì ảnh hụt lại và hở mảng trắng. Cột phải xếp theo
  THỨ TỰ QUYẾT ĐỊNH, **giờ mở cửa ở TRÊN mô tả**.
- **MỘT carousel cho cả ảnh quán lẫn ảnh thực đơn** (`@/components/ui/carousel` trên embla) —
  **không tự viết bộ chuyển ảnh**; khác nhau chỉ ở `cover` vs `contain`.
  · Mũi tên phải **tự dựng đè lên ảnh** (mặc định neo `-left-12`, tức NGOÀI khung); ẩn dưới `sm`.
  · Dải ảnh nhỏ cần **`-m-1 p-1`** — vòng `ring` vẽ RA NGOÀI khung, không chừa chỗ thì
    `overflow-x-auto` cắt cụt viền.
- **Thực đơn = ẢNH, không phải bảng món** (**không có bảng `MenuItem`**): giá món sẽ sai một
  cách vô hình. Ảnh menu **không bao giờ bị cắt** (`contain`) — giá trị nằm ở CHỮ.
- **"Giờ này còn mở không" là thông tin đắt nhất của trang** (`lib/opening-hours.ts`):
  · tính theo **giờ Việt Nam** (`Asia/Ho_Chi_Minh`), KHÔNG theo đồng hồ máy;
  · chỉ chạy **ở client** (`useEffect` + tick 60s) — server không biết "bây giờ" của người xem
    và trang thì được cache;
  · chuỗi giờ đọc không được → **không hiện huy hiệu**, tuyệt đối không đoán.
- **KHÔNG chia khối theo `venueKind`** — trục đó không sạch trong dữ liệu thật (quán `eat` vẫn
  có `viewType`, quán `both` bị đếm hai lần). Trục BỮA diễn đạt chính xác hơn.
- ⚠️ **Đừng thêm lại trường văn xuôi tự do trên `Place`** (`foodIntro`/`foodTips`/`getToIntro`/
  `getAroundIntro` đã xoá khỏi schema): CMS không có ô nhập nên chỉ seed ghi được, nội dung
  đóng băng theo lần seed. Thông tin thực địa sống ở trường có cấu trúc của chính mục đó; dài
  hơn nữa thì là một bài blog.

## Trang chủ

- Hero đổi ảnh mỗi 7s, **chữ KHÔNG đổi theo ảnh**. ⚠️ **A11Y/SEO:** `<h1>` luôn chứa MỘT tên cố
  định (`sr-only`), phần chạy chữ là trang trí nên `aria-hidden`.
- ⚠️ **`hero-pan` đòi section phải `overflow-hidden`** — `<Image fill>` chỉ NEO theo section chứ
  không bị nó cắt, nên ảnh phóng 1.07 tràn xuống dưới hero thành một dải lạc lõng.
- ⚠️ **Không keyframe nào được đụng `opacity`** — hiệu ứng không được là điều kiện để chữ nhìn
  thấy được (bản hero cũ từng ra một tấm ảnh trắng trơn khi chụp kiểm).
- Chiều cao hero `min-h-[min(86svh,52rem)]`, **không phải `h-` cứng**. Bảng màu hero viết
  **thẳng mã màu, không qua token** — token lật theo theme, còn hero tối ở cả hai theme.
- **CỐ Ý KHÔNG đếm số tỉnh** ở dải số liệu ("18/34" đọc ra như thanh tiến trình dang dở). Lưới
  khai `grid-cols-2` **từ khổ nhỏ nhất** — không khai cột thì track co theo max-content và tràn.

### `CtaButton`

Ba tone: `surface` (nền brand) · `photo` (trắng, trên ảnh) · `glass` (kính mờ, nút phụ).

- `photo` dùng `text-neutral-900` **không phải `text-foreground`** (viên nút trắng không đổi
  theo theme). `surface` dùng `bg-brand` **không phải `bg-primary`** (`--primary` tự sáng lên
  trong `.dark` → nút đục ra hai sắc xanh).
- ⚠️ **`bg-brand` + `bg-gradient-to-b` triệt tiêu nhau qua `cn()`** — tailwind-merge xếp cả hai
  vào nhóm `bg-`, cái sau nuốt cái trước → nút ra nền TRẮNG với bóng xanh dưới chân. Viết
  chuyển sắc bằng thuộc tính tuỳ ý (`[background-image:linear-gradient(...)]`).

## `/ban-do`

**Trả lời câu hỏi KHÔNG GIAN, không phải bản sao của `/diem-den`.** Hai chế độ: **Quanh đây**
(chọn mốc → `getDistances()` OSRM table một lượt → xếp theo giờ lái, lọc ≤2/4/6 giờ) và **Đo
chuyến** (bấm theo thứ tự → `getRoute()` + `legs[]` → tổng km/giờ → nút tạo lịch trình).

- **Ngưỡng lọc là GIỜ LÁI, không phải bán kính km — và không có vòng tròn**: bản km nói dối
  ngay trên dữ liệu thật (lọc "200 km" đường chim bay nhưng hàng ghi "376 km · 4 giờ 31"). Nơi
  ngoài ngưỡng **mờ đi** chứ không biến mất.
- **OSRM ngoài tầm tay** (máy chủ demo, không SLA): hỏng hoặc đang chờ thì **không lọc**, chỉ
  xếp theo đường chim bay và nói thẳng ở dòng đếm.
- ⚠️ **Trạng thái pin NƯỚNG vào icon**, không `classList.toggle` sau khi dựng — markercluster
  tạo lại phần tử marker mỗi lần gom/tách cụm nên class gắn sau biến mất.
- ⚠️ **Đừng dùng `L.circle(...).getBounds()` để canh khung** — hàm đó đọc `this._map`, circle
  chưa gắn vào bản đồ sẽ ném `layerPointToLatLng` của `undefined`.
- **Khung nhìn do PANEL quyết định** (prop `focus` + `token`), bản đồ chỉ thi hành.
- Popup dựng bằng `innerHTML` → **chữ nghĩa nằm ở `.dl-pop*` trong `globals.css`, KHÔNG viết
  class Tailwind trong template string**.
- **Đã bỏ, đừng thêm lại**: ô tìm kiếm · chip lọc miền · lọc "Nổi bật" · lớp "Địa điểm chi
  tiết" · chỉ đường A→B từ GPS.
- ⚠️ **Bản đồ chỉ thấy nơi CÓ toạ độ**; số vắng mặt gần như toàn là tỉnh.
  `getDestinationMapPoints()` lấy theo thứ tự `Place.lat/lng` → `PLACE_COORDS` → trọng tâm listing.

## `/tai-khoan/da-den`

Bản đồ 34 tỉnh + checklist **chung một state**; là nơi duy nhất của site **xuất ra một tấm ảnh
để chia sẻ** (`buildShareCard`).

- **Ô đánh dấu VUÔNG** (`R_BADGE`) + glyph **`tick`** (tick TRẦN). Đừng nhét `check` vào —
  `check` là tick **trong vòng tròn**, lồng vào ô vuông đặc thì ra một đốm tròn.
- ⚠️ **Lỗi hydration im lặng đã sửa — đừng dựng lại:** `<title>` trong SVG của `VietnamMap`
  từng nhận **hai** biểu thức con. Hai child liền nhau thì React SSR phải chèn dấu ngăn mà
  `<title>` của SVG không giữ được → cây lệch, React dựng lại cả nhánh (chỉ hiện thành "1
  Issue" trong overlay dev). **Ghép chuỗi trong JS để `<title>` có đúng MỘT child.**
- **Tuỳ chỉnh lưu theo người** ở `User.mapCardOptions` (Json), đọc/ghi qua
  **`parseMapCardOptions()`** — **mọi lối vào ra đều phải qua hàm đó, kể cả lúc ghi**: cột Json
  không có schema nên đây là chỗ duy nhất được phép tin dữ liệu. Không dùng `localStorage`
  (đổi máy là mất, hỏng đúng lời hứa "chỉnh một lần"). Trang đọc **ở server** rồi truyền xuống
  `initialOptions`.
- ⚠️ **`accent` chỉ tô MẢNG, không bao giờ tô CHỮ** — hex người dùng tự chọn nên không ai bảo
  đảm nó đọc được (cam mặc định `#e3852f` chỉ ~2,5:1). Tick để **trắng cứng**; tỉnh đã đến tô
  qua `style` nên hover đổi bằng **độ mờ**.
- **Ba dòng chữ của ảnh là CỐ ĐỊNH** (`MAP_CARD_TEXT`) — nhãn và tiêu đề là GIỌNG của sản phẩm,
  dòng chân phải nói đúng một việc: tấm ảnh này tạo ở đâu. Ô duy nhất còn sửa được là **TÊN**,
  điền sẵn từ tài khoản; nhưng khi bản ghi **đã có** khoá `name` — kể cả chuỗi rỗng — **thì tôn
  trọng**, nếu không người cố tình bỏ tên sẽ không bao giờ bỏ được.
  · ⚠️ **KHÔNG nhét tên miền vào dòng chân** — dự án chưa chốt domain ở bất kỳ đâu trong mã
    nguồn, viết đại một cái là in thông tin sai lên ảnh người ta đem đi chia sẻ.
- **HAI NÚT**: "Tuỳ chỉnh" (nút chính là **Lưu thay đổi**; "Đặt lại" chỉ đổi bản nháp) và
  **"Xuất ảnh"** (tải PNG ngay) — chỉnh là việc làm một lần, xuất ảnh là việc làm lại nhiều lần.
- **Tấm ảnh xuất ra phải nói cùng hình với trang** — đổi hình ở trang thì đổi luôn ở
  `checklistItem` / `mapBlock`.

---

# 4. Kỹ thuật

**Next.js 16** (App Router, RSC) + **React 19** · **TypeScript** strict (`@/*` → `src/*`) ·
**Tailwind v4** · **shadcn/ui** (`new-york`) trên **Radix** · **Prisma 7 + PostgreSQL**
(client sinh ra `src/generated/prisma`, adapter `@prisma/adapter-pg`) · **Auth.js v5** ·
**pnpm bắt buộc** (không có npm/npx).

Thư viện lớn — **đừng thêm gói trùng vai trò**: `leaflet` + `react-leaflet` +
`leaflet.markercluster` (luôn `ssr: false`, xem `components/map/*-inner.tsx`) · `uploadthing` ·
`@tiptap/*` · `ably` (không key → rơi về polling) · `posthog-js` (không key → no-op) ·
`recharts` · **`embla-carousel-react` là bộ carousel DUY NHẤT** · `sonner` · `vaul` · `cmdk` ·
`qrcode.react` · `zod`.

```bash
pnpm dev · build · start · lint · exec tsc --noEmit
pnpm add <pkg>                     # KHÔNG dùng npm install
pnpm dlx shadcn@latest add <component>
pnpm check:loading                 # kiểm màn chờ chuyển trang
pnpm exec prisma generate          # BẮT BUỘC sau khi đổi schema
pnpm exec prisma migrate dev · studio
pnpm set-role <email> [role] · pnpm seed:*
```

## Quy ước & bẫy

- ⚠️ **`proxy.ts` chứ không phải `middleware.ts`** (Next 16 đổi tên quy ước). Đặt ở
  `src/proxy.ts`, export default.
- **Server Components mặc định**; chỉ `"use client"` khi thật sự cần. Truy vấn dữ liệu làm ở
  Server Component.
- ⚠️ **Auth split config (BẮT BUỘC giữ):** `auth.config.ts` edge-safe (**KHÔNG import Prisma**)
  cho `proxy.ts`; `auth.ts` thêm `PrismaAdapter` + JWT strategy cho server component/route
  handler. **Đừng import `@/auth` vào `proxy.ts`** — vỡ edge runtime.
- ⚠️ **Hằng dùng chung giữa server và client PHẢI nằm trong `lib/`**, không trong module
  `"use client"`. Nhìn từ Server Component, export của module client chỉ là một *client
  reference* — gọi vào sẽ ném "is not a function" **lúc chạy**, trong khi `tsc` và `lint` đều
  xanh. Không có gì bắt được lỗi này ngoài việc mở trang lên xem.
- **Prisma**: luôn import từ `@/lib/prisma` (singleton). **Schema là nguồn chân lý.**
- **Vai trò** `user`/`editor`/`admin` nhét vào JWT khi đăng nhập; `/cms` chặn ở `proxy.ts`
  **và** kiểm lại trong page. Đặt admin: đăng nhập 1 lần → `pnpm set-role <email> admin` →
  đăng xuất/đăng nhập lại.
- ⚠️ **`NEXT_PUBLIC_*` KHÔNG phải chỗ giấu bí mật** (Next nhúng thẳng vào bundle). Đổi biến
  `NEXT_PUBLIC_*` **phải khởi động lại dev server**.
- ⚠️ **Keyframes phải được một class trong `globals.css` tham chiếu.** Đặt `animation` chỉ bằng
  inline style thì **Lightning CSS loại @keyframes khi build** — hiệu ứng chết im lặng ở prod.
- **Comment trong mã nguồn: chỉ giữ thứ NGĂN MỘT LỖI** (dự án đã quét một lượt, xoá ~7.200
  dòng còn ~400). GIỮ: directive · bất biến và bẫy mà đọc code không thấy được · lý do một
  dòng code trông vô lý lại phải viết như vậy — một đến ba dòng. XOÁ: kể lại code đang làm gì ·
  sơ đồ ASCII · lịch sử "đã thử và bỏ" · lý lẽ thiết kế dài. **Lý lẽ thiết kế sống ở tài liệu,
  không nằm trong file code.**
- Trước khi báo "đã xong": chạy **`pnpm exec tsc --noEmit`** và **`pnpm lint`**.

## Màn chờ chuyển trang

> ⚠️ **`loading.tsx` phải nằm trong một SEGMENT URL THẬT.** `(site)` là **route group** — không
> tạo segment nào trong URL nên `(site)/loading.tsx` **không chạy** cho route lồng bên dưới.
> Lỗi này **không có gì báo**: typecheck/lint/build đều sạch, trang vẫn chạy, chỉ là màn chờ im
> lặng. Vì vậy có **`pnpm check:loading`** (Chrome headless qua CDP, bóp mạng 3G, BẤM THẬT một
> link rồi xem `.page-loading` có vào DOM không). Thêm route mới → thêm một dòng vào `CASES`.

- Màn chờ **hoãn 120ms** mới hiện — đo trên mạng chậm, đừng kết luận từ máy dev.
- **Tab con của trang điểm đến có màn chờ RIÊNG** (`(tabs)/loading.tsx`): khung xám nội tuyến,
  **không** dùng `PageLoading` (nó `min-h-svh`, sẽ đội trang cao vọt).

## PWA

- ⚠️ **Đổi `sw.js` thì PHẢI tăng `VERSION`**, nếu không cache cũ không bị dọn.
- SW **chỉ chạy ở production**; ở dev `PwaRegister` chủ động gỡ mọi SW và xoá cache.
- Chiến lược: điều hướng = network-first (mất mạng → bản đã xem → `/offline`); `/_next/static`
  + `/fonts` = cache-first; ảnh = stale-while-revalidate. Chỉ chặn `mode === "navigate"` —
  prefetch RSC cố ý để nguyên cho mạng.
- **Không cache khu vực cá nhân** (`NEVER_CACHE`). Thêm route riêng tư mới thì nhớ thêm vào đây
  **và** `HIDDEN_ON` trong `install-prompt.tsx`.
- ⚠️ **Đừng khai `icons` trong `generateMetadata`** — khai MỘT khoá là đè lên cả bộ file
  convention (`src/app/icon.png`, `apple-icon.png`), HTML mất sạch `<link rel="icon">`.
- **Favicon KHÔNG dùng mascot đầy đủ** (ở 16px nó rã thành một ô xanh đặc) — `pnpm
  build:favicon` dựng bản rút gọn, ô ĐẶC không trong suốt.
- Cố ý **chưa** đặt `viewportFit: "cover"`: `BackToTop` chưa chừa `safe-area-inset`.

---

# 5. Tài liệu riêng & phạm vi

**`docs/` — đọc trước khi động vào tính năng tương ứng, đừng phân tích lại từ đầu:**

| File | Trạng thái |
|---|---|
| [`docs/lich-trinh.md`](docs/lich-trinh.md) — schema `Trip`/`TripDay`/`TripItem`, máy tính giờ + cảnh báo giờ mở cửa, lịch trình mẫu, chia sẻ | **ĐÃ DỰNG v1** — bản đồ mã nguồn §12, còn thiếu §13 |
| [`docs/lich-trinh-cong-cu-nhom.md`](docs/lich-trinh-cong-cu-nhom.md) — ghi chú · đồ mang theo · chi phí | **ĐÃ DỰNG XONG**; mục *Phân công* bỏ hẳn |
| [`docs/lich-trinh-cong-tac.md`](docs/lich-trinh-cong-tac.md) — nhiều người cùng sửa, `TripMember`, `Trip.version` | Phân tích xong, **chưa code** (còn 3 câu phải chốt §7) |

**Đã chạy:** trang chủ · cây điểm đến · bản đồ (`/ban-do`, `/diem-den/[slug]/ban-do`) · trang
chi tiết `/dia-diem` `/hoat-dong` `/luu-tru` · blog · tìm kiếm · cộng đồng *(lối vào tạm ẩn)* ·
uy tín `/kiem-tra` `/sale` *(tạm ẩn)* · lịch trình (mẫu + `cua-toi` + `/s/[shareId]`) ·
`/tai-khoan/da-den` · `/thong-bao` · PWA đầy đủ · `BottomNav` · đếm lượt xem · review · Ably &
PostHog (tuỳ chọn). **CMS** `/cms` (gate admin/editor): CRUD đầy đủ cho mọi entity + analytics,
community + reports, reviews, sales, scam-reports, media, users, export, settings, lich-trinh.

**Dữ liệu mẫu:** 12 script seed; hai điểm đến dày nhất để thử giao diện là **Phan Thiết**
(dish-led) và **Tà Xùa** (view-led).
> ⚠️ `trip-ta-xua` cố ý chỉ 2N1Đ / 6 mục — Tà Xùa là điểm đến view-led, cả chuyến xoay quanh
> một việc. **Đừng "làm dày" nó cho cân với Phan Thiết**: nhồi điểm cho đủ ba ngày là bịa ra
> một chuyến không ai đi.

**Chỉ `ComingSoon`:** `/dich-vu` `/thue-xe` `/trai-nghiem` `/luu-tru` (trang index —
`/luu-tru/[slug]` thì đã chạy) `/lien-he` `/cau-hoi-thuong-gap` `/dieu-khoan` `/bao-mat`.

**Bước kế tiếp:** việc treo của Lịch trình ([`docs/lich-trinh.md`](docs/lich-trinh.md) §13) —
**kéo–thả** thay nút ▲▼, **lưu offline**, và điền toạ độ cho các tỉnh còn thiếu
(`pnpm backfill:place-coords` chỉ phủ được điểm đến).
