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

### Spot vs Activity — mô hình khái niệm (ĐỌC KỸ trước khi làm phần này)

> Phần này dễ hiểu sai. `Spot` và `Activity` KHÔNG đối xứng, và `Activity` KHÔNG phải
> "một việc cho một chỗ".

- **`Spot` = một CHỖ** (chấm được lên bản đồ): Núi Bài Thơ, Đảo Ti Tốp, Hang Sửng Sốt,
  Chùa Cầu… Mọi địa điểm thực địa đều là `Spot`, **kể cả khi điểm hấp dẫn của nó là một
  việc** (leo Bài Thơ để ngắm cảnh vẫn là `Spot` "Núi Bài Thơ").
- **`Activity` = một LOẠI TRẢI NGHIỆM dùng lại**, phạm vi trong một điểm đến, **liên kết
  M:N tới nhiều `Spot`**. Đặt tên ở mức trải nghiệm cho hấp dẫn ("Tắm biển", "Leo núi ngắm
  toàn cảnh vịnh", "Tham quan hang động", "Chèo kayak"), **KHÔNG nhúng tên spot** vào
  (❌ "Leo núi Bài Thơ", ❌ "Tắm biển Ti Tốp").
  - *Đúng:* `Activity` **"Tắm biển"** ←M:N→ [Ti Tốp, Bãi Cháy, Tuần Châu]; `Activity`
    **"Leo núi ngắm toàn cảnh"** ←M:N→ [Núi Bài Thơ, đỉnh Ti Tốp].
  - Ti Tốp là **1 `Spot`** được **2 `Activity`** trỏ tới → khỏi tạo trang trùng.

**Khi nào tạo `Activity` thành entity riêng** — chỉ khi thỏa ≥1 điều:
1. Trải **nhiều spot** (du thuyền, chèo kayak khắp vịnh).
2. Có **đơn vị / đặt chỗ / giá** (du thuyền ngủ đêm, thủy phi cơ, lớp học nấu ăn).
3. Là **nhu cầu tìm kiếm độc lập / toàn vùng** ("săn mây Sa Pa", "chèo kayak Hạ Long").

Nếu chỉ là "việc tự nhiên ở đúng một chỗ, không đơn vị, không đặt chỗ" → **để nguyên là
`Spot`**, đừng tạo `Activity` (tránh trang mỏng & trùng lặp).

- **Discoverability:** lọc/tìm "tắm biển" → trúng `Activity` → liệt kê các `Spot` liên kết
  (gồm Ti Tốp); trang `Spot` hiển thị "Hoạt động ở đây". Lọc theo nhóm dùng
  `Activity.category`. ⇒ quan hệ **M:N `Activity`↔`Spot` là xương sống** của phần này.
- **Quản lý 1 chiều:** biên tập sửa liên kết **từ phía `Activity`** (chọn các spot diễn ra);
  trang `Spot` chỉ hiển thị ngược (read-only).
- **Tỉ trọng đổi theo điểm đến:** Hạ Long *activity-led* (spot là điểm dừng trong tour),
  Hội An *spot-led* (việc là phụ trợ). UI trang Place phải **co giãn** — ẩn/thu nhỏ bên ít
  dữ liệu, không ép luôn hai lưới cân nhau.

**Trường "thực tế" (đã có trong schema):**
- `Activity`: `durationText` ("nửa ngày", "2N1Đ"),
  `seasonText` ("tháng 9–11", "săn mây mùa thu") — trả lời "bao lâu / mùa nào".
  (đơn vị/đặt chỗ: `operatorName`, `bookingUrl`, `phone`, `website`, `priceRange` đã có)
- `Spot`: `bestTime` (mùa/giờ đẹp), `ticketInfo` (vé cụ thể, vd "120k/người"),
  `notice` (cảnh báo truy cập: "Tạm đóng"/"Cần xin phép" — **khác** `status` draft/published).
  PlaceableFields (`address`, `lat`, `lng`, `openingHours`, `phone`, `website`…) đã có.

### Đặc sản vs Quán ăn — mô hình khái niệm (song song Spot/Activity)

- **`Eatery` = một CHỖ ăn** (giống `Spot`): địa chỉ/toạ độ, giờ, giá, category (Ẩm thực).
- **`Specialty` = một MÓN/sản vật đặc trưng DÙNG LẠI** (giống `Activity`): liên kết M:N tới
  nhiều `Eatery` bán nó. Tên ở mức món ("Chả mực Hạ Long"), gắn địa danh khi trùng; **KHÔNG**
  tạo "Chả mực quán X". Món signature chỉ-một-quán, không phổ biến → để trong mô tả `Eatery`.

- **Ăn vs Quà** — `Specialty.kind`:
  - `dish` (món ăn) → liên kết `Eatery` ("ăn ở đâu").
  - `product` (sản vật/quà) → field `whereToBuy` (mua ở chợ/cửa hàng), KHÔNG ép link quán.
- **Bữa ăn** — `Eatery.meals[]` (sáng/trưa/tối/cà phê/ăn vặt): **trục lọc chính** vì khách
  xếp lịch ăn theo bữa. Khác `category` (kiểu món) — hai trục vuông góc. KHÔNG suy từ
  `openingHours`; biên tập gắn trực tiếp.
- **Liên kết M:N có chọn lọc:** mỗi món chỉ gắn **2–4 quán tiêu biểu** (đề xuất), không map
  hết. Quản lý **một chiều từ `Specialty`**; trang `Eatery` hiển thị ngược (read-only).
- **Trường thực tế (đã có schema):** `Specialty`: `kind`, `whereToBuy`, `priceRange`.
  `Eatery`: `meals[]`, `notice` ("nghỉ thứ 2"/"hết sớm"). PlaceableFields của Eatery đã có.

### Nơi lưu trú (`Accommodation`) — mục tiêu & định vị (ĐỌC KỸ trước khi làm phần này)

> **Định vị cốt lõi:** `Accommodation` là **danh bạ chỗ ở ĐÃ XÁC MINH CHÍNH CHỦ** cho từng
> điểm đến, **KHÔNG phải nền tảng đặt phòng (OTA)**. Giá trị độc nhất so với các group du
> lịch Facebook là **niềm tin có cấu trúc** — đúng kênh liên hệ, đúng người, tránh page nhái
> & lừa cọc. OTA (Booking/Agoda/Airbnb) đã lo phần đặt phòng cho khách sạn/resort lớn;
> khoảng trống thật nằm ở **homestay nhỏ + vấn nạn nhái/lừa cọc**.

**Mục tiêu (1 câu):** giúp khách *tìm đúng, liên hệ đúng, tránh bị lừa cọc* — phân loại theo
loại hình & ngân sách, đủ thông tin vị trí/giá/liên hệ **đã kiểm chứng** để tự chốt với chủ.

**Phạm vi — chốt rõ:**
- ✅ TRONG: thông tin cơ sở (loại hình, giá tương đối, vị trí/bản đồ); **kênh liên hệ chính
  chủ đã xác minh** (Zalo, Facebook, phone); huy hiệu **"Đã xác minh chính chủ"**; **cảnh báo
  chống lừa cọc**; URL ổn định `/luu-tru/[slug]` để dán vào group FB.
- ❌ NGOÀI (chưa làm): lịch phòng/kiểm tra phòng trống, thanh toán/giữ cọc qua web, booking
  engine, review của người dùng (UGC).

**Trường thực tế (đã có schema):**
- **Lọc:** `category` (`hotel`|`homestay`|`resort`|`hostel`|`guesthouse`|`villa`), `priceRange`
  (trục ngân sách), `tags[]`.
- **Kênh liên hệ thật:** `zalo` (kênh chốt phòng chính ở VN), `facebookUrl` (đối chiếu tránh
  page nhái), cùng `phone`/`website`/`bookingUrl` của PlaceableFields.
- **Xác minh:** `isVerified` + `verifiedAt` (hiện huy hiệu khi `true`); `verifiedNote` chỉ nội
  bộ, **không** hiện public.
- **Chống lừa cọc:** `depositPolicy` (chính sách cọc bằng lời), `notice` ("Chỉ chuyển khoản
  tới tài khoản chính chủ cung cấp qua kênh hiển thị tại đây").

> **KHÔNG lưu số tài khoản (STK) ở giai đoạn này.** STK dễ đổi → dữ liệu cũ thành sai = vô
> tình tiếp tay lừa đảo; gánh nặng trách nhiệm tài chính + riêng tư quá lớn cho một site
> thông tin. Thay vào đó: huy hiệu xác minh + một bộ kênh liên hệ đã kiểm chứng + `notice`
> cảnh báo → chặn phần lớn kịch bản lừa cọc mà không ôm rủi ro dữ liệu tài chính.

**Hiển thị (drawer + trang chi tiết cùng tồn tại):**
- **Card lưới** `/diem-den/[placeSlug]/luu-tru` (ảnh + tên + loại hình + giá + huy hiệu xác
  minh) → bấm mở **drawer xem nhanh** (tại chỗ, không rời trang).
- **Drawer** = xem nhanh; có nút **"Xem trang đầy đủ →"** dẫn tới trang chi tiết.
- **Trang chi tiết** `/luu-tru/[slug]` = **canonical, ĐÍCH ĐỂ CHIA SẺ** (chủ homestay gửi/in
  link cho khách): hero gallery, breadcrumb về Place cha, khối liên hệ chính chủ + huy hiệu
  xác minh nổi bật, bản đồ + chỉ đường, chính sách cọc, cảnh báo an toàn, **nút chia sẻ kèm
  mã QR** (`StayShare`). Là đích của `PostRef` (blog) → "Bài viết liên quan".

> **Lưu trú là ngoại lệ trong nhóm "drawer-only":** khác Đặc sản/Quán ăn (chỉ drawer, không
> trang chi tiết), Lưu trú CÓ trang chi tiết riêng vì cần **link ổn định để chia sẻ/chống
> nhái** — đúng định vị "danh bạ xác minh".

### Bảng thuật ngữ (dùng nhất quán trong code & URL)

| Tên tiếng Việt | Tên code (EN) | Vai trò / quan hệ |
|---|---|---|
| Tỉnh / Điểm đến lớn | `Place` | node phân cấp; `kind` ∈ {province, destination}, `parentId` tự tham chiếu |
| Hoạt động/trải nghiệm | `Activity` | `placeId` bắt buộc; M:N với `Spot`; có trường đơn vị/đặt chỗ inline |
| Địa điểm nhỏ | `Spot` | `placeId` bắt buộc; M:N với `Activity` |
| Đặc sản | `Specialty` | `placeId` bắt buộc; M:N với `Eatery` |
| Quán ăn | `Eatery` | `placeId` bắt buộc; M:N với `Specialty` |
| Nơi lưu trú | `Accommodation` | `placeId` bắt buộc; **danh bạ chỗ ở đã xác minh chính chủ** (không phải OTA); có kênh liên hệ thật + huy hiệu xác minh + chống lừa cọc |
| Di chuyển | `Transport` | `placeId` bắt buộc; `direction` `getTo`/`getAround`; **màn hình riêng `/diem-den/[slug]/di-chuyen`; không có trang chi tiết per-item, không slug, không ảnh** |

Mỗi entity nên có tối thiểu: `id`, `slug`, `name`, `description`, và khóa ngoại tới cha
(`parentId` với `Place`; `placeId` với các `Listing`). Ảnh tách riêng thành entity
`Image` (xem "Ảnh / media"); trường trạng thái/sắp xếp xem "Trường quản trị".

### `Transport` — chi tiết

> **Khác các Listing còn lại:** `Transport` là nội dung **hướng dẫn**, có **màn hình riêng**
> `/diem-den/[placeSlug]/di-chuyen` (token `di-chuyen` trong route `[loai]`, không tạo file
> route mới) — **KHÔNG có trang chi tiết per-item, không slug**. Không theo mẫu card→detail:
> render dạng 2 cột "Cách đến nơi" (nhóm theo `mode`) / "Đi lại tại chỗ", icon theo phương
> tiện (KHÔNG dùng ảnh). Vẫn là một entity (bảng) gắn `placeId`, chỉ khác ở cách trình bày.

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
// Không cần slug. KHÔNG dùng ảnh — hiển thị bằng icon theo `mode`.
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
alt, thứ tự. Một entity nội dung có nhiều `Image`.

**Triển khai trong Prisma — exclusive arc (FK thật, không đa hình).** Vì đã có Postgres +
Prisma, dùng **nhiều khóa ngoại nullable** trên `Image` (`placeId?`, `activityId?`,
`spotId?`, … `postId?`), **đúng MỘT** trong số đó được set cho mỗi ảnh. Lợi hơn đa hình:
có quan hệ thật (`place.images`), `onDelete: Cascade`, `include` type-safe.

```
Image {
  id, url, alt?, caption?, credit?,
  order: number,     // thứ tự gallery (0 = đầu)
  isCover: boolean,  // ảnh bìa (đúng 1 ảnh/owner)
  // exclusive arc — đúng 1 FK được set:
  placeId? activityId? spotId? specialtyId? eateryId? accommodationId? transportId? postId?
}
```
- Ảnh bìa = `isCover = true` (fallback ảnh `order` nhỏ nhất nếu không đặt cover).
- Ràng buộc "đúng 1 FK" kiểm ở tầng app (Postgres không ép kiểu này gọn). `PostRef` dùng
  cùng kiểu exclusive arc.

### URL (App Router, SEO bằng slug)

Nguyên tắc: **URL ngắn & phẳng**, không lồng cả chuỗi tỉnh→điểm đến→loại vào path. Phân
cấp thể hiện qua **breadcrumb + nội dung trang**, không qua URL.

**Trang Place** (tỉnh & điểm đến lớn chung một tiền tố `/diem-den/`, phân biệt bằng `kind`):
```
/diem-den/[placeSlug]                trang Place (tỉnh hoặc điểm đến lớn)
/diem-den/[placeSlug]/[loai]         danh sách Listing thuộc Place đó
   vd: /diem-den/ha-long  ·  /diem-den/ha-long/quan-an
```
`[loai]` = **loại màn hình của Place** (đừng nhầm với field `category`): `hoat-dong`
(Activity) | `dia-diem` (Spot) | `am-thuc` (gộp Đặc sản + Quán ăn, chi tiết qua drawer) |
`luu-tru` (Accommodation, lưới + drawer xem nhanh **và** trang chi tiết) | `di-chuyen`
(Transport, 2 cột inline). Với `hoat-dong`/`dia-diem`/`luu-tru`, token này còn là **tiền tố
trang chi tiết riêng** (`/luu-tru/[slug]` là đích chia sẻ cho lưu trú); còn `am-thuc`/
`di-chuyen` **không có trang chi tiết per-item** (xem mục mẫu hiển thị bên dưới).

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
  content,                        // thân bài: HTML (rich text TipTap, lưu chuỗi HTML)
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
  `Listing` (vd "Top 10 quán ăn Hạ Long" → gắn các `Eatery`). Dùng bảng nối `PostRef` theo
  kiểu **exclusive arc** (FK thật, giống `Image`):

```
PostRef {
  id, postId, order,
  // exclusive arc — đúng 1 FK target được set (KHÔNG gồm transport: không có trang):
  placeId? activityId? spotId? specialtyId? eateryId? accommodationId?
}
```
  - FK thật tới từng loại → `onDelete: Cascade`, `include` type-safe, không cần kiểm tồn tại thủ công.
  - Ràng buộc "đúng 1 target" kiểm ở tầng app.

- **URL:** `/blog` (danh sách) · `/blog/[postSlug]` (chi tiết). Có thể lọc theo `category`/`tags`.

> **Phụ thuộc quan trọng:** Blog (bài có tác giả, lưu lâu dài, phân quyền) là tính năng
> đầu tiên **bắt buộc có database + persist User**. Auth Google hiện tại chưa lưu user vào
> DB. Khi dựng blog sẽ cần thêm **Auth.js Prisma adapter** + trường **`User.role`**. Đây là
> mốc dự án chính thức cần DB — thiết lập cùng bước dựng Prisma schema.

## Tech stack

- **Next.js 16** (App Router, React Server Components) + **React 19**
- **TypeScript** (strict), alias import `@/*` → `src/*`
- **Tailwind CSS v4**
- **shadcn/ui** (style `new-york`, base color `neutral`) — component dán vào
  `src/components/ui/`, dựng trên **Radix UI** (package hợp nhất `radix-ui`); icon dùng **lucide-react**
- **Prisma 7 + PostgreSQL** — ORM; client mới sinh ra `src/generated/prisma` (đã gitignore),
  kết nối qua driver adapter `@prisma/adapter-pg`. `DATABASE_URL` trong `.env`.
- **Auth.js (NextAuth v5)** — đăng nhập Google OAuth (adapter Prisma sẽ gắn khi có DB chạy)
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

# Prisma
pnpm exec prisma generate      # sinh lại client (sau khi đổi schema)
pnpm exec prisma migrate dev    # tạo & áp migration (cần DATABASE_URL trỏ tới Postgres chạy)
pnpm exec prisma studio         # GUI xem/sửa dữ liệu
pnpm exec prisma dev            # chạy Postgres local (Prisma Postgres) cho dev
pnpm set-role <email> [role]    # đặt vai trò user (user|editor|admin; mặc định admin)
```

Lưu ý pnpm: project dùng `pnpm-workspace.yaml` với `allowBuilds` để cho phép build
`sharp`, `unrs-resolver`, `prisma`, `@prisma/engines`. Khi thêm package có native build
mới, có thể cần khai báo ở đó.

## Cấu trúc thư mục

```
src/
├── app/                         # App Router: routes, layouts, pages
│   ├── login/page.tsx           # trang đăng nhập (Google) — dùng Card + Button
│   ├── cms/                      # CMS (admin/editor): layout sidebar + dashboard + trang con
│   │   ├── layout.tsx            #   shell: topbar + sidebar (guard staff lớp 2)
│   │   ├── page.tsx              #   dashboard (stat cards từ DB)
│   │   └── <mục>/page.tsx        #   places, activities, ..., users, settings (đa số placeholder)
│   ├── api/auth/[...nextauth]/  # route handlers của Auth.js
│   ├── layout.tsx               # root layout
│   ├── globals.css              # Tailwind v4 + biến CSS theme của shadcn
│   └── page.tsx                 # trang chủ (đang được bảo vệ) — Card + Avatar + Button
├── components/ui/               # component shadcn (button, card, avatar, dropdown, sheet, sidebar, ...)
├── components/site/             # chrome public: site-header, user-menu, mobile-nav
├── components/cms/              # chrome CMS: AppSidebar (dùng shadcn `sidebar`), placeholder
├── hooks/use-mobile.ts          # hook responsive (shadcn sidebar dùng)
├── lib/utils.ts                 # helper cn() (clsx + tailwind-merge)
├── lib/prisma.ts                # Prisma client singleton (import từ đây, KHÔNG new PrismaClient)
├── generated/prisma/            # Prisma client đã sinh (gitignore — chạy `prisma generate`)
├── types/next-auth.d.ts         # augment Session/JWT thêm id + role
├── auth.config.ts               # cấu hình NextAuth EDGE-SAFE (providers, callbacks) — KHÔNG adapter
├── auth.ts                      # NextAuth đầy đủ: authConfig + Prisma adapter (Node)
└── proxy.ts                     # bảo vệ route + gate /cms (dùng authConfig, edge-safe)

scripts/set-role.ts              # CLI đặt role cho user (pnpm set-role)
prisma/schema.prisma             # schema CSDL (nguồn chân lý của mô hình dữ liệu)
prisma.config.ts                 # cấu hình Prisma (đọc DATABASE_URL từ .env)
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
- **Auth split config (BẮT BUỘC giữ):** `auth.config.ts` edge-safe (providers + callbacks,
  KHÔNG import Prisma) dùng cho `proxy.ts`; `auth.ts` thêm `PrismaAdapter(prisma)` +
  `session: { strategy: "jwt" }` dùng ở server component/route handler. Đừng import
  `@/auth` (có adapter) vào `proxy.ts` — sẽ vỡ edge runtime.
- **Vai trò & phân quyền:** `User.role` ∈ {`user`, `editor`, `admin`}. Role nhét vào JWT
  khi đăng nhập (callback `jwt`) → đọc qua `session.user.role`. **CMS `/cms`** chỉ cho
  `admin`/`editor` (chặn ở `proxy.ts` + kiểm lại trong page). Đặt admin: user đăng nhập 1
  lần (tạo bản ghi `User`) → `pnpm set-role <email> admin` → đăng xuất/đăng nhập lại để
  JWT cập nhật role mới.
- **Biến môi trường:** secret auth ở `.env.local` (`AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`);
  `DATABASE_URL` ở `.env` (Prisma đọc qua `prisma.config.ts`). Cả hai đã gitignore — không commit.
- **Database/Prisma:** luôn import `prisma` từ `@/lib/prisma` (singleton), không `new
  PrismaClient()` rải rác. Sau khi sửa `schema.prisma` → chạy `prisma generate` (và
  `migrate dev` khi có DB). Schema là **nguồn chân lý**; mô hình trong tài liệu này phải khớp nó.
- **Slug tiếng Việt không dấu, nối bằng `-`** (vd: `ha-giang`, `pho-co-hoi-an`) cho URL
  và tra cứu. Tách riêng `name` (có dấu, để hiển thị) với `slug`. Slug listing **duy nhất
  trong từng loại** (gắn địa danh khi trùng); tránh đụng các **tiền tố dành riêng** (xem
  mục "URL"). URL chi tiết phẳng `/[loại]/[slug]`, không lồng tỉnh/điểm đến.
- **Hình ảnh** dùng `next/image`. Domain ảnh ngoài cần khai báo trong `next.config.ts`.
- **Thiết kế/UI:** trước khi dựng hay chỉnh bất kỳ giao diện nào, theo **skill `design`**
  (`.claude/skills/design/SKILL.md`) — hệ thống thiết kế tối giản/biên tập, ảnh làm chủ.
- **UI dùng shadcn/ui.** Ưu tiên thêm component qua `pnpm dlx shadcn@latest add <tên>`
  thay vì tự viết từ đầu; component nằm ở `src/components/ui/` và **được phép sửa trực tiếp**
  (đây là code của dự án, không phải package). Style hiện tại là `new-york` (dựng trên
  **Radix UI**): đổi thẻ gốc bằng prop **`asChild`** (vd `<DropdownMenuTrigger asChild><button/>`,
  `<SidebarMenuButton asChild><Link/>`). Gộp class bằng `cn()` từ `@/lib/utils`. Icon lấy từ
  `lucide-react`. Màu/spacing dùng biến theme trong `globals.css` (vd `bg-primary`,
  `text-muted-foreground`) thay vì màu cứng.
- Trước khi báo "đã xong", chạy `pnpm exec tsc --noEmit` và `pnpm lint` để chắc không lỗi.

## Phạm vi hiện tại

Đã có: scaffold + đăng nhập Google + shadcn/ui + **Prisma đã migrate lên Postgres (Neon)**
+ **Auth.js Prisma adapter đã gắn** (login persist `User`/`Account`, role trong JWT) +
**CMS `/cms`** gate theo role + script `pnpm set-role`. **Chưa có**: seed dữ liệu mẫu;
các trang nội dung (Place/Listing/blog) công khai + CRUD trong CMS. Bước kế tiếp: seed vài
tỉnh/điểm đến + dựng trang danh sách Place, rồi CRUD trong `/cms`.
