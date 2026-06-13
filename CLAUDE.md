# CLAUDE.md

Tài liệu định hướng cho Claude Code khi làm việc trong dự án này.

## Tổng quan dự án

Website **hỗ trợ thông tin du lịch** cho Việt Nam. Giúp người dùng tra cứu, khám phá
điểm đến theo cấu trúc phân cấp, từ tỉnh → điểm đến lớn → mọi thông tin cần biết để
trải nghiệm (ăn gì, chơi gì, ở đâu, đi lại thế nào).

Ngôn ngữ giao tiếp & nội dung: **tiếng Việt**. Code, tên biến, comment kỹ thuật: tiếng Anh.

## Mô hình dữ liệu cốt lõi

Vì **Tỉnh** và **Điểm đến lớn** có nội dung giống nhau (đều là một "nơi" có mô tả, ảnh,
và các mục con bên dưới), chúng được **gộp chung thành một entity `Place`** tự tham chiếu
cha-con. Tỉnh chính là một `Place` gốc — đúng với ý "coi tỉnh như một điểm đến cực lớn".

### `Place` — node phân cấp (gộp Tỉnh + Điểm đến lớn)

```
Place {
  id, slug, name,
  kind: 'province' | 'destination',   // province = Tỉnh; destination = Điểm đến lớn
  parentId: Place | null,             // province → null; destination → id của Tỉnh cha
  description,
  ...AdminFields                      // status, publishedAt, isFeatured, order, popularity, timestamps
}
// Ảnh qua entity Image (ownerType='place') — xem "Ảnh / media".
```
- **Tỉnh:** `kind='province'`, `parentId=null`.
- **Điểm đến lớn** (Sa Pa, Hội An...): `kind='destination'`, `parentId=<id Tỉnh>`.
- Một `Place` kind=`province` có thể có 0..N `Place` con kind=`destination`.
- **Ràng buộc cây (validate ở tầng app):** `province` ⇒ `parentId = null`; `destination`
  ⇒ `parentId` trỏ tới một `province` (KHÔNG cho destination lồng destination). Giữ đúng
  **2 mức**. `parentId` để kiểu đệ quy chỉ nhằm linh hoạt schema, không dùng quá 2 mức.

### `Listing` — các mục tầng dưới (gắn vào một `Place` bất kỳ)

> **Thuật ngữ quy ước:** **`Listing`** = nhóm tất cả entity tầng dưới gắn vào `Place`,
> gồm `Activity`, `Spot`, `Specialty`, `Eatery`, `Accommodation`, `Transport`. Khi tài
> liệu (hoặc người dùng) nói "listing" → hiểu là bất kỳ/tất cả các entity này. Đây là tên
> khái niệm chung, **không** phải một bảng riêng.

Mọi `Listing` gắn vào **một** `Place` qua `placeId` — `Place` đó có thể là Tỉnh (listing
thuộc trực tiếp về tỉnh) hoặc Điểm đến lớn. Không cần `destinationId` nullable nữa: chỉ
một khóa `placeId` duy nhất.

```
Place (province | destination)
└── placeId ──┬── Hoạt động & trải nghiệm  (Activity)    trekking, chèo SUP, săn mây...
              ├── Địa điểm nhỏ            (Spot)          điểm tham quan con
              ├── Đặc sản                 (Specialty)     món/sản vật đặc trưng
              ├── Quán ăn nổi tiếng       (Eatery)        nơi ăn uống đề xuất
              ├── Nơi lưu trú             (Accommodation) khách sạn/homestay
              └── Di chuyển               (Transport)     direction: getTo | getAround (inline)
```

> **Truy vấn "mọi `Listing` của một tỉnh":** lấy `placeId` của tỉnh **và** của mọi `Place`
> con (destination thuộc tỉnh đó), rồi lọc theo tập `placeId` này. Có thể tùy chọn lưu
> thêm `provinceId` denormalized trên mỗi `Listing` để lọc nhanh bằng một điều kiện —
> quyết định khi dựng schema/DB.

**Hướng dẫn biên tập — gắn vào tỉnh hay điểm đến?** Nếu listing nằm trong một điểm đến lớn
đã có (`destination`) → gắn `placeId` của điểm đến đó. Nếu nằm rải rác trong tỉnh hoặc tỉnh
chưa tách điểm đến nào → gắn thẳng `placeId` của tỉnh (`province`). Nguyên tắc: gắn vào
`Place` **cụ thể nhất** đang tồn tại.

### Quan hệ ngang (liên kết M:N, tùy chọn — KHÔNG phải cha-con)

- **Activity ↔ Spot** (M:N, 0..N): một hoạt động có thể diễn ra ở nhiều địa điểm nhỏ,
  một địa điểm nhỏ có thể có nhiều hoạt động — hoặc không liên kết.
  *Ví dụ:* "Tắm biển ở Hạ Long" → liên kết `Spot` Bãi Cháy **và** Bãi Tuần Châu.
- **Specialty ↔ Eatery** (M:N, 0..N): một đặc sản được phục vụ ở một/nhiều quán ăn, một
  quán ăn có thể có nhiều đặc sản — hoặc không liên kết.
  *Ví dụ:* đặc sản "Chả mực Hạ Long" → liên kết các `Eatery` bán món này.

Một `Activity` có thể gắn nhiều `Spot`, một, hoặc không gắn (vd "Trải nghiệm thủy phi cơ"
không gắn `Spot` nào). **Dùng bảng nối (join table) / quan hệ M:N của ORM** (Prisma
implicit/explicit M:N), không nhồi thành khóa ngoại đơn. Áp dụng cùng nguyên tắc khi thêm
liên kết tương tự về sau.

> **Đơn vị cung cấp / đặt chỗ:** không tách thành entity riêng. Hoạt động có đơn vị khai
> thác thì lưu thẳng trên `Activity`: `operatorName?`, `bookingUrl?`, `phone?`, `website?`.
> Nếu sau này đơn vị cần trang riêng hoặc dùng chung nhiều hoạt động, mới tách ra `Provider`.

### Bảng thuật ngữ (dùng nhất quán trong code & URL)

| Tên tiếng Việt | Tên code (EN) | Vai trò / quan hệ |
|---|---|---|
| Tỉnh / Điểm đến lớn | `Place` | node phân cấp; `kind` ∈ {province, destination}, `parentId` tự tham chiếu |
| Hoạt động/trải nghiệm | `Activity` | `placeId` bắt buộc; M:N với `Spot`; có trường đơn vị/đặt chỗ inline |
| Địa điểm nhỏ | `Spot` | `placeId` bắt buộc; M:N với `Activity` |
| Đặc sản | `Specialty` | `placeId` bắt buộc; M:N với `Eatery` |
| Quán ăn | `Eatery` | `placeId` bắt buộc; M:N với `Specialty` |
| Nơi lưu trú | `Accommodation` | `placeId` bắt buộc |
| Di chuyển | `Transport` | `placeId` bắt buộc; `direction` `getTo`/`getAround`; **inline trên trang Place, không có trang chi tiết riêng** |

Mỗi entity nên có tối thiểu: `id`, `slug`, `name`, `description`, và khóa ngoại tới cha
(`parentId` với `Place`; `placeId` với các `Listing`). Ảnh tách riêng thành entity
`Image` (xem "Ảnh / media"); trường trạng thái/sắp xếp xem "Trường quản trị".

### `Transport` — chi tiết

> **Khác các Listing còn lại:** `Transport` là nội dung **hướng dẫn**, **hiển thị INLINE**
> trên trang Place (section/accordion), **không có trang chi tiết/slug/URL riêng**. Không
> theo mẫu card→detail. Vẫn là một entity (bảng) gắn `placeId`, chỉ khác ở cách trình bày.

Mỗi bản ghi mô tả **một cách di chuyển**, phân biệt bằng `direction`:

```
Transport {
  id, placeId,
  direction: 'getTo' | 'getAround',   // (đổi tên từ 'kind' để khỏi trùng Place.kind)
  mode: 'car'|'bus'|'train'|'plane'|'boat'|'motorbike'|'taxi'|'grab'|'bike'|'walk'|'cyclo'|'shuttle'|'other',
  name,                 // vd "Xe khách Hà Nội → Hạ Long" | "Thuê xe máy tại Hội An"
  fromName?,            // CHỈ getTo: điểm xuất phát (vd "Hà Nội", "Sân bay Nội Bài")
  duration?,            // vd "3–4 giờ" (text linh hoạt)
  distanceKm?,
  priceFrom?, priceTo?, currency?,   // hoặc dùng priceRange tương đối nếu không có số
  operatorName?, bookingUrl?,        // hãng xe/tàu/vé (nếu có)
  description?          // hướng dẫn chi tiết, mẹo
}
// Không cần slug. Có thể có Image (ownerType='transport') cho section inline.
```
- **`getTo`** — cách đến nơi **từ bên ngoài** (thường có `fromName`, `duration`, `distanceKm`).
  Một `Place` có thể có nhiều bản ghi getTo cho nhiều điểm xuất phát khác nhau.
- **`getAround`** — phương tiện **tại chỗ** (taxi, thuê xe máy, đi bộ, xích lô, thuyền…);
  thường không có `fromName`.

### Trường dùng chung cho "cơ sở" (Spot, Eatery, Accommodation)

Ba entity trên đều là **địa điểm/cơ sở thực địa** → chia sẻ cùng nhóm trường. Coi đây là
một "field group" tái sử dụng (lặp lại trên từng bảng SQL, hoặc tách type/composite chung):

```
PlaceableFields {
  address?    string        // địa chỉ
  lat?, lng?  number        // tọa độ bản đồ
  openingHours? string|json // giờ mở cửa (text linh hoạt hoặc JSON theo thứ trong tuần)
  phone?      string
  website?    string
  bookingUrl? string        // link đặt bàn/đặt phòng/đặt vé
  priceRange? enum          // '$' | '$$' | '$$$' | '$$$$'  (mức giá tương đối)
}
```
- `Activity` thường **không** có địa điểm cố định (liên kết qua `Spot`) nên không bắt buộc
  nhóm này; có thể thêm `priceRange` và các trường đơn vị/đặt chỗ (`operatorName`,
  `bookingUrl`, `phone`, `website`) nếu hoạt động có chi phí/đơn vị khai thác.
- `priceRange` dùng thang tương đối cho gọn; nếu cần số tiền cụ thể sau này thì bổ sung
  `priceFrom`/`priceTo` + `currency` (mặc định VND) — quyết định khi dựng schema.

### Phân loại & tag (để lọc/duyệt)

Hai cơ chế bổ sung cho nhau:

1. **`category` — phân loại chính, kiểu enum** (mỗi bản ghi 1 giá trị). **Field tên thống
   nhất là `category` ở mọi entity** (nhãn hiển thị có thể khác: "Ẩm thực", "Loại hình"…),
   nhưng tập giá trị enum riêng theo loại:
   - `Spot.category`: `beach` | `mountain` | `waterfall` | `lake` | `cave` | `temple` |
     `viewpoint` | `village` | `island` | `park` | `other` (biển/núi/thác/hồ/hang/đền-chùa/
     điểm ngắm/làng/đảo/công viên…)
   - `Eatery.category`: `local` | `seafood` | `streetfood` | `vegetarian` | `cafe` | `bbq` |
     `other` (nhãn UI: "Ẩm thực")
   - `Accommodation.category`: `hotel` | `homestay` | `resort` | `hostel` | `guesthouse` |
     `villa` (nhãn UI: "Loại hình")
   - `Activity.category`: `adventure` | `nature` | `culture` | `relax` | `water` | `food` | `other`
2. **`tags[]` — nhãn tự do, dùng chung mọi `Listing`** (vd "view đẹp", "hợp gia đình",
   "check-in", "giá rẻ"). Cắt ngang để lọc linh hoạt.

> **Tags lưu thế nào:** bắt đầu đơn giản bằng `tags string[]` ngay trên bản ghi. Nếu sau
> này cần quản lý tag tập trung (đổi tên, gợi ý, đếm), nâng cấp thành entity `Tag` + quan
> hệ M:N. Field `category` (enum) nên định nghĩa trong code (TS union + Prisma enum) để
> type-safe; chỉ tách thành bảng khi cần admin tự thêm loại mới.
>
> **Lưu ý theo DB:** `tags string[]` lọc tốt trên **Postgres** (mảng + GIN index) nhưng
> trên **SQLite** chỉ là JSON string → lọc kém. Nếu chọn SQLite mà cần lọc theo tag, dùng
> entity `Tag` + M:N ngay từ đầu.

### Trường quản trị (dùng chung Place + mọi Listing + Post)

Nhóm trường vận hành/biên tập, lặp trên mọi bảng nội dung (`Place`, các `Listing`, `Post`):

```
AdminFields {
  status: 'draft' | 'published'   // mặc định 'draft'; chỉ 'published' hiển thị công khai
  publishedAt?                    // mốc xuất bản (null khi draft)
  isFeatured: boolean             // mặc định false — đánh dấu nổi bật
  order?: number                  // sắp xếp thủ công, nhỏ → đứng trước
  popularity?: number             // điểm phổ biến (lượt xem/đánh giá) để sắp tự động
  createdAt, updatedAt            // timestamp tự động
}
```
- Trang công khai luôn lọc `status = 'published'`; trang quản trị thấy cả `draft`.
- Sắp xếp danh sách: ưu tiên `isFeatured` → `order` (nếu có) → `popularity` → `createdAt`.
- `Post` đã có `status`/`publishedAt`/timestamps — gom về cùng quy ước này, thêm
  `isFeatured`/`order`/`popularity` nếu cần.

### Ảnh / media (`Image`)

Tách ảnh thành entity riêng (thay cho mảng URL `images[]`) để gắn được caption, nguồn,
alt, thứ tự. Một entity nội dung có nhiều `Image`; dùng **owner đa hình** (cùng kiểu với
`PostRef`) để một bảng `Image` phục vụ mọi chủ sở hữu:

```
Image {
  id, url,
  alt?,          // alt text (a11y + SEO)
  caption?,      // chú thích hiển thị
  credit?,       // nguồn/tác giả ảnh
  order: number, // thứ tự trong gallery (0 = đầu)
  isCover: boolean,  // ảnh bìa (đúng 1 ảnh/owner nên là cover)
  ownerType: 'place'|'activity'|'spot'|'specialty'|'eatery'|'accommodation'|'transport'|'post',
  ownerId
}
```
- Ảnh bìa = `isCover = true` (hoặc fallback ảnh `order` nhỏ nhất nếu không đặt cover).
- Nhược điểm đa hình giống `PostRef`: không có FK DB tới owner → kiểm ở tầng app. Nếu sau
  này cần FK chặt, đổi sang quan hệ ảnh riêng từng bảng. Hiện ưu tiên gọn → dùng đa hình.

### URL (App Router, SEO bằng slug)

Nguyên tắc: **URL ngắn & phẳng**, không lồng cả chuỗi tỉnh→điểm đến→loại vào path. Phân
cấp thể hiện qua **breadcrumb + nội dung trang**, không qua URL.

**Trang Place** (tỉnh & điểm đến lớn chung một tiền tố `/diem-den/`, phân biệt bằng `kind`):
```
/diem-den/[placeSlug]                trang Place (tỉnh hoặc điểm đến lớn)
/diem-den/[placeSlug]/[loai]         danh sách Listing thuộc Place đó
   vd: /diem-den/ha-long  ·  /diem-den/ha-long/quan-an
```
`[loai]` = **loại Listing** (đừng nhầm với field `category` của model): `hoat-dong` |
`dia-diem` | `dac-san` | `quan-an` | `luu-tru` (Activity | Spot | Specialty | Eatery |
Accommodation). Cùng token này dùng làm tiền tố trang chi tiết. **`Transport` KHÔNG có
trong `[loai]`** — nó hiển thị inline trên trang Place (`/diem-den/[placeSlug]`).

**Trang chi tiết Listing** — PHẲNG, tiền tố theo loại, **slug duy nhất trong từng loại**
(5 loại; `Transport` không có trang chi tiết):
```
/hoat-dong/[slug]      (Activity)        /quan-an/[slug]    (Eatery)
/dia-diem/[slug]       (Spot)            /luu-tru/[slug]    (Accommodation)
/dac-san/[slug]        (Specialty)
   vd: /quan-an/cha-muc-ha-long  ·  /dia-diem/bai-chay
```
- Trang chi tiết **không phụ thuộc Place trong URL** → URL ổn định kể cả khi Listing đổi
  nơi gắn (`placeId`); canonical sạch, không trùng lặp.
- `/blog/[postSlug]` cho bài viết.

**Quy ước slug:** slug duy nhất **trong phạm vi một loại** (namespace theo tiền tố). Khi
trùng tên, **gắn địa danh** để phân biệt (vd hai "Quán Cô Ba" → `quan-co-ba-ha-long`,
`quan-co-ba-da-nang`). `placeSlug` duy nhất giữa mọi `Place`.

> **Tiền tố là từ khoá dành riêng:** `diem-den`, `hoat-dong`, `dia-diem`, `dac-san`,
> `quan-an`, `luu-tru`, `di-chuyen`, `blog`, `login`, `api` — không được trùng với slug.

**Mẫu hiển thị Listing — mọi Listing đều CÓ trang chi tiết:**
- **Trang danh sách** (`/diem-den/[placeSlug]/[loai]`): render **card preview** (ảnh bìa
  + tên + mô tả ngắn + vài fact: giá/category/tag), mỗi card link tới trang chi tiết.
- **Trang chi tiết** (`/[loại]/[slug]`): dùng **MỘT template generic** (`ListingDetail`) nhận
  một Listing bất kỳ và render theo `type` — phần chung (gallery `Image`, mô tả, vị trí/bản
  đồ, tag, **breadcrumb về Place cha**) + phần riêng theo loại (vd `Eatery` → giờ mở cửa/giá
  + `Specialty` liên kết; `Activity` → `Spot` liên kết + đơn vị/đặt chỗ; `Transport` →
  mode/fromName/duration…). **Không** viết 6 trang riêng — một route động + nhánh theo type.
- `Transport` **không** theo mẫu card→detail: render thành **section/accordion** ngay trên
  trang Place (`/diem-den/[placeSlug]`), nhóm theo `direction` (đến nơi / tại chỗ).
- Trang chi tiết là **đích liên kết** cho `PostRef` (blog) và các quan hệ M:N giữa Listing.

## Blog (`Post`) — nội dung biên tập

Bài viết cẩm nang / kinh nghiệm / top-list. **Chỉ admin/editor soạn** (chưa mở UGC).

```
Post {
  id, slug, title,
  excerpt?,                       // tóm tắt ngắn (cho card & SEO)
  content,                        // thân bài: Markdown/MDX
  authorId,                       // → User (người viết)
  category?,                      // phân loại bài: cam-nang | am-thuc | luu-tru | trai-nghiem...
  tags[],                         // DÙNG CHUNG cơ chế tag với Listing
  ...AdminFields                  // status, publishedAt, isFeatured, order, popularity, timestamps
}
// Ảnh (gồm ảnh bìa) qua entity Image, ownerType='post' — xem "Ảnh / media".
```

- **Tác giả & phân quyền:** `authorId` → `User`. Chỉ `User.role` ∈ {`admin`, `editor`} mới
  tạo/sửa/xuất bản bài. ⇒ cần **persist User + role** trong DB (xem *Phụ thuộc* bên dưới).
- **Liên kết M:N tới Place/Listing:** một bài có thể gắn nhiều `Place` **và** nhiều
  `Listing` (vd "Top 10 quán ăn Hạ Long" → gắn các `Eatery`). Vì `Listing` trải trên 6
  bảng, dùng **một bảng nối đa hình** thay vì 6–7 bảng nối riêng:

```
PostRef {
  postId,
  targetType: 'place'|'activity'|'spot'|'specialty'|'eatery'|'accommodation',
  targetId   // không gồm 'transport' (không có trang để dẫn tới)
}
```
  - Ưu: 1 bảng; thêm loại mới không phải đổi schema; truy vấn "bài liên quan tới X" dễ.
  - Nhược: **không** có khóa ngoại DB tới target → toàn vẹn dữ liệu phải kiểm ở tầng ứng dụng.
  - Nếu sau này cần type-safe tuyệt đối, tách thành bảng nối riêng từng loại (`PostPlace`,
    `PostEatery`…). Hiện ưu tiên gọn → dùng đa hình.

- **URL:** `/blog` (danh sách) · `/blog/[postSlug]` (chi tiết). Có thể lọc theo `category`/`tags`.

> **Phụ thuộc quan trọng:** Blog (bài có tác giả, lưu lâu dài, phân quyền) là tính năng
> đầu tiên **bắt buộc có database + persist User**. Auth Google hiện tại chưa lưu user vào
> DB. Khi dựng blog sẽ cần thêm **Auth.js Prisma adapter** + trường **`User.role`**. Đây là
> mốc dự án chính thức cần DB — thiết lập cùng bước dựng Prisma schema.

## Tech stack

- **Next.js 16** (App Router, React Server Components) + **React 19**
- **TypeScript** (strict), alias import `@/*` → `src/*`
- **Tailwind CSS v4**
- **shadcn/ui** (style `base-nova`, base color `neutral`) — component dán vào
  `src/components/ui/`, dựng trên **Base UI** (`@base-ui/react`); icon dùng **lucide-react**
- **Auth.js (NextAuth v5)** — đăng nhập Google OAuth
- **pnpm** là package manager **bắt buộc** (môi trường KHÔNG có npm/npx)

## Lệnh thường dùng

```bash
pnpm dev              # chạy dev server tại http://localhost:3000
pnpm build            # build production
pnpm start            # chạy bản đã build
pnpm lint             # ESLint
pnpm exec tsc --noEmit  # kiểm tra type, không xuất file
pnpm add <pkg>        # thêm dependency (KHÔNG dùng npm install)
pnpm dlx shadcn@latest add <component>   # thêm component shadcn (vd: input, dialog, dropdown-menu)
```

Lưu ý pnpm: project dùng `pnpm-workspace.yaml` với `allowBuilds` để cho phép build
`sharp`, `unrs-resolver`. Khi thêm package có native build mới, có thể cần khai báo ở đó.

## Cấu trúc thư mục

```
src/
├── app/                         # App Router: routes, layouts, pages
│   ├── login/page.tsx           # trang đăng nhập (Google) — dùng Card + Button
│   ├── api/auth/[...nextauth]/  # route handlers của Auth.js
│   ├── layout.tsx               # root layout
│   ├── globals.css              # Tailwind v4 + biến CSS theme của shadcn
│   └── page.tsx                 # trang chủ (đang được bảo vệ) — Card + Avatar + Button
├── components/ui/               # component shadcn (button, card, avatar, ...)
├── lib/utils.ts                 # helper cn() (clsx + tailwind-merge)
├── auth.ts                      # cấu hình NextAuth (providers, callbacks)
└── proxy.ts                     # bảo vệ route + redirect (xem lưu ý bên dưới)

components.json                  # cấu hình shadcn (style, alias, base color)
```

## Quy ước & lưu ý quan trọng

- **`proxy.ts` chứ không phải `middleware.ts`.** Next.js 16 đã đổi tên quy ước
  `middleware` → `proxy`. File phải đặt ở `src/proxy.ts`, export default. Đừng tạo lại
  `middleware.ts`.
- **Server Components mặc định.** Chỉ thêm `"use client"` khi thật sự cần (state,
  event handler, hook trình duyệt). Truy vấn dữ liệu nên làm ở Server Component.
- **Đăng nhập/đăng xuất** dùng **server action** gọi `signIn`/`signOut` từ `@/auth`,
  không gọi API client trực tiếp. Auth.js v5 tự đọc biến `AUTH_GOOGLE_ID/SECRET`.
- **Biến môi trường** đặt trong `.env.local` (đã gitignore). Không commit secret.
  Có `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
- **Slug tiếng Việt không dấu, nối bằng `-`** (vd: `ha-giang`, `pho-co-hoi-an`) cho URL
  và tra cứu. Tách riêng `name` (có dấu, để hiển thị) với `slug`. Slug listing **duy nhất
  trong từng loại** (gắn địa danh khi trùng); tránh đụng các **tiền tố dành riêng** (xem
  mục "URL"). URL chi tiết phẳng `/[loại]/[slug]`, không lồng tỉnh/điểm đến.
- **Hình ảnh** dùng `next/image`. Domain ảnh ngoài cần khai báo trong `next.config.ts`.
- **Thiết kế/UI:** trước khi dựng hay chỉnh bất kỳ giao diện nào, theo **skill `design`**
  (`.claude/skills/design/SKILL.md`) — hệ thống thiết kế tối giản/biên tập, ảnh làm chủ.
- **UI dùng shadcn/ui.** Ưu tiên thêm component qua `pnpm dlx shadcn@latest add <tên>`
  thay vì tự viết từ đầu; component nằm ở `src/components/ui/` và **được phép sửa trực tiếp**
  (đây là code của dự án, không phải package). Style hiện tại là `base-nova` (dựng trên Base
  UI): primitive nhận prop `render` để đổi thẻ gốc (không phải `asChild`). Gộp class bằng
  `cn()` từ `@/lib/utils`. Icon lấy từ `lucide-react`. Màu/spacing dùng biến theme trong
  `globals.css` (vd `bg-primary`, `text-muted-foreground`) thay vì màu cứng.
- Trước khi báo "đã xong", chạy `pnpm exec tsc --noEmit` và `pnpm lint` để chắc không lỗi.

## Phạm vi hiện tại

Đã có: scaffold dự án + đăng nhập Google + shadcn/ui (button, card, avatar; trang login &
trang chủ đã dùng). **Chưa có**: database, entity `Place` + các
`Listing`, blog (`Post`), persist `User` + `role`, trang danh sách/chi tiết. Hướng phát
triển tiếp theo — khi xây dựng, bám sát mô hình & thuật ngữ ở "Mô hình dữ liệu cốt lõi"
và mục "Blog". Bước nền tảng kế tiếp: **dựng database (Prisma) + Auth.js adapter** vì blog
yêu cầu lưu user/tác giả.
