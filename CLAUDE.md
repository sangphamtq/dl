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
- **`treatAsDestination`** (Boolean, chỉ có nghĩa với `province`): bật khi TỈNH
  TỰ NÓ là một điểm đến — người ta nói "đi Ninh Bình", "đi Huế", không phải "đi
  một nơi nào đó trong tỉnh. Khi bật, tỉnh được xếp **ngang hàng với
  `destination`** ở những chỗ liệt kê nơi để đi (hiện là dải thẻ `/diem-den`;
  thẻ ghi nhãn "Tỉnh" thay cho tên tỉnh cha, và số điểm đến con đứng đầu bảng
  dữ kiện).
  · **KHÔNG mượn `isFeatured` cho việc này** — đã thử và sai ngay trên dữ liệu
    thật. Hai cờ trả lời hai câu khác nhau: `isFeatured` = "có đề cử nơi này lên
    trước không", `treatAsDestination` = "nơi này có tự đứng thành một chuyến đi
    không". Quảng Ninh nổi bật vì nó CHỨA Hạ Long, chứ bản thân nó không phải
    nơi người ta đặt vé tới.
  · Bật/tắt ở **trang chi tiết CMS** (`/cms/places/[id]`, khối "Quản trị") —
    công tắc chỉ hiện với tỉnh.
  · Tỉnh bật cờ mà VẪN CÒN điểm đến con thì **cả tỉnh lẫn các con cùng nằm
    trong dải** (vd Sơn La đứng chung dải với Tà Xùa và Mộc Châu). Đã cân nhắc
    và CHỌN GIỮ NGUYÊN: tỉnh là một cách đi, từng điểm đến là một cách khác —
    ẩn con đi thì hai điểm đến thật mất chỗ đứng riêng. Đừng thêm luật ẩn/hiện
    nào cho việc này.
  · Cờ này KHÔNG quyết định thứ tự. Tỉnh bật cờ vẫn xếp theo đúng tiêu chí
    chung (`isFeatured` → lượt xem → ABC), nên một tỉnh không nổi bật sẽ nằm
    giữa dải và phải cuộn mới thấy — muốn nó lên đầu thì bật thêm
    **`isFeatured`**, đó mới là cờ "đề cử lên trước".
  · ⚠️ **Dữ liệu hiện còn một nhóm mô hình hoá sai chưa sửa**: 23/27 tỉnh có
    ĐÚNG một điểm đến con, trong đó nhiều cặp thuộc kiểu "tỉnh mới là điểm đến,
    con chỉ là một thắng cảnh" — Ninh Bình→Tràng An, Đà Nẵng→Bà Nà Hills, Hà
    Nội→Ba Vì, TP.HCM→Cần Giờ, Gia Lai→Biển Hồ. Cách đúng cho nhóm này: gắn
    listing thẳng vào tỉnh và hạ "điểm đến con" xuống thành `Spot`. Khác hẳn
    nhóm Lào Cai→Sa Pa, Khánh Hòa→Nha Trang, Quảng Nam→Hội An (tên khác nhau,
    người ta đi tới ĐIỂM ĐẾN) — nhóm đó đang đúng, đừng đụng vào.
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
              ├── Đặc sản                 (Specialty)     ⚠️ đang tắt (xem mục dưới)
              ├── Quán ăn & quán nước     (Eatery)        chỗ ăn / cà phê view (venueKind)
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

> ⚠️ **`Specialty` (Đặc sản / món ăn) ĐANG TẮT — đọc trước khi động vào phần này.**
> Toàn bộ hiển thị công khai của phần món ăn **đã gỡ** (trang Place, màn hình Ẩm thực,
> khối cross-link trong drawer Quán ăn), và mục **`/cms/specialties` đã tạm khoá** bằng
> cờ `DISABLED` trong `src/app/cms/specialties/layout.tsx` + ẩn khỏi sidebar CMS.
> **Bảng `Specialty`, quan hệ M:N với `Eatery`, dữ liệu seed và ảnh vẫn còn NGUYÊN** —
> không xoá gì, không migration nào. Phần dưới mô tả mô hình để khi bật lại còn biết
> đường; đừng dựng lại UI từ đầu, lấy trong lịch sử git (`food-menu.tsx` khối hàng menu,
> `specialty-detail.tsx`, `food-cross-link.tsx`, `food-layout.ts`).
>
> **Lý do tắt:** ở phần lớn điểm đến chỉ có vài món thật sự là đặc sản, phần còn lại là
> "món ngon của một quán" — thứ `Specialty` không mô tả đúng (xem phân tích trong lịch sử
> hội thoại). Chốt lại hướng đi trước khi bật lại.

- **`Eatery` = một CHỖ ăn** (giống `Spot`): địa chỉ/toạ độ, giờ, giá, category (Ẩm thực).
- **`Specialty` = một MÓN/sản vật đặc trưng DÙNG LẠI** (giống `Activity`): liên kết M:N tới
  nhiều `Eatery` bán nó. Tên ở mức món ("Chả mực Hạ Long"), gắn địa danh khi trùng; **KHÔNG**
  tạo "Chả mực quán X". Món signature chỉ-một-quán, không phổ biến → để trong mô tả `Eatery`.

- **KHÔNG làm phần "quà / sản vật mua về".** Dự án chỉ nói chuyện ĂN TẠI CHỖ — không có
  `Specialty.kind`, không có `whereToBuy`. Sản vật đóng gói nào vẫn đáng kể thì sống ở nơi
  khác: chè Shan tuyết = `Activity` "Thưởng trà" + `Eatery` "Nhà trà", không phải một
  `Specialty` riêng.
- **Bữa ăn** — `Eatery.meals[]` (sáng/trưa/tối/ăn đêm/cà phê/ăn vặt): **trục lọc chính của
  phần ĂN** vì khách xếp lịch ăn theo bữa. Khác `category` (kiểu món) — hai trục vuông góc.
  KHÔNG suy từ `openingHours`; biên tập gắn trực tiếp.
- **Liên kết M:N có chọn lọc:** mỗi món chỉ gắn **2–4 quán tiêu biểu** (đề xuất), không map
  hết. Quản lý **một chiều từ `Specialty`**; trang `Eatery` hiển thị ngược (read-only).
- **Khi nào tạo `Specialty`:** món gắn được địa danh/vùng **và** chỉ được ít nhất một quán,
  **hoặc** là món khách chủ động hỏi tên. Nguyên liệu/rau củ chung chung của cả vùng ("rau
  cải mèo", "măng rừng") **đừng tạo card riêng** — gộp thành một món ("Mâm cơm bản") hoặc
  để trong mô tả. Lưới 8 card mà 4 cái là rau thì mục "Món phải thử" loãng hết.
- **Trường thực tế (đã có schema):** `Eatery`: `meals[]`, `notice` ("nghỉ thứ 2"/"hết
  sớm"), + nhóm quán-view ngay dưới. **KHÔNG có `priceRange`** ở cả `Specialty` lẫn `Eatery`
  — cố tình bỏ: thang $/$$/$$$ tương đối không nói được gì hữu ích cho quán ăn, giá cụ thể
  thì thuộc về mô tả. (`priceRange` vẫn tồn tại ở `Spot`/`Accommodation`.)

#### Quán nước / cà phê view — `venueKind`, `viewType`, `bestTime`

Ở nhiều điểm đến (Tà Xùa, Mộc Châu, Đà Lạt ven…) khách tới quán **vì CẢNH, không vì món**.
Ba trường trên `Eatery` tách chuyện đó ra khỏi trục bữa ăn:

- **`venueKind`** `eat` | `drink` | `both` — trục **vuông góc** với `category` (kiểu món).
  Quyết định quán nằm mục nào ngoài trang Ẩm thực: `eat`/`both` → "Ăn ở đâu";
  `drink`/`both` → "Quán nước & cà phê". Mặc định `eat`.
- **`viewType`** (`sea` `valley` `cloud` `mountain` `lake` `river` `city` `oldtown` `rice`
  `garden`, null = không có view) — **trục lọc của mục quán nước**. Thay cho tag chữ tự do
  kiểu "view đẹp": tag không lọc chuẩn được, không sắp xếp được.
- **`bestTime`** — giờ/mùa cảnh đẹp nhất ("5:30–7:00 mùa mây"), **khác `openingHours`**.

> **Ranh giới `Spot` ↔ `Eatery` (dễ tạo trùng — đọc kỹ):** chỗ **có bán đồ ăn/uống và giá trị
> chính là ngồi lại** → `Eatery` (dù view đẹp). Điểm ngắm cảnh **công cộng, không bán gì, đến
> rồi đi** → `Spot(viewpoint)`. **Không tạo cả hai cho cùng một chỗ.** Quán nằm ngay tại một
> điểm ngắm nổi tiếng → điểm là `Spot`, quán là `Eatery` riêng, tên không được trùng.

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
- **Màn hình `/diem-den/[placeSlug]/luu-tru`** (`AccommodationSection`) lấy **trạng thái xác
  minh làm xương sống**, không phải một huy hiệu góc ảnh:

```
Nơi lưu trú · Chỗ ở đã xác minh chính chủ ở X
[12 chỗ ở] · [9 đã xác minh] · [12 có Zalo trực tiếp]   ← dữ kiện TÍNH TỪ DATA
┌ Dải an toàn: "Đây là danh bạ thông tin, không phải nơi đặt phòng" + quy tắc chuyển khoản ┐
Lọc theo loại hình
── Đã xác minh chính chủ (9) ── + câu giải thích xác minh NGHĨA LÀ GÌ
   lưới thẻ 1/2/3 cột
── Chưa xác minh (3) ── + câu cảnh báo tự kiểm tra trước khi cọc
   cùng khuôn thẻ, ảnh giảm bão hoà + huy hiệu xám
```

- **TÁCH HAI NHÓM theo `isVerified`**, mỗi nhóm có một câu nói rõ trạng thái đó nghĩa là gì.
  Trộn chung rồi phân biệt bằng badge thì người lướt không thấy sự khác nhau — mà sự khác
  nhau đó **chính là sản phẩm** (thứ group Facebook không làm được). Vì đã tách nhóm nên
  **bỏ nút lọc "chỉ chỗ đã xác minh"** — thành thừa.
- **MỘT khuôn thẻ duy nhất.** Bản cũ có thêm thẻ "Đề xuất" lớn cho phần tử đầu: nó chỉ to hơn
  chứ không mang thêm thông tin, và vì `lead = filtered[0]` nên "đề xuất" **đổi theo bộ lọc**
  — một nhãn hứa hẹn sự tuyển chọn biên tập vốn không tồn tại.
- **Thẻ có HAI đích, tách bằng VỊ TRÍ** để khỏi giẫm nhau:
  - Bấm bất kỳ đâu trong thẻ → **trang chi tiết** `/luu-tru/[slug]`. Link thật gắn ở **tên
    quán** rồi `after:absolute after:inset-0` trải vùng bấm ra cả thẻ — trình đọc màn hình đọc
    đúng tên chứ không phải một "link" trống. (Đừng bọc cả thẻ trong `<a>` rồi nhét `<button>`
    vào trong: HTML không cho lồng như vậy.)
  - **"Xem nhanh" có HAI bản, tách bằng `@media (pointer: …)`** — không phải breakpoint bề
    ngang: thứ quyết định là **có chuột hay không**, không phải màn to hay nhỏ (máy tính bảng
    cảm ứng vẫn màn rộng).
    - **Máy có chuột** (`pointer:fine`): lúc nghỉ thẻ **sạch trơn, không nút nào**. Rê vào ảnh
      thì ảnh tối nhẹ + mờ nhẹ và nhãn "Xem nhanh" hiện **giữa khung** (chính lớp phủ đó là
      nút). Cũng hiện khi tab tới bằng bàn phím (`focus-visible`).
    - **Máy cảm ứng** (`pointer:coarse`): không có hover nên một **viên nhỏ luôn hiện** ở góc
      dưới phải ảnh.
    - Ẩn bằng **`display`** (`hidden` / `grid`) chứ KHÔNG bằng `opacity`, nhờ vậy bản bị ẩn
      cũng biến khỏi cây trợ năng — trình đọc màn hình chỉ gặp một nút, không phải hai.
    > **Đã thử và bỏ NĂM bản luôn-hiện** — đừng quay lại: viên chữ *trắng mờ góc trên phải*
    > (trùng hàng/cỡ/vật liệu với huy hiệu xác minh → thành cặp nhãn sinh đôi); *đĩa tròn
    > trắng đặc* (vệt trắng lửng lơ, đọc ra "nút mặc định của framework"); *viên kính tối*
    > (đọc rõ nhưng vẫn là miếng dán đè lên ảnh); *góc khoét vào khung ảnh*; *nút viền ở đáy
    > vùng nội dung*. Vấn đề chung: một nút **luôn hiện** trên thẻ ảnh-làm-chủ thì kiểu gì
    > cũng thành vật thừa. Hiện-khi-rê giải quyết tận gốc — lúc nghỉ nó không tồn tại.
  - Mũi tên "đi tiếp" nằm **cạnh TÊN** (hiện khi hover), nhờ vậy khỏi cần một hàng CTA riêng
    ở đáy thẻ.
- **Thẻ giữ TỐI THIỂU**: ảnh + huy hiệu xác minh · loại hình · khu vực · tên · mô tả. Đã lần
  lượt gỡ khỏi thẻ **hàng icon kênh liên hệ** (12/12 chỗ đều có Zalo → không phân biệt được
  thẻ nào với thẻ nào), **hàng tag** (mô tả đã nói cùng ý bằng câu văn đọc được) và **dòng
  chính sách cọc**. Cả ba vẫn còn nguyên ở **popup / trang chi tiết** — tức là đúng lúc khách
  đã chọn một chỗ cụ thể để cân nhắc, chứ không phải khi còn đang lướt so sánh cả chục thẻ.
- **Khu vực trên thẻ** = đuôi địa chỉ sau khi bỏ đoạn trùng tên điểm đến (`areaOf`). Lấy
  thẳng `address.split(",").pop()` như bản cũ thì 8/12 thẻ đều ghi "TP. Phan Thiết" — vô
  nghĩa vì cả trang đã là Phan Thiết; bỏ đi mới ra "Mũi Né".
- **`tags` KHÔNG lên thẻ, và cũng KHÔNG làm trục lọc.** Dữ liệu quá tạp để làm bộ lọc: 48 tag
  khác nhau cho 12 chỗ ở, đa số xuất hiện đúng một lần, nhiều tag trùng luôn tên loại hình
  ("homestay", "resort"), có cặp gần đồng nghĩa ("sát biển" / "gần biển"). Trên thẻ thì mô tả
  đã nói cùng ý bằng câu văn đọc được, nên hàng tag chỉ là chữ thừa. Tag vẫn hiện ở **popup /
  trang chi tiết**.
- ⚠️ `Accommodation` **KHÔNG có `priceRange`** trong schema (khác mô tả cũ ở mục Phạm vi trên)
  → hiện **không có trục ngân sách**. Cần lọc theo giá thì phải thêm trường trước.
- **Chi tiết mở bằng POPUP** (`Dialog`), **cùng khuôn với popup Quán ăn** — hai tab anh em
  phải nói cùng một ngôn ngữ overlay: từ `lg` là hai cột (trái ảnh phủ kín cột + carousel
  embla + dải ảnh nhỏ, phải là phần đọc cuộn riêng), dưới `sm` popup dán đáy màn hình và
  trượt lên; nút đóng tự dựng vì chữ X mặc định chìm trên ảnh.
- Khác Quán ăn ở **CHỖ NÀO ĐỨNG ĐẦU**: quán ăn hỏi "còn mở không, đường tới đâu"; chỗ ở hỏi
  **"tin được không, liên hệ ai, cọc thế nào"**. Nên cột phải xếp: **xác minh → cọc → cảnh
  báo** → mô tả → địa chỉ/bản đồ → tag → lối sang trang đầy đủ. Huy hiệu xác minh nằm **trên
  ảnh**, không phải một dòng chữ lẫn giữa cột.
- **Thanh ghim đáy là LIÊN HỆ, không phải chỉ đường**: nút chính **"Nhắn Zalo chính chủ"**
  (Zalo là kênh chốt phòng ở VN, và cả mục này tồn tại để dẫn khách tới đúng kênh chính chủ);
  gọi/Facebook/đặt phòng/website thu thành nút tròn để thanh luôn một hàng.
- Popup = xem nhanh; **"Xem trang đầy đủ →"** ở cuối phần đọc dẫn tới trang chi tiết.
- ⚠️ Component này **KHÔNG dùng màu cứng**. Bản cũ có `emerald-600`/`amber-500` — theme đã có
  `primary` (xanh lá) và `warm` (cam), dùng token thì dark mode mới đúng.
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
| Tỉnh / Điểm đến lớn | `Place` | node phân cấp; `kind` ∈ {province, destination}, `parentId` tự tham chiếu; `treatAsDestination` cho tỉnh tự nó là điểm đến |
| Hoạt động/trải nghiệm | `Activity` | `placeId` bắt buộc; M:N với `Spot`; có trường đơn vị/đặt chỗ inline |
| Địa điểm nhỏ | `Spot` | `placeId` bắt buộc; M:N với `Activity` |
| Đặc sản | `Specialty` | ⚠️ **ĐANG TẮT** (ẩn khỏi trang công khai + khoá trong CMS; dữ liệu còn nguyên). `placeId` bắt buộc; M:N với `Eatery` |
| Quán ăn / quán nước | `Eatery` | `placeId` bắt buộc; M:N với `Specialty`; `venueKind` (ăn/uống/cả hai) tách mục hiển thị; quán view có `viewType` + `bestTime` |
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
(Activity) | `dia-diem` (Spot) | `am-thuc` (Quán ăn + Quán nước, chi tiết qua drawer —
xem "Màn hình Ẩm thực" bên dưới; phần Đặc sản đang tắt) |
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
> `quan-an`, `luu-tru`, `di-chuyen`, `blog`, `lich-trinh`, `login`, `api` — không được
> trùng với slug. Danh sách thật nằm ở `RESERVED_SLUGS` trong `src/lib/slug.ts`.
>
> **`/lich-trinh` chia theo CÔNG KHAI vs RIÊNG TƯ, không theo loại màn hình:**
> `/lich-trinh` + `/lich-trinh/[slug]` là lịch trình mẫu (công khai, có index, là đích SEO);
> mọi thứ của người dùng nằm dưới **một** tiền tố `/lich-trinh/cua-toi` (noindex, `sw.js`
> chặn cache bằng đúng một dòng). Vì slug mẫu ở tầng một nên `cua-toi` · `s` · `mau` là từ
> khoá dành riêng của riêng nó — `RESERVED_TRIP_SLUGS` trong `src/lib/slug.ts`. URL cũ
> (`/lich-trinh/mau/[slug]`, `/lich-trinh/[id]`) đều có chuyển hướng vĩnh viễn.

**Màn hình Ẩm thực** (`/diem-den/[placeSlug]/am-thuc`, `FoodSection`) — **MỘT danh sách quán,
MỘT bộ điều khiển**, bám đúng ba câu hỏi của người mở tab, theo thứ tự hay gặp:

```
Mở đầu (tên + 3 dữ kiện TÍNH TỪ DATA)
Thanh lọc dính  ❶ [⏱ Đang mở n] │ Mọi bữa · Sáng · Trưa · Tối · Ăn đêm · Cà phê · Ăn vặt
                ❷ Kiểu: …  │  [👁 Có view n]
Lưới thẻ 1/2/3 cột (một khuôn thẻ duy nhất) → POPUP chi tiết
Trải nghiệm ẩm thực (Activity category=food) — khối riêng cuối trang, link sang /hoat-dong
```

- **Chi tiết quán mở bằng POPUP** (`Dialog`), không phải ngăn trượt. Từ `lg` là **hai cột**:
  trái là **nửa hình ảnh**, phải là phần đọc cuộn riêng + **thanh hành động ghim đáy** với
  **"Chỉ đường"** làm nút chính (đây là trang thông tin, không phải nơi đặt bàn — việc kế
  tiếp sau khi xem gần như luôn là tới đó). Dưới `sm` popup **dán đáy màn hình và trượt lên**,
  ảnh 4/3 lên đầu. Khoá `lg:h-[min(88vh,44rem)]` cho cả popup — để cao tự do thì hàng lưới
  lấy chiều cao cột chữ, ảnh hụt lại và hở mảng trắng. Nút đóng tự dựng (nền mờ) vì chữ X
  trần của `DialogContent` chìm nghỉm trên ảnh.
- **MỘT carousel cho CẢ HAI tab.** Dùng `@/components/ui/carousel` (shadcn trên embla), cùng
  component với `hero-lightbox`/`rail`, **không tự viết bộ chuyển ảnh**. Ảnh quán và ảnh thực
  đơn đều là ảnh nên dùng chung bộ điều khiển (vuốt · mũi tên · đếm `1/3` · dải ảnh nhỏ) —
  học một lần dùng cho cả hai. Khác nhau **chỉ ở cách vừa khung**: `object-cover` cho ảnh
  quán, `object-contain` cho tấm menu. `key={tab}` để embla khởi tạo lại đúng danh sách slide,
  và đổi tab thì `shot` về 0 (index cũ trỏ ra ngoài danh sách mới).
  - Dải ảnh nhỏ đồng bộ hai chiều: `api.scrollTo(i)` ↔ `api.on("select")`.
  - Mũi tên phải **tự dựng đè lên ảnh**: `CarouselPrevious/Next` mặc định neo `-left-12`, tức
    NGOÀI khung — trong popup thì rơi mất ra ngoài mép. **Ẩn dưới `sm`** (ở đó vuốt là thao
    tác tự nhiên, mũi tên chỉ che ảnh).
  - Dải ảnh nhỏ phải có **`-m-1 p-1`**: vòng `ring` của ảnh đang chọn vẽ RA NGOÀI khung phần
    tử, không chừa chỗ thì `overflow-x-auto` cắt cụt viền trên; margin âm bù lại để khối
    không xê dịch.
- **Chuyển ảnh quán ↔ thực đơn bằng MỘT thẻ có ảnh xem trước** (`MediaSwitch`), chỉ ra **nơi
  sẽ tới** chứ không đánh dấu nơi đang đứng — nó tự đảo chiều nên luôn có đường về. Chỉ hiện
  khi quán CÓ ảnh thực đơn. **Không dùng segmented hai nút**: segmented là ẩn dụ của lọc/sắp
  xếp CÙNG một tập, đây là hai tập ảnh khác hẳn; và mời gọi bằng một chữ trong khi thứ đằng
  sau là ẢNH thì không ai buồn bấm.
- **Trạng thái đang xem nằm ở chip góc trên phải**: `Thực đơn 1/2` — gộp hai con số từng ở
  hai nơi (số trên nhãn tab + bộ đếm carousel). Chip này **luôn hiện ở tab Thực đơn** kể cả
  khi chỉ có một ảnh, nếu không sẽ mất hẳn dấu hiệu "bạn đang xem thực đơn".
- Overlay đáy **XẾP CHỒNG hai dòng**: thẻ chuyển một dòng, dải ảnh nhỏ một dòng riêng chiếm
  **hết bề ngang**. Đừng gộp thành một hàng `justify-between` — dải ảnh sẽ bị bóp và ảnh cuối
  bị cắt cụt. Ở tab Thực đơn, ảnh phải chừa `padding-bottom` **đúng bằng chiều cao overlay**
  (`pb-[9.5rem]` khi có dải ảnh, `pb-[5.5rem]` khi không) — ảnh `contain` chạm sát mép khung
  nên thiếu chỗ là bị thẻ chuyển đè lên.
- Cột chữ có thêm thẻ **"Xem thực đơn"** dẫn sang (nút chuyển nằm ở nửa ảnh, người đang đọc
  dễ bỏ sót) — và **ẩn khi đã ở tab đó**, không mời đi tới nơi mình đang đứng.

**Cột phải xếp theo THỨ TỰ QUYẾT ĐỊNH**, không phải theo thứ tự trường trong schema:

```
Loại · Tên · Khu vực
┌ Tin thực địa ────────────────┐  ← ngay dưới tên
│ ● Đang mở · đến 22:30        │     trạng thái (màu theo tone)
│ 🕐 16:00 – 23:00             │     giờ mở cửa
│ 🌅 Đẹp nhất: chập tối…       │     bestTime
└──────────────────────────────┘
⚠ notice (nền cam nhạt, KHÔNG viền)
mô tả
[thẻ Xem thực đơn]
Địa chỉ (+ Xem trên bản đồ) · Hợp bữa · Nhìn ra · Điện thoại   ← hàng gạch chân, không bọc thẻ
tags
──────────────────────────────
[ Chỉ đường ]  ☎  🌐            ← ghim đáy
```

- **Giờ mở cửa phải ở TRÊN mô tả.** Bản cũ chôn nó xuống hàng đầu của một bảng ở tận đáy cột,
  sau cả đoạn văn — trong khi cả màn hình Ẩm thực được dựng quanh đúng câu hỏi "giờ này còn
  mở không".
- `statusView()` dùng chung cho huy hiệu trên ảnh và dòng trạng thái ở cột phải. Huy hiệu
  chật chỗ nên chỉ kèm giờ khi đó là tin gấp (sắp đóng / mở lại lúc mấy giờ); cột phải rộng
  hơn thì hiện đủ.
- **Địa chỉ trong bảng chỉ lấy phần đường/mốc** (`data.address`), KHÔNG dùng `fullAddress` —
  phường & thành phố đã nằm ngay dưới tên quán, in lại là đọc hai lần cùng một chỗ.
- Cột này vốn đã nhiều khung: chỉ thẻ **bấm được** mới có viền (thẻ Xem thực đơn). Tin thực
  địa dùng nền `muted/50`, cảnh báo dùng nền `warm/10`, bảng thông tin chỉ có hairline ngăn
  dòng — không bọc thẻ.
- **Tab Thực đơn**: nền **tối** (`bg-foreground/90`) để tấm menu (thường là giấy sáng) nổi
  lên như tài liệu đặt trên bàn; ảnh giữ **nguyên tỉ lệ gốc** (`<img>` + `max-h-full
  max-w-full`, KHÔNG `fill`) nên dọc hay ngang đều không bị cắt và luôn to hết mức khung cho
  phép. Không có huy hiệu trạng thái/hướng nhìn ở tab này, nên gợi ý **"Bấm để phóng to"** đặt
  góc trên trái — để ở đáy thì trên điện thoại nó đụng cụm tab.

**Thực đơn = ẢNH, không phải bảng món.** `Image.kind` ∈ `gallery | menu` (enum `ImageKind`),
**không có bảng `MenuItem`**, không có tên món / giá dạng dữ liệu. Cân nhắc đã chốt: giá món
sẽ **sai một cách vô hình** đúng như `foodIntro`/`priceRange` từng sai, còn ảnh tấm menu là
một lát cắt thời điểm, trung thực hơn.

> **BẤT BIẾN — ảnh `menu` KHÔNG BAO GIỜ `isCover = true`.** Nhờ vậy mọi truy vấn ảnh bìa sẵn
> có (`where: { isCover: true }`, rải khắp `geo.ts`, các trang Place/Spot…) tự loại ảnh menu
> ra, khỏi phải đi sửa từng chỗ. Giữ ở ba nơi: route upload (`isCover` chỉ đặt cho `gallery`,
> `order` đếm trong từng nhóm), `setCoverImage` (từ chối ảnh `menu`), `deleteImage` (chọn bìa
> thay thế chỉ trong nhóm `gallery`). **Chỗ nào lấy cả gallery mà KHÔNG lọc `isCover` thì
> phải tự lọc `kind: "gallery"`** — hiện là `gallerySelect` ở `[loai]/page.tsx` và trang sửa
> quán trong CMS.
>
> Prisma **không cho select cùng một quan hệ hai lần dưới hai tên**, nên `fetchEateryDetails`
> lấy cả `images` kèm `kind` rồi tách thành `images` / `menuImages` trong JS — vẫn một truy vấn.

- Ảnh thực đơn **không bao giờ bị cắt** (`contain`, tỉ lệ gốc): giá trị của tấm menu nằm ở
  CHỮ, cắt cho vừa khung là cắt mất giá. Bấm vào mở **lớp xem phóng to** (`MenuZoom`) — dùng
  **`Dialog` LỒNG** chứ không phải lớp phủ tự chế, để Radix xếp lớp và Esc đóng đúng lớp trên
  cùng (ảnh) rồi mới tới popup quán.
- **Thẻ ngoài lưới**: quán có ảnh thực đơn thì rê chuột / focus bàn phím vào thẻ sẽ đổi ảnh
  bìa sang **tấm thực đơn** (nền tối + `contain`, cùng ngôn ngữ với tab Thực đơn trong popup).
  Ba điều bắt buộc đi kèm:
  - **Huy hiệu "Thực đơn" luôn hiện** (góc dưới trái), không chỉ khi hover — điện thoại không
    có hover mà đó mới là phần lớn khách; đổi ảnh chỉ là phần thưởng cho chuột.
  - Đổi ảnh bằng **CSS thuần** (`group-hover`), KHÔNG state React → chuột lướt ngang qua lưới
    không gây nháy.
  - Bấm trong lúc đang xem thực đơn thì popup mở **thẳng tab Thực đơn** (`initialTab`). Rê ra
    menu rồi bấm lại thấy ảnh quán thì hoá ra lừa. Trạng thái hover giữ trong `useRef` — chỉ
    đọc lúc bấm nên không gây render lại.

- **"Giờ này còn mở không" là thông tin đắt nhất của trang.** `src/lib/opening-hours.ts` đọc
  `Eatery.openingHours` ("16:00 – 23:00", "5:30 – 10:00, 15:00 – 19:00", cả ca qua nửa đêm)
  → mỗi thẻ một huy hiệu **Đang mở / Sắp đóng · HH:MM / Mở lúc HH:MM / Đã đóng cửa**, cộng
  chip lọc "Đang mở". Tính theo **giờ Việt Nam** (`Asia/Ho_Chi_Minh`), KHÔNG theo đồng hồ
  máy — khách ở múi giờ khác lên lịch vẫn cần giờ bản địa. Chỉ chạy **ở client** (`useEffect`
  + tick 60s): server không biết "bây giờ" của người xem và trang thì được cache. Chuỗi giờ
  đọc không được → **không hiện huy hiệu**, tuyệt đối không đoán.
- **KHÔNG chia khối theo `venueKind`.** Bản cũ tách "Ăn ở đâu" / "Quán nước & cà phê"; trục
  đó không sạch trong dữ liệu thật: quán `eat` vẫn có `viewType` (Hải sản Bờ Kè 24, Ốc nướng
  Bờ Kè) nên bị nhốt ngoài mục quán view, còn quán `drink` không view (Chè Thái) thì mọi chip
  hướng nhìn đều loại ra; quán `both` bị đếm hai lần (13 + 4 = 17 cho 15 quán). Việc "đến để
  ăn hay để ngồi" đã do **trục BỮA** diễn đạt chính xác hơn (`cafe` là một bữa), còn cảnh đẹp
  thành **một bộ lọc "Có view" + huy hiệu trên thẻ**.
- **Bữa vẫn là trục lọc chính** và giờ **có cả "Cà phê"** (trước đây cố ý bỏ vì đã có mục
  quán nước riêng — nay không còn mục đó; bỏ đi thì quán chỉ có `meals=[cafe]` sẽ không rơi
  vào chip nào). Đổi lại, chip **Kiểu** tự ẩn giá trị nào trùng NHÃN với một chip bữa
  (`cafe` → "Cà phê" ở cả hai bảng nhãn) — hai viên chữ giống hệt nhau thì không ai đoán
  được chúng khác gì.
- **Mở đầu không còn đoạn văn.** Ba dữ kiện tính từ chính dữ liệu ("15 quán · 6 chỗ ngồi có
  view · mở từ 5:30 đến 23:30") thay cho `Place.foodIntro` — luôn đúng, không phải bảo trì.
  Hai trường `foodIntro`/`foodTips` (và khối "Biết trước khi ăn") **đã xoá khỏi schema**,
  cùng đợt với `getToIntro`/`getAroundIntro`. Lý do: CMS không bao giờ có ô nhập nên chỉ seed
  ghi được, nội dung đóng băng theo lần seed và chỉ một điểm đến có. **Đừng thêm lại kiểu
  trường văn xuôi tự do trên `Place`** — thông tin thực địa (giờ vàng, hết sớm, nghỉ thứ 2,
  mẹo chặng đường) sống ở trường có cấu trúc của chính mục đó: `Eatery.bestTime`/`notice`,
  `Spot.bestTime`/`notice`, `Transport.description`/`notice`; dài hơn nữa thì là một bài blog.
- **`notice` và `bestTime` lên THẲNG thẻ** (dòng cam cảnh báo / dòng xanh giờ vàng, đẩy xuống
  đáy thẻ cho thẳng hàng). "Thường hết hàng trước trưa" là thứ đổi kế hoạch — chôn trong
  drawer thì phải mở từng quán mới thấy.
- **Đã bỏ thanh nhảy dính 3 chip + scroll-spy**: một danh sách thì không có gì để nhảy giữa,
  và ~15 mục không đáng ba tầng điều khiển. Thanh lọc ghim ở `top-12 lg:top-28` — **đúng
  chiều cao `PlaceTabs` (3rem) cộng header (4rem từ `lg`)**; bản cũ để `top-28` ở mọi khổ nên
  trên điện thoại nó lửng lơ, hở một dải nội dung chạy phía sau.
- Tỉ trọng đổi theo điểm đến giống cặp Activity/Spot: nơi *dish-led* (biển, đô thị cổ) nhiều
  quán ăn; nơi *view-led* (núi) ít quán nhưng phần lớn có `viewType`. Một lưới + bộ lọc **tự
  co giãn** theo cả hai, không phải ép hai khối cân nhau.

**Ẩm thực ở tab tổng quan** (`/diem-den/[placeSlug]`, `FoodMenu`) — **MỘT HÀNG BỐN Ô**, cùng
khuôn thẻ với `StayDirectory`/`SpotSpotlight`: ảnh 4/3 lồng trong thẻ → nhãn loại → tên →
dòng nhấn ở đáy. Một link "Xem tất cả" duy nhất trên tiêu đề.

- **KHÔNG tách quán ăn / quán nước thành hai khối.** Trục ăn-uống là thứ cần khi xếp lịch
  bữa — việc của màn hình Ẩm thực đầy đủ. Ở bản xem trước câu hỏi chỉ là "quanh đây ăn uống
  chỗ nào đáng ghé", nên phân biệt bằng **nhãn trên từng ô**, không bằng khối riêng.
  (Bản trước là 2 khối, mỗi khối một link "Xem tất cả" → cộng link tiêu đề là **3 link cùng
  trỏ một chỗ**, và section mở đầu bằng danh sách chữ không ảnh giữa một trang lấy ảnh làm
  chủ. Nó vốn cân được nhờ khối "Món phải thử" gánh phần hình; khối đó gỡ đi thì mất điểm tựa.)
- **Giữ chỗ cho quán nước** (`pickVenues`): tối đa 2/4 ô, quán có `viewType` ưu tiên. Không
  xếp chung rồi cắt — quán nước đứng cuối theo `order` nên cách đó gần như không bao giờ cho
  chúng lọt, đúng ở những nơi mà cảnh mới là lý do người ta tới. Vì vậy quán nước cũng phải
  **truy vấn RIÊNG** (`prisma.eatery.findMany`), không dùng chung `take` với quán ăn.
- **Huy hiệu "Nhìn ra …" hiện cho MỌI quán có `viewType`, kể cả quán ăn** — view của quán ăn
  (Hải sản Bờ Kè 24: "bàn sát biển") trước đây bị giấu kín trong khối chữ.
- **Nhãn ô ưu tiên `category`** ("Cà phê", "Hải sản" — đã tự nói ăn hay uống), chỉ rơi về
  "Quán ăn"/"Quán nước" khi category trống hoặc `other`. Đừng rẽ nhánh theo `venueKind`
  trước: quán `both` sẽ ra nhãn khác hẳn quán `drink` cùng loại.
- **Dòng đáy** = `bestTime` (giờ vàng, `text-primary` — quyết định đi hay không), nếu không
  có thì bữa + khu vực.
- Khối "Món phải thử" (6 món, hàng menu ảnh vuông + dây chấm dẫn) đã gỡ cùng đợt tắt phần
  món ăn. Tiêu đề section đổi "Ăn gì ở X" → **"Ăn uống ở X"**, đơn vị đếm "món & quán" →
  "quán", và tab Ẩm thực chỉ còn đếm `counts.eatery` (`buildPlaceTabs`).

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
  `src/components/ui/`, dựng trên **Radix UI** (package hợp nhất `radix-ui`); icon dùng
  **`@/components/icons`** (shim Material Symbols sinh bởi `scripts/build-icons.mjs`)
- **Prisma 7 + PostgreSQL** — ORM; client mới sinh ra `src/generated/prisma` (đã gitignore),
  kết nối qua driver adapter `@prisma/adapter-pg`. `DATABASE_URL` trong `.env`.
- **Auth.js (NextAuth v5)** — đăng nhập Google OAuth (**đã gắn** Prisma adapter, xem `auth.ts`)
- **pnpm** là package manager **bắt buộc** (môi trường KHÔNG có npm/npx)

Thư viện lớn khác đang dùng (đừng thêm thư viện trùng vai trò):

| Mảng | Gói | Ghi chú |
|---|---|---|
| Bản đồ | `leaflet` + `react-leaflet` + `leaflet.markercluster` | luôn nạp động (`ssr: false`) — xem `components/map/*-inner.tsx` |
| Upload ảnh | `uploadthing` + `@uploadthing/react` | route `/api/uploadthing`, `/api/editor-upload`; helper `lib/uploadthing.ts` |
| Rich text | `@tiptap/*` | soạn thân bài `Post` → lưu **chuỗi HTML**; đọc lại phải qua `lib/sanitize.ts` |
| Realtime | `ably` | server giữ `ABLY_API_KEY`, browser lấy token qua `/api/ably/token`. **Không có key → tự rơi về polling**, không vỡ |
| Analytics | `posthog-js` | chỉ bật khi có `NEXT_PUBLIC_POSTHOG_KEY`; không có → mọi hàm no-op |
| Biểu đồ | `recharts` | dashboard `/cms/analytics` |
| Carousel | `embla-carousel-react` (+ `fade`, `wheel-gestures`) | **bộ carousel DUY NHẤT** — xem quy ước ở mục "Màn hình Ẩm thực" |
| UI phụ | `sonner` (toast) · `vaul` (drawer) · `cmdk` (command palette) · `qrcode.react` (QR chia sẻ) | |
| Kiểm dữ liệu | `zod` | validate form/server action |

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
├── components/site/             # chrome public: site-header, user-menu, mobile-nav, bottom-nav
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
  `@/components/icons` (tên component theo quy ước lucide cũ; `lucide-react` KHÔNG còn là
  dependency). Màu/spacing dùng biến theme trong `globals.css` (vd `bg-primary`,
  `text-muted-foreground`) thay vì màu cứng.
- **Khổ nhỏ nhất phải chạy được là 320px.** Hàng số liệu ở hero (lượt xem · đánh giá · đã
  đến) **giữ MỘT HÀNG xuống tới 320px** — cách làm: bỏ CHỮ chứ không bỏ SỐ. Dưới `sm` chỉ còn
  icon + con số, và `CheckInFaces` nhận prop **`dense`**: avatar co 32→24px, chỉ hiện 3 mặt
  thay vì 5, bỏ nhãn "Vivu-er đã đến". Vì số mặt đổi nên **bong bóng "+N" phải render hai
  bản** (mobile/desktop) rồi để `display` chọn — cắt bằng CSS mà giữ nguyên một con số thì nó
  sai. Áp dụng ở cả ba hero: `place-hero`, `place-hero-center`, `spot-hero`.
- **Kiểm layout hẹp KHÔNG chụp bằng `--window-size` được.** Chrome headless trên macOS có bề
  rộng cửa sổ tối thiểu (~500px), nên `--window-size=320,…` chỉ **cắt** ảnh chứ không đặt
  viewport 320 — layout vẫn render rộng và ta tưởng nó vỡ/không vỡ một cách sai lệch. Cách
  đúng: viết một file HTML tạm nhúng `<iframe src="http://localhost:3000/…" width="320">` rồi
  chụp file đó; iframe cho viewport CSS đúng bằng bề rộng đặt ra.
- Trước khi báo "đã xong", chạy `pnpm exec tsc --noEmit` và `pnpm lint` để chắc không lỗi.

## PWA (cài được lên màn hình chính + dùng khi mất sóng)

Site là một PWA. Các mảnh ghép:

| File | Vai trò |
|---|---|
| `src/app/manifest.ts` | Web app manifest (Next phục vụ ở `/manifest.webmanifest`, tự chèn `<link rel="manifest">`). Tên/mô tả lấy từ `getSettings()`, `revalidate = 3600` |
| `src/lib/pwa.ts` | Hằng dùng chung: `THEME_COLOR`, `BACKGROUND_COLOR` (trang `/offline` khai trong `sw.js`) |
| `public/sw.js` | Service worker viết tay (không build tool) |
| `public/icons/` | Icon 192/512 (`any` + `maskable`) + `apple-touch-icon.png` — sinh từ `public/logo_mark.png` |
| `src/components/site/pwa-register.tsx` | Đăng ký SW; có bản mới thì hiện toast "Tải lại" |
| `src/components/site/install-prompt.tsx` | Mời cài app (Chromium dùng `beforeinstallprompt`; iOS chỉ hướng dẫn Chia sẻ → Thêm vào MH chính) |
| `src/app/offline/page.tsx` | Trang dự phòng khi mất mạng, được precache lúc SW cài |

Lưu ý khi sửa:
- **Đổi `sw.js` thì PHẢI tăng `VERSION`** trong file đó, nếu không cache cũ không bị dọn.
- SW **chỉ chạy ở production**. Ở `pnpm dev`, `PwaRegister` chủ động gỡ mọi SW và xoá cache
  `halivivu-*` — tránh cảnh "sửa code mà trình duyệt vẫn trả bản cũ".
- Chiến lược: điều hướng trang = network-first (mất mạng → bản đã xem → `/offline`);
  `/_next/static` + `/fonts` = cache-first; ảnh = stale-while-revalidate. Còn lại không đụng.
- **Không cache khu vực cá nhân** — danh sách `NEVER_CACHE` trong `sw.js` (`/api/`, `/cms`,
  `/sale`, `/login`, `/tai-khoan`, `/thong-bao`, `/kiem-tra`). Thêm route riêng tư mới thì
  nhớ thêm vào đây, kèm `HIDDEN_ON` trong `install-prompt.tsx` nếu không muốn mời cài app.
- Chỉ chặn request có `mode === "navigate"`; prefetch RSC của App Router cố tình để nguyên
  cho mạng, tránh cache nhầm payload RSC rồi trả về cho một request document.
- Đổi icon: sửa `public/logo_mark.png` rồi sinh lại bộ `public/icons/` (192/512 `any`,
  192/512 `maskable` — mascot nằm trong vòng an toàn 80%, 180 `apple-touch-icon` nền đục).
- Cố ý **chưa** đặt `viewportFit: "cover"` ở `layout.tsx`: các phần tử fixed hiện có
  (`BackToTop`) chưa chừa `safe-area-inset`. Làm tràn viền thì làm cùng lúc.
  (`BottomNav` đã dùng `max(0.75rem, env(safe-area-inset-bottom))` nên sẵn sàng.)

## Trang chủ — hero tràn viền + số liệu + hai lưới nội dung

Thứ tự section hiện tại: **hero** (ảnh tràn viền) → **"Nội dung đang có"** (dải số liệu) →
**"Điểm đến nổi bật"** (8 ảnh in nghiêng) → **"Mới trong Cẩm nang"**. Hết — không có CTA
đóng trang.

### Hero (`src/components/site/home-hero.tsx`)

Ảnh **tràn viền**, đổi ảnh mỗi 7s (dừng khi rê chuột / tab bàn phím / tab trình duyệt ẩn,
tắt theo `prefers-reduced-motion`) và **chuyển tay được** bằng cụm điều khiển góc dưới phải.
**Chữ KHÔNG đổi theo ảnh**: h1 là lời hứa của site, ảnh chỉ là **không khí** — tên nơi trong
ảnh ghi ngay trên cụm điều khiển, kèm link.

- **TIÊU ĐỀ ĐỔI GIỮA BA BIẾN THỂ** (`TITLES` trong `page.tsx`), **cùng nhịp với ảnh** —
  `titles[index % titles.length]`, không đẻ đồng hồ thứ hai: hai chu kỳ khác nhau thì hero
  lúc nào cũng có một thứ đang động. Bấm vạch chuyển ảnh cũng đổi tiêu đề.
  · **A11Y/SEO:** `<h1>` luôn chứa MỘT tên cố định (biến thể đầu, đọc bằng `sr-only`), phần
    chạy chữ là trang trí nên `aria-hidden` — trình đọc màn hình và bộ thu thập không bao giờ
    gặp một tiêu đề đổi mỗi bảy giây. Đổi thứ tự `TITLES` là đổi luôn h1 thật.
  · Ba biến thể phải nói **cùng một lời hứa** bằng ba góc khác nhau; thêm biến thể chỉ để có
    chữ chạy thì người đọc phải ngồi đối chiếu xem câu sau có mâu thuẫn câu trước không.
  · Mỗi biến thể có `mark` — đoạn được gạch chân vẽ tay (`HeroMark` tìm chuỗi con trong dòng
    hai; không khớp thì bỏ nét gạch, không vỡ).
- **BA HIỆU ỨNG MỞ MÀN** (keyframes + class trong `globals.css`, mỗi cái có nhánh
  `prefers-reduced-motion`):
  · `.hero-line` — mỗi DÒNG h1 trồi lên từ một **khung cắt** (`overflow-hidden` ở thẻ cha),
    lệch pha 120ms. Chữ bị KHUNG che chứ không bị làm mờ;
  · `.hero-rise` — nhãn, câu dẫn, nút, dải câu hỏi nhích lên 14px, lệch pha bằng
    `[animation-delay:…]` ngay tại chỗ dùng;
  · `.hero-underline` — nét **gạch chân vẽ tay** dưới "mười tab" (SVG path,
    `vectorEffect="non-scaling-stroke"`, `preserveAspectRatio="none"` để co theo bề rộng
    chữ) tự vẽ từ trái sang phải;
  · `.hero-pan` — ảnh trôi 7% trong 22s, `infinite alternate` nên không bao giờ đứng khựng.
  ⚠️ **`hero-pan` đòi section phải `overflow-hidden`**: `<Image fill>` chỉ NEO theo section
  chứ không bị nó cắt, nên ảnh phóng 1.07 sẽ tràn xuống dưới hero thành một dải ảnh lạc lõng
  giữa hero và section kế tiếp — mà các lớp scrim `inset-0` không phủ tới đó nên nó còn sáng
  nguyên.
  **LUẬT:** không keyframe nào được đụng `opacity` — hiệu ứng KHÔNG được là điều kiện để chữ
  nhìn thấy được (bản hero cũ từng ra một tấm ảnh trắng trơn khi chụp kiểm vì `fade-in`).
  Khung cắt cần `pb`/`-mb` bù chỗ cho dấu và dấu phẩy tụt dưới đường chân chữ.
- **Bốn vạch, không phải chấm tròn:** vạch nói được cả ba thứ trong một hình — có mấy ảnh,
  đang ở ảnh nào (vạch dài ra), và bấm được. Vùng bấm cao 44px nhờ `py-3` dù vạch dày 3px.
- **Phần giới thiệu nói bằng CÂU HỎI CỦA NGƯỜI ĐI**, không phải bằng lời tự giới thiệu:
  trên là h1 + một câu + hai nút; dưới là **dải tràn ngang ba cột** — ba câu người ta vẫn
  hỏi nhau trước chuyến ("Cuối tuần này đi đâu được?"…), mỗi câu kèm chỗ site trả lời. Dấu
  mở ngoặc kép để rời, cỡ lớn, màu `warm-bright` — dấu hiệu "đây là lời người ta nói".
  Ba câu cố ý **không trùng** bốn lợi ích ở section bên dưới (gom một trang · giờ mở cửa ·
  xác minh chính chủ · giá đi lại): chúng nhắm vào phần lên kế hoạch — đi đâu, mấy ngày,
  mùa nào.
- **Đã thử và bỏ hai bản, đừng quay lại:**
  · *đoạn văn bốn dòng + hàng nhãn trần* ("Địa điểm · Trải nghiệm · …") — nhãn nói TÊN mục
    mà không nói mục đó chứa gì, còn nửa phải tấm ảnh thì trống trơn;
  · *thẻ mục lục kính tối ở cột phải*, năm mục đánh số 01–05 — đọc được, nhưng đó là site
    tự mô tả cấu trúc của mình bằng từ vựng nội bộ ("Nơi lưu trú", "Di chuyển"), trong khi
    khách mang tới đây câu hỏi chứ không mang sơ đồ dữ liệu; và nó là khối thứ ba liên tiếp
    có dạng "danh sách mục + chú thích nhỏ", ngay trên section số liệu và section lợi ích
    vốn cũng cùng một hình.
- **MÀU: hero được CHỈNH MÀU, không phải bị "dìm" bằng đen.** Bốn lớp, tất cả đều là chuyện
  ánh sáng — không quả cầu mờ, không đốm sáng lơ lửng:
  · scrim dọc & ngang bằng **xanh rừng rất sâu** (`rgba(8,22,15,…)`) thay cho đen thuần —
    cùng độ tối nhưng vùng dưới hero có nhiệt độ màu, và ngả về phía màu thương hiệu;
  · **vệt nắng cam hắt lên từ góc dưới trái**, `mix-blend-screen` nên nó hành xử như ÁNH
    SÁNG (nâng vùng tối) chứ không như lớp sơn; neo vào một góc, tắt trước 68%;
  · **vignette** rất nhẹ + **hạt phim 5.5%** (`feTurbulence` 160×160 lặp, `mix-blend-overlay`)
    — không nhìn thấy, chỉ cảm thấy: hạt phá dải màu của gradient trên nền tối.
- **Bốn điểm CAM giữ hero khỏi rơi về đen-trắng-xám**: vạch ở nhãn mở đầu · dấu mở ngoặc kép
  của dải câu hỏi · vạch chỉ số ảnh đang xem · đường kẻ trên dải câu hỏi (1px chuyển từ cam
  ở mép trái sang trắng mờ, không phải `border-t` trắng đều).
- **MÀU CHỮ: dòng thứ hai của h1 là chỗ đặt màu** — `text-warm-bright`. Trước đó cả hero là
  trắng ở năm độ mờ, đọc ra đen-trắng dù ảnh có màu; đổi vài mức sang trắng-ngả-ấm vẫn chưa
  đủ vì mắt không bắt được chênh lệch đó. Một dòng tiêu đề CAM thì bắt được ngay, và nó rơi
  đúng vào vế đau của câu ("khỏi mở mười tab") nên màu ở đây mang nghĩa.
- Thang còn lại: câu hỏi = **trắng thuần**; câu dẫn & câu trả lời = **trắng ngả ấm**
  (`#f8ece0` / `#f7e7d6`, cùng nhiệt độ với vệt nắng góc dưới trái) — riêng bốn danh từ
  trong câu dẫn ("chỗ ghé, chỗ ăn, chỗ ở, đường đi") kéo lên **trắng thuần + đậm** cho câu
  có nhịp; nhãn mở đầu = **cam** (`warm-bright`); toạ độ = cam rất mờ. Bảng màu này chỉ đúng
  TRÊN ẢNH TỐI nên viết thẳng mã màu, không qua token (token phải lật theo theme, hero thì
  tối ở cả hai theme).
- **Toạ độ thật dưới dòng "Ảnh: …"** (`Place.lat/lng`, viết kiểu `22.336° B · 103.844° Đ`) —
  chi tiết kiểu sổ tay thực địa, lấy từ dữ liệu chứ không bịa; nơi chưa có toạ độ thì ẩn.
- **Chiều cao là `min-h-[min(86svh,52rem)]`, không phải `h-` cứng**: khối chữ trên điện
  thoại hẹp cao hơn 86svh, mà ảnh `fill` neo theo section này nên section không được cắt.
- **Số liệu site KHÔNG ở trong hero** — nén thành dòng nhỏ vắt ngang đáy ảnh thì nó đọc như
  chú thích của tấm ảnh. Nay là section riêng ngay dưới hero (xem mục kế).

### Section "Nội dung đang có" (trong `src/app/(site)/page.tsx`)

Một câu quy mô với chữ số cỡ lớn ("**31** điểm đến, mỗi nơi một trang riêng") và **hàng bốn
con số** của tầng nội dung (địa điểm · trải nghiệm · quán ăn · lưu trú). Hết — section này cố
ý ngắn.

- Hàng chân từng có hai dòng ("đếm thẳng từ nội dung đã xuất bản…" và "Vừa biên tập: <nơi> ·
  <ngày>") — **đã bỏ** cùng truy vấn `Place` mới cập nhật nhất nuôi nó. Chú thích về cách đếm
  là chuyện nội bộ, còn dòng "vừa biên tập" thì không đủ sức giữ chỗ một hàng riêng.

- **LUẬT MÀU:** xanh (`text-brand`) = tầng nơi chốn, cam (`text-warm-ink`) = tầng nội dung bên
  trong. KHÔNG dùng `primary`/`warm`: đây là CHỮ trên nền sáng, hai token kia không đủ tương
  phản. `<Big>` không có dấu cách viết tay hai bên (khoảng cách do `me-2` của nó lo).
- **CỐ Ý KHÔNG đếm số tỉnh**: đích đến là phủ đủ 63 tỉnh, mà "27/63" đọc ra như một thanh
  tiến trình còn dang dở.
- Lưới bốn mục khai `grid-cols-2` từ khổ nhỏ nhất (không chỉ `sm:`): lưới không khai cột thì
  track co theo max-content và tràn ngang.
- **Đây là một DẢI, không phải một section cao**: câu mở bên trái, bốn con số bên phải, đệm
  dọc chỉ `py-12/14`. Từ khi hai section cuối trang bị gỡ, khối này còn mỗi câu mở + bốn số
  mà vẫn ăn `py-20` — đọc ra như trang bị hụt nội dung.
- **Lưới "Điểm đến nổi bật" lấy 8 tấm** (truy vấn `featured` `take: 12`, hero ăn 4 tấm đầu),
  và `PRINTS` có **SÁU** góc nghiêng cho lưới BỐN cột — số lẻ so với số cột nên hàng thứ hai
  không lặp lại y hệt hàng đầu, tránh nhìn ra một khuôn dập.
- Nền có **vệt nắng ấm rất nhạt ở góc trên trái**, nối tiếp vệt nắng góc dưới trái của hero.
- **ĐÃ THỬ VÀ BỎ — một loạt, đừng dựng lại mà không hỏi:** sáu ô phẳng bằng nhau · bốn thẻ
  trắng có vạch kẻ · bốn thẻ ẢNH · và cuối cùng là cả một **bản đồ độ phủ 63 tỉnh** ở cột phải
  (tô xanh tỉnh đã có điểm đến, rê vào thì mảnh nhấc lên kèm popup liệt kê điểm đến, có cả
  danh sách chip / thẻ xem trước ở cột trái qua nhiều vòng). Bản đồ đẹp nhưng kéo cả section
  thành một thứ để nghịch, và bộ đường viền ~58KB nằm thẳng trong HTML trang chủ chỉ để minh
  hoạ mấy con số. Đường viền 63 tỉnh vẫn còn ở `components/account/vietnam-map-paths.ts`
  (trang `/tai-khoan/da-den` dùng) nên dựng lại lúc nào cũng được.

### Nút (`src/components/site/cta-button.tsx`) — một "vật liệu" dùng chung

Ba tone: **`surface`** (nền brand, trên nền trang sáng) · **`photo`** (trắng, đặt trên ảnh) ·
**`glass`** (kính mờ, nút PHỤ trên ảnh). Prop `arrow` tắt mũi tên cho nút phụ.

Bản trước chỉ có một màu nền + đổi màu khi rê chuột — gọn tới mức thành cái mặc định của
framework. Nay mỗi nút có đúng ba thứ, đều là **vật lý** chứ không phải trang trí:

1. **Mép trên sáng 1px** + chuyển sắc trắng ~14% từ đỉnh — ánh sáng tới từ trên nên mép
   trên của vật lồi phải sáng hơn thân.
2. **Bóng hai tầng**: một bóng tiếp xúc 1px sát chân + một bóng khuếch tán **nhuộm màu
   chính nó** (spread âm nên chỉ đọng dưới đáy).
3. **Bấm thì lún** (`translate-y-px`, bóng co lại). KHÔNG nhấc lên khi rê chuột, và bóng lúc
   nghỉ = bóng lúc hover — bản cũ hơn nữa có "bóng màu nở ra khi hover" và đã bị gỡ vì nút
   thành thứ ồn ào nhất trang. Rê chuột chỉ đổi nền một nấc + mũi tên nhích 2px.

Cộng `focus-visible` (bản cũ **không có gì cả**). Cùng vật liệu này dùng lại ở: nút "Đăng
nhập" trên header và ô icon của hàng đang chọn trong section lợi ích.

- Tone `photo` dùng `text-neutral-900`, KHÔNG `text-foreground`: viên nút trắng không đổi
  theo theme, còn `foreground` lật thành gần trắng trong mọi scope `.dark`.
- Tone `surface` dùng `bg-brand` chứ không `bg-primary` — cùng lý do đã ghi ở
  `site-header.tsx`: `--primary` tự sáng lên trong `.dark`, nút đục sẽ ra hai sắc xanh.
- ⚠️ **`bg-brand` + `bg-gradient-to-b` triệt tiêu nhau qua `cn()`**: tailwind-merge xếp màu
  tự khai trong `@theme` và `bg-gradient-*` vào cùng nhóm `bg-`, cái sau nuốt cái trước →
  nút ra nền TRẮNG với một cái bóng xanh dưới chân. Viết chuyển sắc bằng thuộc tính tuỳ ý
  (`[background-image:linear-gradient(...)]`) là hết.

### Đã gỡ khỏi trang chủ (đừng dựng lại mà không hỏi)

- **Section lợi ích** (`benefits-showcase.tsx`): bốn lợi ích ở cột trái, cột phải là **ảnh
  chụp đúng màn hình làm được điều đó**, rê/bấm một lợi ích thì đổi ảnh. Ảnh nằm ở
  `public/hero/`, mỗi lợi ích hai bản (1440×900 khổ máy tính, 780×1120 chụp ở khổ 390px) và
  hiển thị bằng `<picture>` + `<source media>` vì đó là **art direction** — ảnh desktop thu
  về 350px thì chữ trong ảnh mịt mù. **Cả component lẫn thư mục ảnh đã xoá.**
- **Khối kết** "Chọn một nơi, phần còn lại đã nằm sẵn ở đó" + nút "Xem tất cả điểm đến".
  Trang chủ nay **kết thúc ở section Cẩm nang**, không có CTA đóng trang.

Muốn dựng lại phần ảnh chụp thì chụp lại như sau (nguồn cũ là trang Phan Thiết):

```bash
chrome --headless --force-device-scale-factor=2 --window-size=1280,5000 \
  --screenshot=out.png http://localhost:3000/diem-den/phan-thiet/am-thuc
# rồi cắt bằng sharp (đã có sẵn trong node_modules):
#   .extract({left:0, top:<y>*2, width:2560, height:1600})   // 16/10 cho desktop
#   .resize({width:1440}).webp({quality:74})
```

Cửa sổ phải **cao hơn hẳn** vùng cần cắt: `TripDock` là nút cố định neo theo khung nhìn, cửa
sổ thấp thì nó rơi ngay vào giữa ảnh. `PeerBar` ở đáy cũng vậy.

## Điều hướng header

`src/components/site/site-header.tsx` giữ mảng `NAV` (nav ngang từ `lg`); menu hamburger ở
mobile là `mobile-menu-sheet.tsx` với danh sách **riêng**, phải sửa cả hai chỗ mới đồng bộ.

Nav hiện tại: **Khám phá ⌄ · Cẩm nang · Giới thiệu**.

> ⚠️ **ĐANG TẠM ẨN** (route vẫn còn, vẫn vào được bằng URL — chỉ gỡ lối vào):
> - Nhóm **"Uy tín"** (`/kiem-tra`, `/sale`) — khỏi nav desktop **và** menu hamburger.
> - **"Cộng đồng"** (`/cong-dong`) — khỏi nav desktop.
> - Bốn trang con của nhóm thông tin (`/cau-hoi-thuong-gap`, `/lien-he`, `/dieu-khoan`,
>   `/bao-mat` — đều "Sắp có"); mục còn lại đổi nhãn thành **"Giới thiệu"** → `/gioi-thieu`.
> - Ở **trang điểm đến**: tab **Cộng đồng** trong `buildPlaceTabs` (`place-meta.ts`) và khối
>   **"Hỏi đáp cộng đồng"** trên trang tổng quan (cờ `COMMUNITY_ENABLED` trong
>   `diem-den/[placeSlug]/page.tsx`; lời gọi `getPlaceCommunityDigest` cũng đã comment để
>   khỏi tốn một vòng DB mỗi lần mở trang).
>
> - Ở **thanh tab dưới mobile** (`bottom-nav.tsx`) và **trang Địa điểm** (mục `cong-dong`
>   trong `src/lib/spot-nav.ts`).
>
> **Lối vào Cộng đồng duy nhất còn lại là link ở `site-footer.tsx`** — cố ý giữ.
>
> Bật lại: thêm `items`/mục trở lại `NAV` trong `site-header.tsx` và `mobile-menu-sheet.tsx`;
> bỏ comment dòng `tabs.push` trong `place-meta.ts`, khối tab trong `bottom-nav.tsx` và mục
> `cong-dong` trong `spot-nav.ts`; đặt `COMMUNITY_ENABLED = true`.
>
> Cờ `COMMUNITY_ENABLED` khai báo kiểu **`boolean`** chứ không để TS suy ra literal `false` —
> literal khiến TS coi nhánh JSX bên trong là không chạm tới được và mọi thu hẹp kiểu trong
> đó mất hiệu lực (vd `place` đã qua `notFound()` lại thành "possibly null").

## Thanh tab dưới trên mobile (`BottomNav`)

`src/components/site/bottom-nav.tsx` — dựng theo khuôn **UITabBar của iOS**, chỉ hiện dưới
`lg` (từ `lg` đã có nav ngang trong header). Hiện **4 mục**: Trang chủ · Khám phá · Bản đồ ·
Menu (mục **Cộng đồng đang tạm ẩn** — xem "Điều hướng header"); Cẩm nang & Giới thiệu ở menu
hamburger.

- **Hình khối iOS, đừng "cải tiến" thành Material:** tràn hết bề ngang, dán sát đáy, KHÔNG
  bo góc/đổ bóng; phân cách bằng hairline 1px ở mép trên; nền trong mờ + `backdrop-blur` +
  `backdrop-saturate` (rơi về nền gần đục khi máy không hỗ trợ `backdrop-filter`); cao
  **49pt** + đệm đáy. Mục đang mở chỉ đổi **icon viền → icon đặc** +
  màu tint — không viên nền, không gạch chân. Chạm thì mờ đi, không gợn sóng.
- **Icon vẽ riêng, KHÔNG dùng `Ic`/Material Symbols:** `src/components/site/nav-icons.tsx`
  (`NavIcon`) — 8 icon × 2 bản (viền/đặc), vẽ theo ngôn ngữ SF Symbols: nét mảnh 1.7
  trên khung 24, đầu nét & góc bo tròn, hình mở. Material Symbols nét dày và khối
  đặc, xếp cạnh nhau ở cỡ 25px thì thanh tab trông nặng, lệch hẳn so với app iOS.
  Chỉ dựng từ đường thẳng + cung tròn (không bezier tự do) để còn soi lại toạ độ;
  vài bản đặc khoét lỗ bằng `fill-rule="evenodd"` (kim la bàn, chấm hội thoại, dấu
  tick trong ghim) vì không thể vẽ đè màu nền lên nền trong mờ. Thêm mục mới thì
  thêm hình vào hai map `OUTLINE`/`FILLED` trong file đó — không đụng
  `scripts/build-icons.mjs` nữa.
  · **Bộ này dùng CHUNG với cụm icon bên phải header** (tìm kiếm · nơi đã đến ·
    lịch trình · chuông) — file tên `nav-icons` chứ không phải `tab-icons` là vì
    vậy. Header cũng đổi **viền → đặc** khi đang ở đúng trang đó, y như thanh tab.
    Cỡ: nhóm ba icon `size-[1.15rem]`, nút tìm kiếm `size-[1.35rem]` — giữ đúng
    nhịp "lớn hơn một bậc" đã có từ bản Material Symbols.
- **Né thanh công cụ trình duyệt (Safari iOS, Chrome Android):** thanh địa chỉ dưới ĐÈ lên
  đáy khung nhìn bố cục, nên `fixed bottom-0` bị khuất. `BottomNav` đo phần bị che bằng
  `visualViewport` (`clientHeight − vv.height − vv.offsetTop`) rồi ghi vào
  `--browser-bottom-chrome` trên `<html>`. Cộng vào **PADDING** chứ không phải `bottom` —
  nền vẫn kéo sát mép máy, chỉ icon/nhãn được nâng lên. Che > 160px thì coi là **bàn phím
  ảo** và bỏ qua (bàn phím che thanh tab là đúng hành vi iOS). Không có `visualViewport`
  thì biến giữ `0px` → y như cũ.
- **Ẩn ở** `/cms`, `/sale`, `/login`, `/offline` (`HIDDEN_ON` — giữ đồng bộ với
  `install-prompt.tsx` và `NEVER_CACHE` trong `sw.js`).
- **Xếp chỗ cho các nút nổi khác:** khi hiện, component gắn `data-bottom-nav` lên `<html>`;
  `globals.css` đổi `--bottom-nav-h` thành `49pt + max(safe-area, 0.5rem) +
  var(--browser-bottom-chrome)` (dưới `lg`). `BackToTop`, `InstallPrompt`, dock của
  `PeerBar` cộng biến này vào `bottom` → tự nằm trên thanh tab **và trên cả thanh công cụ
  trình duyệt**. **Thêm phần tử `fixed` bám đáy mới thì cộng `var(--bottom-nav-h)` vào
  `bottom`** — và nếu nó bám đáy–PHẢI thì cộng thêm **`var(--trip-dock-h)`** (túi lịch
  trình, xem dưới).
- **Khối giữ chỗ** cuối trang cao đúng bằng thanh (viết thẳng số, không đọc biến — biến chỉ
  có giá trị sau khi hydrate) để footer không bị khuất; riêng trang bản đồ (`*/ban-do`, cao
  `100dvh`, không cuộn) thì bỏ khối này, thanh tab đè lên bản đồ.
- Không đọc session (root layout **không** được gọi `auth()` — sẽ phá `force-static` của
  `/offline`). Mục Tài khoản trỏ `/tai-khoan/da-den`, trang đó tự redirect về `/login`.

## Bản đồ du lịch toàn quốc (`/ban-do`)

**Trang này trả lời câu hỏi KHÔNG GIAN, không phải là bản sao của `/diem-den`.** Bản đầu là
danh sách + pin: ô tìm kiếm, chip lọc miền, lọc "Nổi bật", lưới thẻ — cả bốn đều đã có ở
trang danh sách và làm tốt hơn ở đó, còn thứ chỉ bản đồ mới nói được (cái này cách cái kia
bao xa, đi chung chuyến có nổi không) thì không có chỗ nào. Nay panel chỉ còn **hai chế độ**:

| Chế độ | Câu hỏi | Cách làm |
|---|---|---|
| **Quanh đây** | "Từ đây lái 3 tiếng thì tới đâu?" | Chọn một nơi (hoặc bấm ◎) làm **mốc** → `getDistances()` (OSRM table, MỘT lượt cho cả bảng) → danh sách xếp theo **giờ lái**, lọc theo ngưỡng ≤2/4/6 giờ |
| **Đo chuyến** | "Ba nơi này xếp một chuyến có nổi không?" | Bấm các nơi theo thứ tự → `getRoute()` vẽ tuyến thật + `legs[]` cho từng chặng → tổng km/giờ, nêu tên **chặng dài nhất** → nút tạo lịch trình |

- **Ngưỡng lọc là GIỜ LÁI, không phải bán kính km — và không có vòng tròn.** Bản km + vòng
  tròn nói dối ngay trên dữ liệu thật: lọc "200 km" (đường chim bay, đúng bằng vòng tròn vẽ
  ra) nhưng hàng lại ghi "376 km · 4 giờ 31" vì đường núi. Người ta cũng không nghĩ bằng bán
  kính. Thay vòng tròn: nơi ngoài ngưỡng **mờ đi** (`.dl-place-pin--far`) chứ không biến mất
  — ẩn đi thì bản đồ bảo rằng phía bên kia không có gì.
- **OSRM là dịch vụ ngoài tầm tay** (máy chủ demo, không SLA). Hỏng hoặc đang chờ thì
  **không lọc**, chỉ xếp theo đường chim bay và nói thẳng ra ở dòng đếm. Đừng để một trang
  trống vì một API của người khác.
- **Nút "Tạo lịch trình N ngày" → `startTripFromRoute(slugs)`** (`lich-trinh/actions.ts`):
  mỗi nơi thành MỘT NGÀY, đúng thứ tự đã xếp. **Không phải mỗi nơi một `TripItem`** — một
  `Place` là nơi CHỨA điểm dừng nên `TripItem` cố tình không có `placeId`
  ([`docs/lich-trinh.md`](docs/lich-trinh.md) §6b). Nhãn nơi hiện ghi ở `TripDay.title`;
  cần liên kết thật thì nâng lên `TripDay.placeId` như §6b đã chốt.
- **Pin của chặng nằm NGOÀI cluster** và dùng `.dl-trip-pin` — cùng pin đánh số với bản đồ
  lịch trình (`trip-map-inner.tsx`), vì nói đúng một chuyện: thứ tự đi. Gom cụm chúng thì
  đúng thứ người dùng vừa chọn lại biến mất sau một bong bóng "2".
- **Trạng thái pin (mốc / ngoài ngưỡng) NƯỚNG vào icon**, không `classList.toggle` sau khi
  dựng: markercluster tự tạo lại phần tử marker mỗi lần gom/tách cụm (tức mỗi lần đổi zoom)
  nên class gắn sau biến mất mà không effect nào chạy lại.
- **Khung nhìn do PANEL quyết định**, bản đồ chỉ thi hành — một prop `focus` kèm `token`,
  cùng token thì không đụng vào khung nhìn. Nhờ vậy bản đồ không giật khỏi chỗ đang xem mỗi
  lần state đổi. ⚠️ Đừng dùng `L.circle(...).getBounds()` để canh khung: hàm đó đọc
  `this._map`, circle chưa gắn vào bản đồ sẽ ném `layerPointToLatLng` của `undefined`.
- **Đã bỏ, đừng thêm lại:** ô tìm kiếm (22 mục thì cuộn nhanh hơn gõ, site đã có tìm kiếm
  toàn cục) · chip lọc miền (trên bản đồ, miền là thứ NHÌN THẤY — mà chip cũ còn không đưa
  bản đồ về vùng đó) · lọc "Nổi bật" · lớp "Địa điểm chi tiết" (18 điểm cho cả nước, ở mức
  zoom toàn quốc là bụi, còn zoom vào một nơi thì `/diem-den/[slug]/ban-do` làm tốt hơn) ·
  **chỉ đường A→B từ GPS** (Google Maps làm tốt hơn hẳn, và "1.720 km · 28 giờ" là con số
  vô dụng).
- Tham số URL chia sẻ được: `?tu=<slug|toi>` mốc · `?gio=<2|4|6>` ngưỡng · `?lo=<slug,slug>`
  lộ trình (mở thẳng chế độ Đo chuyến). `?at=` là tên cũ của `tu`, vẫn nhận.

**Ngôn ngữ hình khối lấy nguyên từ `/diem-den`** (`destination-filter.tsx`) — hai trang nói
về cùng một tập nội dung, người dùng đi qua lại giữa chúng:

- **Vuông hết, không `rounded-full`/`rounded-xl`**: chip lọc vuông (bật = `bg-foreground
  text-background`), nút điều khiển bản đồ vuông, nút zoom của Leaflet ép vuông trong
  `globals.css`. Nhãn nhỏ dùng **cùng hằng `MICRO`**; tiêu đề `VIỆT NAM` dùng **Playfair**
  (`--font-serif` khai ngay ở `ban-do/page.tsx` vì nó không có trong root layout).
- **Hàng trong panel có HAI đích, tách bằng vị trí** (như thẻ lưu trú): thân hàng làm việc
  của chế độ đang bật (đặt mốc / thêm chặng), ô mũi tên bên phải mới rời sang
  `/diem-den/[slug]`. Hai phần tử anh em trong một `<li>`, KHÔNG lồng `<a>` trong `<button>`.
  Hàng đang chọn vẽ vạch bằng `shadow-[inset_2px_0_0_…]` chứ không `border-l` — border thật
  đẩy cả hàng dịch 2px.
- **Popup điểm đến = thẻ ở `/diem-den` thu nhỏ**: ảnh 3/2 + lớp phủ tối, tên trên ảnh, huy
  hiệu "Nổi bật" vuông, hàng dữ kiện, dòng "Xem điểm đến →". Popup dựng bằng `innerHTML` nên
  **chữ nghĩa nằm ở `.dl-pop*` trong `globals.css`, KHÔNG viết class Tailwind trong template
  string**.
- **Pin điểm đến VUÔNG và luôn có ẢNH** (52×36, `.dl-place-pin`): nơi chưa có ảnh bìa vẫn
  lấy `coverUrl([], slug, 240, 160)` — cùng hàm, cùng kích thước với hàng trong panel, nên
  pin và hàng của một nơi là một tấm ảnh giống hệt. Bản trước rơi về ô chữ cái nền xanh và
  vì phần lớn điểm đến chưa có ảnh bìa, mặt bản đồ đầy ô "Đ", "N", "C". Cụm gom cũng vuông,
  nền `--foreground`.

> ⚠️ **Bản đồ chỉ thấy nơi CÓ toạ độ — hiện 23, trong khi `/diem-den` có 37.** Số vắng mặt
> đều là **tỉnh** (Hà Nội, Hà Giang, Lào Cai, Quảng Ninh, Sơn La, Bình Thuận…). Cách sửa là
> **điền `lat/lng` cho tỉnh trong CMS** — nhất là tỉnh `treatAsDestination`.
>
> `getDestinationMapPoints()` lấy toạ độ theo thứ tự **`Place.lat/lng` → bảng tra
> `PLACE_COORDS` → trọng tâm listing**. Trước 2026-08-29 nó bỏ qua hẳn nấc đầu (hàm viết
> trước khi `Place.lat/lng` ra đời, chú thích trong file còn ghi "Place không có lat/lng
> riêng") — nên toạ độ biên tập tự nhập trong CMS **không** đưa được nơi đó lên bản đồ.

## Nút "Lịch trình" (nút nổi kéo thả được, ở mọi trang)

`src/components/trip/trip-dock.tsx` — nút nổi **kéo thả được** trên **mọi trang công khai**,
mở ngăn kéo "gom rồi xếp". Thân ngăn kéo là **cả lịch trình**: khối *Chưa xếp ngày* đứng
trước, rồi **từng ngày kèm mục trong nó**, cuối là *+ Thêm ngày*. Xếp/chuyển ngày, đưa về
túi, bỏ mục, đổi chuyến, mở trình soạn — nhưng **không** có giờ ước tính / cảnh báo /
kéo–thả (nhân đôi trình soạn thì hai chỗ sớm muộn lệch nhau). Dữ liệu từ `getTripBag()` (`lich-trinh/actions.ts`),
dựng ở `(site)/layout.tsx`; nút "Thêm vào lịch trình" ở các trang chi tiết báo cho nó qua
`trip-bag-events.ts`. Thiết kế đầy đủ: [`docs/lich-trinh.md`](docs/lich-trinh.md) §6f.

- **Ẩn ở** `/lich-trinh`, `/ban-do`, `/cms`, `/sale`, `/login`, `/offline` (`HIDDEN_ON`
  trong file đó). Riêng `/ban-do`: chế độ "Đo chuyến" ở đó đã là một cửa tạo lịch trình, và
  nút nổi neo giữa cạnh phải thì dưới `lg` nó đè đúng lên cụm nút ▲▼✕ của từng chặng.
- **Nút là một viên tròn 44px ở GIỮA cạnh phải** — cố ý tránh dải đáy vốn đã đông
  (`BottomNav` · `PeerBar` · `BackToTop` · `InstallPrompt`); nhờ vậy **không thanh nào phải
  chừa chỗ cho nó**. Đã thử rồi bỏ: viên chữ "Lịch trình" (chiếm chỗ vĩnh viễn trên mọi
  trang) và cho kéo thả chính cái nút (giải sai bài) — xem §6f.
- **Kéo–thả mục ngay trong ngăn kéo**, dùng chung `applyMove`/`BACKLOG`/`dayKey` của
  `trip-dnd.ts` với trình soạn. `DndContext`/`DragOverlay` phải nằm **ngoài** `DrawerContent`
  (vaul đặt `transform` lên panel ⇒ `position: fixed` bên trong lệch gốc toạ độ), và vùng
  danh sách cần `data-vaul-no-drag`.

## Tài liệu thiết kế riêng (`docs/`)

Tính năng lớn chưa làm được phân tích trước và ghi ra file riêng — **đọc file đó trước khi
động vào tính năng tương ứng**, đừng phân tích lại từ đầu.

| File | Nội dung | Trạng thái |
|---|---|---|
| [`docs/lich-trinh.md`](docs/lich-trinh.md) | **Lịch trình chuyến đi** (`/lich-trinh`): schema `Trip`/`TripDay`/`TripItem`, máy tính giờ ước tính + cảnh báo giờ mở cửa, lịch trình mẫu, chia sẻ | **ĐÃ DỰNG v1** — bản đồ mã nguồn ở §12, phần còn thiếu ở §13 |
| [`docs/lich-trinh-cong-cu-nhom.md`](docs/lich-trinh-cong-cu-nhom.md) | **Sidebar + 4 mục cho mỗi lịch trình**: ghi chú, đồ mang theo, phân công, chi phí — va chạm bố cục với cột "Chưa xếp ngày", ranh giới với §9.3 (đã bỏ ước tính chi phí) | **ĐÃ DỰNG XONG**: sidebar + route (§10) · Ghi chú (§11) · Đồ mang theo (§12) · Chi phí (§13). Mục *Phân công* đã **bỏ hẳn** — xem §9 bước 5 |
| [`docs/lich-trinh-cong-tac.md`](docs/lich-trinh-cong-tac.md) | **Nhiều người cùng sửa lịch trình**: `TripMember`, chống đụng độ bằng `Trip.version`, 14 chỗ kiểm quyền phải đổi | Phân tích xong, **chưa code** — còn 3 câu phải chốt ở §7 |

## Phạm vi hiện tại

> Cập nhật 2026-08-18. Dự án **đã vượt xa giai đoạn scaffold** — phần lớn nội dung công
> khai và CMS đã chạy thật trên Postgres (Neon). Mục này liệt kê cái ĐÃ CÓ để khỏi dựng
> lại, và cái CHƯA CÓ để biết chỗ nào còn trống.

### Đã chạy — nội dung công khai

| Mảng | Route | Ghi chú |
|---|---|---|
| Trang chủ | `/` | hero (`HeroLayout` đổi được trong CMS), điểm đến nổi bật, blog, CTA |
| Cây điểm đến | `/diem-den` · `/diem-den/[placeSlug]` · `/diem-den/[placeSlug]/[loai]` | `[loai]` = `hoat-dong` · `dia-diem` · `am-thuc` · `luu-tru` · `di-chuyen` |
| Bản đồ | `/ban-do` (toàn quốc) · `/diem-den/[placeSlug]/ban-do` | Leaflet + cluster; có chế độ **Lộ trình / Khoảng cách** (`map-explorer.tsx`) |
| Trang chi tiết | `/dia-diem/[slug]` · `/hoat-dong/[slug]` · `/luu-tru/[slug]` | Quán ăn & Đặc sản **cố ý không có** trang chi tiết (popup) |
| Danh sách phẳng | `/dia-diem` | |
| Blog | `/blog` · `/blog/[slug]` | TipTap HTML + `PostRef` + tim/bình luận |
| Tìm kiếm | `/tim-kiem` | `lib/search.ts`; header có `header-search.tsx` |
| Cộng đồng | `/cong-dong` · `/cong-dong/[slug]` · `/diem-den/[placeSlug]/cong-dong` · `/dia-diem/[slug]/cong-dong` | `Thread`/`ThreadReply`/`ThreadLike` + báo cáo. **Lối vào đang tạm ẩn** — xem "Điều hướng header" |
| Uy tín & chống lừa | `/kiem-tra` (tra SĐT/FB/web/STK) · `/sale` · `/sale/[slug]` · `/sale/dang-ky` | `SaleProfile`, `ScamReport`, `lib/trust.ts`. **Lối vào đang tạm ẩn** |
| Lịch trình | **công khai:** `/lich-trinh` (danh sách mẫu) · `/lich-trinh/[slug]` (một mẫu) — **riêng tư:** `/lich-trinh/cua-toi` · `/lich-trinh/cua-toi/[id]` (soạn) · `/lich-trinh/s/[shareId]` (chia sẻ) | `Trip`/`TripDay`/`TripItem`; nhánh `cua-toi` **bắt đăng nhập**, phần mẫu thì không. Cộng **nút "Lịch trình"** nổi ở mọi trang (xem mục riêng bên dưới). Chi tiết: [`docs/lich-trinh.md`](docs/lich-trinh.md) §4 |
| Cá nhân | `/tai-khoan/da-den` (bản đồ tỉnh đã đến) · `/thong-bao` | `CheckIn`, `Notification` |
| Khác | `/gioi-thieu` · `/offline` · `/login` | |

Kèm theo: **PWA đầy đủ** (SW, manifest, offline, mời cài) · `BottomNav` mobile · đếm lượt
xem (`ViewStat` + `/api/views/*`) · review điểm đến (`Review`) · realtime qua Ably (tùy
chọn) · PostHog (tùy chọn).

### Đã chạy — CMS `/cms` (gate `admin`/`editor`)

CRUD **đầy đủ** (list · new · edit · detail) cho: `places`, `activities`, `spots`,
`eateries`, `accommodations`, `transport`, `specialties` (đang khoá), `posts`.
Cộng thêm: `analytics` (traffic, Recharts) · `community` + `community/reports` (kiểm duyệt)
· `reviews` · `sales` · `scam-reports` · `media` · `users` · `export` (xuất Excel) ·
`settings` (`SiteSetting`) · **`lich-trinh`** (lịch trình mẫu — chỉ phần xuất bản; nội
dung từng ngày soạn ở trình soạn công khai `/lich-trinh/[id]`).

### Đã chạy — dữ liệu mẫu

**12 script seed** trong `prisma/` (chạy qua `pnpm seed:*`): `places`, `phan-thiet`,
`ta-xua`, `blog`, `blog-phan-thiet`, `community`, `sales`, `reviews-phan-thiet`,
`homestay-phan-thiet`, `homestay-ta-xua`, `trip-phan-thiet`, `trip-ta-xua`. Hai điểm đến
có dữ liệu dày nhất để thử giao diện: **Phan Thiết** (dish-led, nhiều quán) và **Tà Xùa**
(view-led).

> Hai seed lịch trình mẫu khác nhau về **độ dày**, cố ý: `trip-phan-thiet` là 3N2Đ dựa
> trên đủ cả spot/quán ăn/lưu trú; `trip-ta-xua` chỉ 2N1Đ, **6 mục, toàn spot + activity**
> — vì Tà Xùa là điểm đến *view-led* mà cả chuyến thật chỉ xoay quanh một việc (dậy trước
> bình minh xem biển mây), và vì DB hiện chưa có `Eatery` nào cho Tà Xùa còn
> `Accommodation` thì nằm ở seed riêng chưa chạy. **Đừng "làm dày" nó cho cân với Phan
> Thiết** — nhồi điểm cho đủ ba ngày là bịa ra một chuyến không ai đi.

### Chưa có — trang mới chỉ là `ComingSoon`

`/dich-vu` · `/thue-xe` · `/trai-nghiem` · `/luu-tru` (trang index — lưu ý
`/luu-tru/[slug]` thì **đã chạy**) · `/lien-he` · `/cau-hoi-thuong-gap` · `/dieu-khoan` ·
`/bao-mat`.

Ngoài ra: **`Specialty` đang tắt** (dữ liệu còn nguyên — xem mục "Đặc sản vs Quán ăn"), và
một số lối vào nav đang tạm ẩn (xem "Điều hướng header").

### Bước kế tiếp

**Lịch trình đã dựng xong v1.** Việc còn treo của nó liệt kê ở
[`docs/lich-trinh.md`](docs/lich-trinh.md) §13 — đáng làm nhất: **kéo–thả** thay cho nút
▲▼, **lưu offline**, và điền toạ độ cho 62 tỉnh còn thiếu (`pnpm backfill:place-coords`
chỉ phủ được điểm đến).
