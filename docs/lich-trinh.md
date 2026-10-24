# Lịch trình chuyến đi — thiết kế

> Tài liệu của chức năng **Lịch trình** (`/lich-trinh`). Ghi lại quyết định thiết kế **và**
> hiện trạng mã nguồn, để lần sau bám theo mà không phải phân tích lại từ đầu.
>
> Trạng thái: **ĐÃ DỰNG v1** — migration `20260818122303_trips`, 4 route công khai + 1 mục
> CMS. Bản đồ mã nguồn ở §12, phần còn thiếu ở §13.
> Cập nhật: 2026-08-18.

## 1. Định vị — cái này KHÔNG phải TripIt

Cùng logic đã dùng cho `Accommodation` (danh bạ xác minh, không phải OTA):

- ✅ **TRONG:** gom điểm quan tâm → xếp theo ngày → **kiểm tra tính khả thi** (giờ mở
  cửa, thời gian di chuyển) → chia sẻ link → lịch trình mẫu do biên tập soạn.
- ❌ **NGOÀI:** đặt chỗ/thanh toán, đồng bộ vé máy bay/email, chia tiền nhóm, chat nhóm,
  đồng chỉnh realtime.

> **Lý do tồn tại (một câu):** site biết `openingHours`, `meals`, `bestTime`,
> `durationText`, `seasonText` — nên nói được **"quán này 21:00 đã đóng mà bạn xếp
> 21:30"**. Lưu vào Google Maps không nói được. **Mọi thứ khác trong tính năng này là
> phụ.** Nếu phải cắt scope, cắt từ chỗ khác, đừng cắt phần cảnh báo khả thi.

## 2. Ba quyết định đã chốt

| Ngã rẽ | Đã chọn | Hệ quả |
|---|---|---|
| Lưu ở đâu | **DB ngay, bắt đăng nhập** | 3 bảng mới; sinh ra bài toán "đăng nhập giữa chừng" (§4) |
| Chi tiết ngày | **Thứ tự + giờ ước tính tự tính** | Không nhập giờ từng mục; cần máy tính giờ (§5) |
| Phạm vi v1 | **Đầy đủ: chia sẻ + lịch trình mẫu** | Thêm khu CMS + trang công khai có SEO |

Phương án bị loại và **lý do** (đừng quay lại mà không có lý do mới):

- *Local-first không cần đăng nhập* — rẻ hơn nhiều (0 schema, offline sẵn) nhưng không
  chia sẻ được và không có lịch trình mẫu, tức mất cả hai đòn bẩy tăng trưởng.
- *Nhập giờ cho từng mục* — chính xác nhưng ma sát cao, đa số bỏ dở giữa chừng.
- *Chỉ "danh sách đã lưu" không có ngày* — mất hẳn phần cảnh báo khả thi ⇒ mất lý do
  tồn tại ở §1.

## 3. Schema

```prisma
enum TripVisibility { private, unlisted }

model Trip {
  id        String    @id @default(cuid())
  ownerId   String                        // luôn có (template → editor sở hữu)
  title     String                        // "Hạ Long 3N2Đ"
  summary   String?                       // 1 câu — card + SEO
  startDate DateTime? @db.Date            // null = chuyến chưa định ngày
  partySize Int?                          // chỉ hiển thị, KHÔNG dùng để tính tiền

  // Chia sẻ
  shareId    String?        @unique        // nanoid, sinh khi bật chia sẻ
  visibility TripVisibility @default(private)

  // Lịch trình mẫu (biên tập soạn)
  isTemplate Boolean @default(false)
  slug       String? @unique               // CHỈ template — /lich-trinh/[slug]
  placeId    String?                       // template gắn 1 Place để hiện ở trang điểm đến

  days   TripDay[]
  items  TripItem[]
  images Image[]                           // ảnh bìa template

  ...AdminFields                           // status/publishedAt/isFeatured/order — thực chất chỉ template dùng
}

model TripDay {
  id       String  @id @default(cuid())
  tripId   String
  index    Int                             // 0-based
  startMin Int     @default(480)           // 08:00, PHÚT từ 00:00
  title    String?                         // "Ngày khám phá vịnh"
  note     String?

  @@unique([tripId, index])
}

model TripItem {
  id     String  @id @default(cuid())
  tripId String
  dayId  String?                           // null = TÚI ĐỒ (chưa xếp ngày)
  order  Int

  stayMin Int?                             // null → mặc định theo loại (§5)
  note    String?

  // exclusive arc — đúng 1 FK được set (convention của Image/PostRef)
  // KHÔNG có placeId — xem §6b
  spotId? eateryId? accommodationId? activityId?

  // hoặc mục TỰ NHẬP (chuyến bay, nhà người quen…)
  customTitle String?
  customLat   Float?
  customLng   Float?
}
```

**Bốn điểm cố ý — đừng "dọn dẹp" mất:**

1. **`startMin: Int` (phút), không phải `DateTime`.** Khớp thẳng với
   `openingStatus(intervals, now)` trong `src/lib/opening-hours.ts` — khỏi phải đổi múi
   giờ ở giữa. Cả `lib/opening-hours` đã làm việc bằng "phút từ 00:00".
2. **"Chưa xếp ngày" = `dayId` null.** Người dùng *gom trước, xếp sau*. Bắt chọn ngày ngay lúc bấm
   "thêm" là ma sát giết chết tính năng. Đây là lý do `dayId` nullable chứ không phải
   thiếu sót.
3. **Mục tự nhập là bắt buộc có ở v1.** Thiếu nó thì lịch trình luôn *dở dang* (không ghi
   được chuyến bay, nhà người quen) và bị bỏ giữa chừng.
3b. **`TripItem` KHÔNG có `placeId`** (đã bỏ, migration `20260818140623_trip_item_drop_place`)
   — xem §6b. Còn **`Trip.placeId`** thì có, mang hai nghĩa tương thích: với template là
   "gắn nơi này để hiện ở trang điểm đến", với chuyến người dùng là "nơi bấm Lên lịch
   trình đi X". Đặt lúc tạo, **không bảo trì** về sau — chỉ dùng làm gợi ý và đường quay
   lại, đừng coi là chân lý về phạm vi chuyến.
4. **Template dùng chung bảng `Trip`, chỉ khác cờ `isTemplate`.** Nhân bản = deep-copy
   Trip→Days→Items. Không tách model riêng.

Phải sửa kèm:
- `Image` thêm `tripId?` vào exclusive arc (ảnh bìa template).
- Cân nhắc `PostRef` thêm `tripId?` để blog "lịch trình gợi ý" trỏ vào bản chạy được.

## 4. URL & luồng đăng nhập

**Ranh giới là CÔNG KHAI vs RIÊNG TƯ, và nó nằm ngay trong đường dẫn:**

| Route | Ai xem | Index? |
|---|---|---|
| `/lich-trinh` | **Công khai** — danh sách lịch trình mẫu | ✅ index |
| `/lich-trinh/[slug]` | **Công khai** — một lịch trình mẫu | ✅ index, SEO chính |
| `/lich-trinh/cua-toi` | Chủ sở hữu — danh sách chuyến của tôi | noindex |
| `/lich-trinh/cua-toi/[id]` | Chủ sở hữu — **trình soạn** | noindex |
| `/lich-trinh/cua-toi/[id]/[muc]` | Chủ sở hữu — bản đồ · ghi chú · đồ · chi phí | noindex |
| `/lich-trinh/s/[shareId]` | Ai có link — **chỉ đọc** | noindex |

**Vì sao sắp lại (bản đầu để mọi thứ phẳng dưới `/lich-trinh`):** trang `/lich-trinh` khi
đó là danh sách chuyến CÁ NHÂN và `redirect("/login")` ngay dòng đầu — nên lịch trình mẫu,
thứ được dựng làm đòn bẩy SEO, lại **không có trang index công khai nào**. Khách từ Google
vào một mẫu rồi muốn xem mẫu khác thì hết đường: `/lich-trinh/mau` (không slug) trả 404, còn
`/lich-trinh` thì đá sang `/login`.

Ba cái được của cách sắp mới:

1. **Mẫu chiếm tầng một** (`/lich-trinh/[slug]`) — URL ngắn nhất cho thứ cần SEO nhất, và
   `/lich-trinh` thành trang công khai đúng như người gõ địa chỉ mong đợi.
2. **Cả nhánh riêng tư gom vào MỘT tiền tố** `/lich-trinh/cua-toi` ⇒ `sw.js` chặn cache bằng
   đúng một dòng `NEVER_CACHE`, và **xoá được hẳn `CACHE_ANYWAY`** — danh sách allowlist
   từng phải dựng chỉ để gỡ mẫu + bản chia sẻ ra khỏi lệnh cấm của tiền tố `/lich-trinh`.
   (Nhớ **tăng `VERSION`** trong `sw.js` — đã lên `v3`.)
3. **`revalidatePath` không còn mập mờ:** trước đây `"/lich-trinh"` vừa là danh sách cá nhân
   vừa là nơi mẫu xuất hiện; nay `/lich-trinh/cua-toi` là của người dùng (7 chỗ trong
   `actions.ts`), `/lich-trinh` là của biên tập (CMS).

**Chuyển hướng VĨNH VIỄN cho URL cũ** — link mẫu đã nằm trong sitemap gửi Google, và link
trình soạn đã nằm trong email mời:

| Cũ | Mới | Ở đâu |
|---|---|---|
| `/lich-trinh/mau` | `/lich-trinh` | `next.config.ts` → `redirects()` |
| `/lich-trinh/mau/[slug]` | `/lich-trinh/[slug]` | `next.config.ts` |
| `/lich-trinh/[id]` (cuid) | `/lich-trinh/cua-toi/[id]` | trong `[slug]/page.tsx` — không phân biệt được ở tầng config, nên khi không tìm thấy mẫu thì tra tiếp `Trip.id` rồi mới `notFound()` |

- `lich-trinh` nằm trong **danh sách tiền tố dành riêng** (`RESERVED_SLUGS`).
- ⚠️ Slug mẫu ở tầng một nên **`cua-toi` · `s` · `mau` là từ khoá dành riêng của riêng nó**
  (`RESERVED_TRIP_SLUGS` trong `lib/slug.ts`, kiểm trong `cms/lich-trinh/actions.ts`). Next
  ưu tiên đoạn tĩnh nên không có chuyện tranh nhau, nhưng một mẫu lỡ mang slug đó thì vĩnh
  viễn không ai mở được.

### Bấm "Thêm vào lịch trình" khi chưa đăng nhập

Vì đã chốt bắt đăng nhập, nút này là một **bức tường**. Văng sang `/login` rồi quay về
trang chủ trắng trơn = tính năng chết ngay tại đây. Bắt buộc:

1. Bấm khi chưa đăng nhập → **dialog nhỏ tại chỗ** ("Đăng nhập để lưu vào lịch trình" +
   nút Google), **không** điều hướng thẳng.
2. Ghi ý định vào `sessionStorage`: `{ type, id }` + `callbackUrl` về **đúng trang cũ**.
3. Quay về → **tự thêm** + toast "Đã thêm vào «tên chuyến» · Xem lịch trình".

### "Chuyến đang lên lịch trình"

Có nhiều chuyến thì mỗi lần bấm lại hỏi "chuyến nào" là quá phiền. Giải: một người có
nhiều chuyến nhưng tại một thời điểm chỉ **đang lên lịch cho MỘT chuyến**, lưu id chuyến
đó trong **cookie** (`halivivu_trip`); bấm Thêm là vào thẳng danh sách chưa xếp ngày của nó.

> ⚠️ **Đừng gọi là "chuyến đang mở".** "Đang mở" trong sản phẩm này đã mang nghĩa **quán
> còn mở cửa** (`lib/opening-hours`, huy hiệu + chip lọc ở màn hình Ẩm thực). Hai nghĩa
> khác nhau cùng một chữ thì người đọc phải đoán theo ngữ cảnh.

**Ba cách nó đổi** — thiếu cách nào thì người dùng cũng bị "thêm vào đâu không biết":

1. **Mở trình soạn** `/lich-trinh/[id]` ⇒ chuyển sang lên lịch cho chuyến đó
   (`markTripPlanning` qua `TripPlanningSync`). Hợp lý vì trang đó là chỗ *sửa*, không
   phải chỗ *xem*. Cố ý **không** `revalidatePath` — nếu không trang tự làm mới ngay khi
   vừa mở.
2. **Đặt tay** từ menu "…" trên thẻ ở `/lich-trinh` → *"Lên lịch trình cho chuyến này"*
   (`setPlanningTrip`, có revalidate để nhãn trên thẻ đổi ngay).
3. **Đổi ngay lúc vừa thêm**: toast sau khi thêm có nút **"Đổi chuyến"** (chỉ hiện khi có
   ≥2 chuyến) → chọn chuyến → `moveItemToTrip` chuyển mục sang chuyến đó **và**
   chuyển luôn chuyến đang lên lịch. Đây là khoảnh khắc DUY NHẤT người dùng nhìn thấy
   mình đang lên lịch cho chuyến nào, nên phải sửa được ngay tại đó.

Chưa có chuyến nào → tự tạo "Chuyến đi của tôi" (không hỏi tên: hỏi tên đúng lúc người ta
mới chỉ muốn lưu một quán là ma sát vô ích).

## 5. Máy tính giờ ước tính (phần lõi)

```
t = day.startMin
cho từng item theo order:
  arrive = t
  status = openingStatus(parseOpeningHours(item.openingHours), arrive)
  t += stayMin ?? mặc định theo loại
  t += driveMin(item → item kế tiếp)        // ORS matrix, đã cache 30 ngày
```

`stayMin` mặc định: **quán ăn 60′** · **địa điểm 90′** · **hoạt động** ← đọc số từ
`durationText`, không ra thì 120′ · **lưu trú 0′** (mốc nhận phòng / kết thúc ngày).

> ✅ **Tin tốt:** `openingStatus(intervals, now)` trong `src/lib/opening-hours.ts` đã nhận
> **mốc phút bất kỳ**, không phải "bây giờ" — dùng lại nguyên si cho giờ dự kiến, không
> phải sửa gì, và là hàm thuần nên chạy được cả ở server. Chỉ `vietnamMinutesNow()` mới
> gắn với thời điểm hiện tại.

Cảnh báo hiển thị **ngay trên từng mục** (không chôn trong panel riêng):

| Mức | Điều kiện | Ví dụ hiển thị |
|---|---|---|
| 🔴 | `closed` / `opensLater` tại giờ dự kiến | "Chưa mở lúc 8:30 · mở 16:00" |
| 🟠 | `closingSoon` | "Chỉ còn 40 phút trước giờ đóng" |
| 🟠 | Chặng lái > 90′ giữa hai mục liên tiếp | "Chặng dài 1 giờ 50" |
| 🟠 | Ngày kết thúc sau 22:00 hoặc tổng > 12 tiếng | "Ngày này hơi dày" |
| ⚪ | Mục thiếu toạ độ | "Không ước tính được đường đi" |

Có thể thêm sau: `Eatery.meals[]` không khớp bữa tại giờ dự kiến (cảnh báo nhẹ).

**Hiệu năng:** fetch **một ma trận thời gian cho cả ngày** rồi tính lại giờ **ở client**
khi kéo thả. Đừng gọi lại API mỗi lần đổi thứ tự.

## 6. Bố cục — HAI CỘT TRONG MỘT CONTAINER, BẢN ĐỒ LÀ MỘT MỤC

Dùng chung cho **cả ba** trang (soạn · bản chia sẻ · lịch trình mẫu) qua
`components/trip/trip-shell.tsx`. Ba trang là anh em — người dùng bấm "Dùng lịch trình
này" là đi thẳng từ trang mẫu sang trang soạn, nên khung lệch nhau lộ ngay.

```
MỤC "LỊCH TRÌNH"                        MỤC "BẢN ĐỒ"
┌ header: tên · ngày đi · số người ───┐  ┌────────────┬──────────────────────┐
├──────────┬──────────────────────────┤  │ Lịch trình │ [Ngày1][Ngày2 ●]     │
│ Lịch trình●│ [Ngày1][Ngày2 ●] 👁 Hiển│  │ Bản đồ   ● │ ┌──────────────────┐ │
│ Bản đồ   │ Ngày 2  T7 12/9 🌅4:30 → │  │ Ghi chú    │ │   ②────①         │ │
│ Ghi chú  │  ① 4:30  Đồi cát bay     │  │ Đồ mang theo│ │    │   ○ ← chấm mờ│ │
│ Đồ mang  │     ↓ 12 phút di chuyển  │  │ Chi phí    │ │   ③              │ │
│ Chi phí  │  ② 6:00  Bàu Trắng       │  │            │ └──────────────────┘ │
│          │                          │  └────────────┴──────────────────────┘
│ Chưa xếp4│  (cột đọc, max-w-3xl)    │      bản đồ chiếm TRỌN cột giữa
│ □ Hòn Rơm│                          │
└──────────┴──────────────────────────┘
  13rem · thu gọn được thành thanh 2.5rem
```

- **Cả khung nằm trong container `max-w-7xl`** (`SHELL` ở `trip-shell.tsx`). Bản tràn viền
  đã bỏ: trên màn hình rộng nó kéo bản đồ ra tới mép phải trong khi cột chữ đứng lệch hẳn
  về trái, và không trang nào khác của site làm vậy. Header nằm TRONG container luôn — kể
  cả header ảnh của trang mẫu/bản chia sẻ — để mép ảnh thẳng hàng với ba cột ngay dưới.
- ⚠️ **Ngăn vùng bằng NỀN, ngăn hàng bằng NÉT — và chỉ thế.** Hai bản đã sai về hai phía,
  ghi lại để khỏi đi lại:
  ① Bản tràn viền kẻ nét ở mọi mép (khung · đáy header · `border-r` cột trái · `border-l`
  cột phải · thanh chọn khung nhìn · mỗi ngày · mỗi hàng chưa xếp). Hồi tràn viền những nét
  đó còn là mép màn hình; vào container chúng thành một cái lưới bảng tính.
  ② Bản gỡ sạch nét thì cột trái hoá ra một dải chữ trôi cạnh cột giữa, và các ngày chỉ còn
  cách nhau bằng khoảng trắng nên đọc thành một mạch dài.
  ✅ Cách đang dùng:
  · **Cột trái và bảng công cụ là KHỐI NỀN** `rounded-[6px] bg-muted/40` (hằng `PANEL`), ôm
    sát nội dung bằng `lg:self-start` — kéo dài 100dvh thì ở mấy mục chỉ có 5 hàng nav nó
    đọc ra như trang lỗi. Cột rộng **14rem**: 13rem không đủ cho ảnh + tên + hai nút.
  · **Mục chưa xếp ngày là HÀNG THƯỜNG trên nền bảng** (ảnh 40px · tên tối đa 2 dòng · nút
    "xếp vào ngày" neo mép phải), ngăn nhau bằng `divide-y`. Bản "mỗi mục một ô TRẮNG" đã bỏ:
    ⚠️ `ul` để `grid` thì mỗi ô mặc định `min-width: auto` nên hàng KHÔNG co được — ô nền
    tràn khỏi mép bảng và mỗi hàng thò ra một kiểu. Danh sách thường + nét ngăn vừa hết lỗi
    vừa canh thẳng hàng với tiêu đề khối.
  · Dưới `lg`, dải mục trong cột trái **ẩn đi** — viên chọn mục trên header đã làm đúng việc
    đó rồi.
  · **Bản đồ** là khối `R_CARD` + `overflow-hidden`.
  · Nét chỉ còn **ba chỗ có việc**: đáy header trang, đáy dải chọn ngày (thanh dính thì phải
    có mép — cùng khuôn `PlaceTabs`), và nét ngăn **giữa hai ngày**. Cộng thêm gạch chân mục
    đang chọn, nét ngăn giữa các HÀNG trong danh sách, viền của thứ bấm được, và khung nét
    đứt của ô rỗng.
  · Mọi mục đều bó cột giữa `lg:max-w-3xl` — kể cả dòng thời gian. Không bó thì tên mục
    nằm mép trái còn giờ kết thúc ngày văng sang mép phải cách đó gần 700px.
- **Icon lấy từ `components/site/glyphs.tsx`** (SVG tự vẽ, khung 24 nét 1.8) chứ không phải
  `@/components/icons` (Material) — xem `CLAUDE.md` §3. Bộ glyph được bổ sung cho phần này:
  `note` · `bag` · `people` · `mountain` · `compass` · `more` · `info` · `grip` · `trash`.
  `TripSection.glyph` giữ **tên glyph** (chuỗi), không giữ component icon.
- **"Chưa xếp ngày" là cột trái HẸP (14rem) và THU GỌN ĐƯỢC** thành thanh dọc 2.75rem
  (icon + số đếm). Bốn lần thử, ghi lại để khỏi lặp:
  1. Khối gập dưới đáy cột lịch trình → phải cuộn qua hết mọi ngày mới tới.
  2. Cột rộng 19rem → thấy suốt, nhưng ăn bề ngang của **cả hai** cột kia.
  3. Thẻ nổi trên bản đồ → **SAI VỀ Ý NGHĨA**: đây là *hàng chờ để xếp việc*, thuộc miền
     LẬP KẾ HOẠCH chứ không phải miền địa lý — mà nó còn che đúng thứ bản đồ sinh ra để
     hiện. Lý lẽ "đổi lại được chấm mờ" là ngụy biện: **chấm mờ không cần danh sách phải
     nằm trên bản đồ.**
  4. ✅ Cột hẹp thu gọn được → đúng miền, luôn thấy, và trả lại bề ngang khi cần.
- **Chấm mờ thì Ở LẠI bản đồ** (`.dl-trip-ghost` — vòng tròn rỗng viền đứt): mục chưa xếp
  **có toạ độ** hiện lên để thấy "Hòn Rơm nằm ngay cạnh tuyến Ngày 2" — thứ danh sách không
  nói được, và đúng là việc của bản đồ. Vẽ **trước** pin đánh số để luôn nằm dưới, và
  **không** tính vào `fitBounds`: khung nhìn phải bám tuyến của ngày, không để một mục ở xa
  kéo cho zoom out.
  ⚠️ Đây là HAI thứ khác nhau — danh sách ở miền lập kế hoạch, chấm ở miền địa lý. Đừng gộp.
- **Ngày đang được bản đồ vẽ** đánh dấu bằng một **vạch cam NGẮN** ngang tầm tiêu đề, nằm
  trong lề trái. Bản trước là `border-l-2` chạy **hết chiều cao** khối ngày: mảng màu đậm
  nhất màn hình, trong khi nó chỉ nhắc lại điều dải chọn ngày (dính trên đầu, luôn thấy) đã
  nói bằng chữ cam + gạch chân — và vì dán sát mép cột trái, nó đọc ra như đường viền của
  sidebar chứ không phải dấu của ngày. Cùng màn hình đã có ba chỗ cam (dải ngày · dấu ngày ·
  mục đang mở ở sidebar) nên chỗ nào cũng phải nhẹ hết mức còn đọc được.
- **Dải chọn ngày** (`trip-day-strip.tsx`) quyết định bản đồ vẽ ngày nào, và bấm thì cuộn
  tới ngày đó. Bản trước chọn ngày bằng cách bắt `mousedown` lên khối ngày: không nhìn
  thấy được, không dùng bàn phím được, và trên điện thoại chạm để cuộn cũng đổi ngày.
  Viên ngày có **chấm đỏ** khi ngày đó có mục chưa mở cửa.
- **Các ngày render HẾT** ở cột giữa, không phải một-ngày-một-lần: chuyến nhiều ngày thì
  phải nhìn toàn cảnh mới xếp được. Dải chỉ lo phần "bản đồ đang vẽ ngày nào".
- **Bản đồ là MỘT MỤC riêng** (`/lich-trinh/cua-toi/[id]/ban-do`, token `ban-do` trong
  `lib/trip-sections.ts`), không còn là cột phải. Trong container `max-w-7xl`, cột phải chỉ
  còn ~400px — hẹp hơn cả bản điện thoại và không đọc nổi tuyến; thành mục riêng thì bản đồ
  lấy trọn cột giữa (~1040px × 830px ở 1280). Đổi lại: không vừa xếp vừa nhìn tuyến được
  nữa, bù bằng dải chọn ngày đặt ngay trên bản đồ.
  · ⚠️ **Bản đồ phải dựng CÓ ĐIỀU KIỆN** (`{tab === "ban-do" && …}`), đừng nhét sẵn vào một
    `div` `hidden` như mấy mục kia: Leaflet đo khung lúc khởi tạo, nằm trong `display:none`
    thì nó dựng ở 0×0 rồi giữ nguyên kích thước đó khi hiện ra.
  · Trang mẫu / bản chia sẻ (`trip-view.tsx`) **vẫn dùng cột bản đồ** — chúng không có dải
    mục để chứa một màn riêng. Prop `map` của `TripShell` giữ lại cho hai trang đó.
- **Bản đồ chỉ vẽ MỘT ngày.** Vẽ cả chuyến 4 ngày thành mớ bòng bong.
- **Dưới `lg`**: ba cột không nhét vừa → **ba phần chia đều cả bề ngang**
  (Lịch trình · Chưa xếp ngày · Bản đồ). Không có chuyện thu gọn ở khổ này — ở đó nó là một
  khung nhìn riêng, luôn đầy đủ.
- Trang chỉ-đọc dùng cột trái làm **"Gợi ý thêm"** — chính là mục chưa xếp ngày của mẫu. Bản trước
  **không hiện nó ở đâu cả**, nên 4 gợi ý của mẫu Phan Thiết vô hình với người đọc.
- ⚠️ **Nút "Thêm vào lịch trình" vẫn CHỈ ở trang chi tiết + popup**, chưa vào lưới thẻ.
  Lý do: thẻ lưu trú đã qua ba vòng cắt gọt và **đã bỏ NĂM bản nút luôn-hiện** (xem
  `CLAUDE.md` §Nơi lưu trú). Lưới là lúc *so sánh*, chưa phải lúc *chọn*.
- Dòng chặng dùng icon **xe**, không dùng `Navigation`: hình tam giác của nó ở cỡ nhỏ,
  đứng cạnh chữ, đọc nhầm thành dấu cảnh báo.

## 6a. Ngôn ngữ thị giác — vì sao bản đầu trông như "AI slop"

Bản đầu chạy đúng nhưng nhìn như một trang quản trị dán vào site du lịch. Nguyên nhân
không phải "thiếu đẹp" mà là **không dùng ngôn ngữ vốn có của dự án**. Sáu lỗi và cách sửa:

| Lỗi ở bản đầu | Vì sao sai | Đã sửa thành |
|---|---|---|
| Dải `from-sky-100/70 to-background` làm header cả ba trang | Không nói gì, chỉ tô màu — dán vào trang nào cũng vừa | Trang công khai: **ảnh bìa tràn viền + tên bằng font display**. Trang soạn: bỏ hẳn nền, phân cấp bằng **chữ** (eyebrow micro + tên bằng font display + dữ kiện ngăn bằng khoảng trắng) |
| Ngày = thẻ bo góc có viền + bóng; trong đó mỗi mục lại là một ô | Bốn tầng hộp lồng nhau, không tầng nào thêm nghĩa. `CLAUDE.md` đã chốt ở popup Quán ăn: **"chỉ thẻ BẤM ĐƯỢC mới có viền"** | Ngày ngăn nhau bằng **hairline + khoảng trống**; mục không có hộp. Hình khối duy nhất còn lại là **ảnh nhỏ** |
| Dòng thời gian không phải dòng thời gian: ô giờ, chấm số, thẻ, rồi một vạch dọc cụt cho chặng đi | Không có gì nối các mốc lại; chặng đi đứng ngang hàng với điểm dừng dù nó là *khoảng cách giữa* hai điểm | **Một đường 1px chạy suốt**, mốc giờ treo trên đó, chữ chặng đi nằm **trên ray** giữa hai mốc |
| Dải chọn ngày = viên bo góc có viền; chuyển khung nhìn mobile = segmented pill | `place-tabs.tsx` ghi rõ: *"Đã thử và bỏ: viên nền cho mục đang mở (thành mấy mảng màu xếp ngang, giống thanh bộ lọc của app thương mại điện tử)"* — tôi dựng lại đúng thứ đã bị bỏ | **Chữ + gạch chân cam** (dải ngày) và **icon tô cam + chữ đậm** (chuyển khung nhìn) |
| Cùng một viên `bg-primary/10` đếm số lặp 3 lần một màn | Nhịp lặp máy móc, không phân cấp | Số trần, `tabular-nums`, màu phụ |
| Giờ đặt `text-sm` xám như mọi meta khác | Giờ là **dữ liệu quan trọng nhất** của trang | Giờ thành **cột sống typographic**: `tabular-nums`, đậm, màu foreground, canh phải |

**Đầu mỗi ngày — chữ LỚN NHẤT luôn là danh tính của ngày** (`DayHeading`):

| Ngày | Bố cục |
|---|---|
| **Có tên** (lịch trình mẫu) | nhãn micro cam `NGÀY 1 · T7 12/9` → tên ngày bằng font display |
| **Không tên** (chuyến tự soạn) | **"Ngày 1" bằng font display**, ngày tháng đứng cạnh ở cỡ nhỏ |

Sau khi tên ngày thành riêng-của-mẫu (§6d), nhánh "không tên" bị bỏ lại với mỗi cái nhãn
micro `0.66rem` gánh cả danh tính của ngày — teo lại thành một dòng chữ hoa tí xíu, không
ra tiêu đề cũng không ra nhãn. Quy tắc trên sửa đúng chỗ đó.

**Mỗi dữ kiện chỉ hiện ở MỘT nơi** — dải chọn ngày dính nên nó và tiêu đề ngày luôn cùng
xuất hiện, trùng nhau là rối ngay:

| Nơi | Hiện gì | Vì sao |
|---|---|---|
| Dải chọn ngày | **chỉ** `NGÀY 2` | Dải là thanh điều hướng, không phải chỗ báo cáo. Đã thử thêm ngày tháng rồi số mục, cả hai đều trùng hoặc tranh chỗ với tiêu đề ngày ngay bên dưới |
| Tiêu đề ngày | tên/số ngày + **ngày tháng** | Ngày tháng thuộc về chính ngày đang đọc, và luôn đúng kể cả khi cuộn qua nhiều ngày mà chưa bấm chọn |
| Ô giờ (trình soạn) | `🌅 14:00 → 19:51` | Bắt đầu (sửa được) và kết thúc (tính ra) gộp làm MỘT câu |

Bản trước hiện ngày tháng ở cả hai nơi, và để `14:00 – 19:51` ngay cạnh ô chọn đang để
`14:00` — cùng một con số xuất hiện hai lần, một chỗ sửa được một chỗ không, nhìn không ra
là hai thứ hay một thứ.

## 6b. Trang điểm đến: "Lên lịch trình đi X", KHÔNG phải "Thêm vào lịch trình"

**Một `Place` là NƠI CHỨA các điểm dừng, không phải một điểm dừng.** Bản đầu tôi làm sai —
đặt nút "Thêm vào lịch trình" lên hero điểm đến, tạo ra `TripItem` kiểu place. Nó hỏng ở
bốn chỗ cùng lúc:

| Thứ | Khi Place là một mục | Vấn đề |
|---|---|---|
| `stayMin` mặc định | 120 phút | "Ở lại Phan Thiết 2 tiếng"? Đó là nơi ở 3 ngày |
| Toạ độ | trọng tâm các listing | "12 phút tới Phan Thiết" = đo tới một điểm trung bình không có thật |
| `openingHours` | không có | Không đóng góp gì cho hệ cảnh báo — *lý do tồn tại* của tính năng |
| Bản đồ | pin đánh số | "Phan Thiết" ngang vai với "Bánh căn Cây Phượng" |

**Quy tắc:** có toạ độ thật + có thời lượng ⇒ là mục. Là nơi chứa ⇒ không phải mục.
Địa điểm · Quán ăn · Nơi ở · Hoạt động giữ nút "Thêm vào lịch trình"; chỉ Điểm đến/Tỉnh đổi.

**Cái được lớn hơn: trang điểm đến thành CỬA TRƯỚC của cả tính năng.** Trước đó không có
cửa vào — muốn thêm gì cũng phải đã có chuyến, hoặc để hệ thống lặng lẽ tự tạo (chính vì
vậy mới phải vá bằng nút "Đổi chuyến" trong toast). Nay:

```
Trang điểm đến → tạo/tiếp tục chuyến → đặt làm CHUYẾN ĐANG LÊN LỊCH TRÌNH → trình soạn
                                              ↓
        từ đó lướt Địa điểm/Quán ăn/Lưu trú, bấm "Thêm" là rơi đúng chuyến
```

Ngữ cảnh được đặt **trước** khi gom, thay vì đoán **sau** khi gom.

**Ba chi tiết bắt buộc** (thiếu cái nào cũng hỏng):

1. **Không đẻ chuyến trùng.** `getPlanOptions` tra "chuyến của tôi có liên quan tới nơi
   này" bằng **nội dung** (`items.some.spot.placeId` …) chứ không chỉ `Trip.placeId` —
   chuyến vẫn là chuyến Phan Thiết chừng nào còn mục Phan Thiết. Phạm vi gồm **cả điểm
   đến con**: đứng ở trang tỉnh Bình Thuận mà đã có chuyến Phan Thiết thì phải nhận ra.
2. **Không thả vào trang trắng.** Có chuyến cũ hoặc có lịch trình mẫu → mở hộp chọn
   [Tiếp tục chuyến đang có] / [Bắt đầu từ mẫu] / [Tạo chuyến mới]. Không có gì để chọn →
   tạo thẳng, khỏi bắt bấm thêm lần nữa. Và cột Chưa xếp ngày khi rỗng **link ngược về
   đúng điểm đến đó** ("Xem địa điểm ở Phan Thiết →"), không nói chung chung.
3. **Chỗ đặt.** CTA cam nằm ở **THÂN hero**, dưới deck, canh giữa — KHÔNG nhét vào thanh
   hành động trên cùng: thanh đó cố ý chỉ có đường 1px và chữ, thêm một nút nền đặc vào
   góc là nó hút mắt hơn cả tên điểm đến (ghi chú này có sẵn trong `place-hero-center.tsx`).
   Đây cũng là CTA cam **duy nhất** của trang, đúng quy ước của skill design.

> Nếu sau này cần chuyến nhiều điểm đến ("3 ngày Phan Thiết, 3 ngày Đà Lạt"), chỗ đúng là
> **`TripDay.placeId`** — một *nhãn cấp ngày* — chứ không phải hồi sinh `TripItem.placeId`.

**Cửa thứ hai: bản đồ toàn quốc.** `/ban-do` chế độ *Đo chuyến* cho xếp nhiều điểm đến theo
thứ tự (đo km/giờ lái từng chặng bằng OSRM) rồi bấm "Tạo lịch trình N ngày" →
`startTripFromRoute(slugs)`: **mỗi nơi một NGÀY**, đúng thứ tự đã xếp, `Trip.placeId` =
nơi đầu, rồi đặt làm chuyến đang lên lịch trình như luồng §6b. Đây chính là ca "chuyến
nhiều điểm đến" nói ở trên: nhãn nơi hiện ghi tạm ở **`TripDay.title`** (không cần
migration); khi nào trình soạn cần LÀM GÌ ĐÓ với liên kết đó — đếm mục theo nơi, link ngược
"Xem địa điểm ở Sa Pa →" cho từng ngày — thì nâng lên **`TripDay.placeId`**, và chỗ phải
sửa là đúng dòng `days: { create: … }` trong `startTripFromRoute`.

Cố ý **một ngày một nơi**: đó là khung khởi đầu, không phải phán quyết. Thêm/bớt ngày là
việc của trình soạn, còn đoán hộ "Sa Pa 2 ngày, Hà Giang 3 ngày" thì sai nhiều hơn đúng.

## 6c. Kéo–thả

`@dnd-kit` (core + sortable + utilities). Bài toán là **sortable nhiều vùng chứa**: cột Chưa xếp ngày
và mỗi ngày là một vùng; kéo được cả trong một vùng lẫn giữa các vùng.

### Tay cầm & cho khách BIẾT là kéo được

Bản đầu chỉ lấy **nút tròn đánh số** làm tay cầm, không kèm dấu hiệu nào: máy tính chỉ đổi
con trỏ khi rê trúng, còn cảm ứng thì **không có tín hiệu gì**. Tối giản đến mức **giấu mất
tính năng** thì không phải tối giản. Hiện tại:

- **Nút grip nhìn thấy được** (glyph `grip` ở `components/site/glyphs.tsx` — sáu chấm) là tay
  cầm chính, và là tay cầm cho **bàn phím** (nhận `attributes` + `listeners`). Hiện theo luật
  của hàng nút thao tác: rê chuột / tab tới mới hiện, máy cảm ứng thì luôn hiện.
  ⚠️ Đừng thay bằng `ChevronsUpDown` — trong codebase này nó là icon của combobox.
- **Tay cầm phụ**: nút tròn đánh số (dòng thời gian) và ảnh nhỏ (cột Chưa xếp ngày), chỉ
  nhận `listeners` — không nhận `attributes` để bàn phím chỉ gặp MỘT tab stop.
- **`draggable={false}`** cho link tên mục và ảnh: kéo gốc của trình duyệt trên `<a>`/`<img>`
  sẽ chiếm mất thao tác và hiện ảnh ma.

**Đã thử và BỎ hai thứ — đừng làm lại:**
- **Dòng chữ chỉ dẫn** ("Kéo để đổi thứ tự — thả sang ngày khác…"): chữ thừa nằm vĩnh viễn
  trên đầu cột khi đã có grip.
- **Cho kéo CẢ HÀNG** (gắn `listeners` lên `<li>`): nghe tiện nhưng nuốt luôn thao tác bôi
  đen chữ (phải thêm `select-none`), và trên cảm ứng thì cả vùng nội dung thành vùng kéo nên
  rất dễ vướng với cuộn trang.

Nút tròn đánh số vẫn nới vùng chạm ~38px bằng `before:-inset-2` (nó nằm trong hàng nên cũng kéo được).
- **Ba sensor, mỗi cái một lý do:** chuột phải rê **6px** mới tính là kéo (không thì mọi cú
  bấm vào nút tròn bị nuốt); cảm ứng phải **giữ 220ms** (dưới ngưỡng đó vẫn là vuốt để CUỘN
  — thiếu cái này thì không cuộn nổi danh sách trên điện thoại); bàn phím dùng
  `sortableKeyboardCoordinates` (space → mũi tên → space).
- **Trạng thái là danh sách ID theo vùng** (`trip-dnd.ts`), không phải mảng object. Đổi chỗ
  chỉ là hoán vị id.
- **Phải giữ bản cục bộ.** Mọi thao tác đều là server action rồi revalidate, tức props chỉ
  đổi sau một vòng mạng; không có bản cục bộ thì mục vừa thả nhảy về chỗ cũ rồi mới nhảy
  tới chỗ mới. Bản cục bộ chỉ nhận lại từ server khi **không đang kéo** và khi chữ ký danh
  sách thật sự đổi.
- **Giờ trong lúc chờ:** mục vừa kéo sang chưa có giờ → hiện `···`; cả cột giờ mờ đi
  khi đang chờ server tính lại. Thà nói "chưa biết" còn hơn hiện một con số sai.
- `onDragOver` chỉ xử lý **đổi vùng**; đổi chỗ trong cùng vùng để dành lúc thả, gọi ở đó sẽ
  làm danh sách rung liên tục theo con trỏ.
- Bỏ nút **▲▼** — kéo–thả và bàn phím đã thay được, menu "…" vẫn còn "Chuyển sang ngày X /
  Chưa xếp ngày" cho những lần dời xa.

> ⚠️ **`applyMove` có một cái bẫy đã sập một lần.** Khi kéo **trong cùng một vùng**, chỉ số
> đích phải tính trên danh sách **GỐC**, trước khi gỡ mục ra — tính sau thì mọi lần kéo
> XUỐNG đều lệch một chỗ (kéo `a` xuống chỗ `c` ra `[b,a,c]` thay vì `[b,c,a]`). Lỗi này
> không lộ qua typecheck và không thấy được bằng ảnh chụp.
> **`pnpm check:trip-dnd`** giữ 9 trường hợp cho chỗ này — chạy lại mỗi khi động vào.

### 6c-a. Vì sao mỗi lần thả từng "mờ đi một lúc" — và ba chỗ đã chữa

Triệu chứng: thả xong, thứ tự đổi ngay nhưng cột giờ xám lại chừng một giây rồi mới có số.
Đo bằng script (`getTripById`, transaction viết lại thứ tự, và mạng) cho ra thủ phạm **không
phải cơ sở dữ liệu**:

| Nghi phạm | Đo được | Kết luận |
|---|---|---|
| Viết lại thứ tự cả một ngày 8 mục | **~24ms** (Postgres localhost, ping 1ms) | Không phải nguyên nhân ở dev — nhưng là 8+ vòng mạng nối đuôi nếu CSDL đặt xa |
| `getTripById` + 3 truy vấn của ba mục kia | ~32ms + ~6ms | Không đáng kể |
| **Một lời gọi ORS chưa có trong cache** | **~0,8s** (riêng bắt tay TLS đã ~0,6s) | ⇒ đây |

Mấu chốt: **khoá cache của ORS là CẶP TOẠ ĐỘ**, mà mỗi lần đổi thứ tự là sinh ra những cặp
liền kề mới. Nên gần như lần kéo–thả nào cũng ăn ít nhất một lời gọi HTTPS thật ra ngoài
Internet, **ngay giữa lúc render lại trang** — và render đó chặn cho tới khi ORS trả lời.

Ba chỗ đã sửa:

1. **Ngân sách chờ định tuyến 300ms** (`ROUTE_BUDGET_MS`, `src/lib/trip-route.ts`). Quá hạn
   thì dựng lịch bằng ước lượng chim bay — vốn đã có sẵn và được đánh dấu `approx` nên UI
   hiện dấu `~`. Lời gọi bị bỏ dở giao cho **`after()`** nuôi tiếp tới khi ghi xong vào
   `unstable_cache`.
   > ⚠ `after()` là phần **bắt buộc**, không phải tối ưu thêm. Trên serverless, hàm bị đóng
   > băng ngay khi trả response: bỏ mặc promise thì lời gọi chết nửa chừng, cache không bao
   > giờ được nạp, mọi lần dựng sau lại hết hạn ở đúng mốc 300ms — số chính xác sẽ **không
   > bao giờ** xuất hiện.
   > Và `.catch` phải gắn **ngay trên promise gốc**, trước khi đua với đồng hồ: nếu nó lỗi
   > sau khi đã quá hạn thì không còn ai `await`, mà một rejection không người nhận là đủ để
   > hạ tiến trình Node.

2. **Một câu lệnh đánh số lại cả vùng** thay cho vòng lặp `update` từng mục (`moveItem`):
   `UPDATE "TripItem" … FROM (VALUES …)`. 24ms → 5ms tại chỗ, và quan trọng hơn là 8+ vòng
   mạng → 1 khi CSDL đặt xa.

3. **Làm mờ cột giờ có mục tiêu và có độ trễ** (`trip-editor.tsx`). Bản trước truyền
   `stale={pending}` cho **mọi** ngày nên cả trang xám giờ đi một nhịp, kể cả ngày không
   liên quan và kể cả khi server trả về sau 80ms. Nay chỉ **ngày nguồn + ngày đích**, và chỉ
   khi chờ **quá 350ms** (`useDelayedFlag`) — dưới ngưỡng đó không ai kịp thấy, mà chính cái
   nháy mới làm giao diện có cảm giác chậm.

**Chưa làm, nếu vẫn thấy chậm thì đây là bước tiếp:** tính lịch **lạc quan ở client** — dùng
lại chính `scheduleDay` (hàm thuần trong `lib/trip-time`) với các chặng đã biết, chặng mới
thì ước lượng chim bay và đánh dấu `~`, rồi để số chính xác của server thay thế khi về. Khi
đó cột giờ không bao giờ phải chờ. Đổi lại là hai nơi cùng gọi máy tính giờ — chấp nhận được
vì **dùng chung một hàm**, khác với việc nuôi hai bản cài đặt (điều §6 đã cố ý tránh).

## 6d. Sửa tại chỗ (ghi chú) & ranh giới mẫu / chuyến cá nhân

`TripItem.note` **sửa được ngay trên trang soạn** qua `InlineEdit` — trước đó nó chỉ có ở
schema và ở trang chỉ-đọc.

> ⚠️ **`TripDay.title` và `TripDay.note` CHỈ dành cho lịch trình mẫu** (`isTemplate`).
>
> Đó là **giọng biên tập** ("Về tới biển", "Bình minh đồi cát & Bàu Trắng", kèm câu dẫn từng
> ngày) — thứ làm trang mẫu đọc ra như một bài hướng dẫn có người viết thay vì một bảng dữ
> liệu, và là phần gánh SEO ở §7. Nhưng người **tự soạn** gần như không bao giờ đặt tên cho
> ngày, mà để ô trống ở đó thì mỗi ngày cõng **~60px không khí** — ẩn bằng `opacity` KHÔNG
> gỡ khỏi bố cục.
>
> **Kéo theo: `cloneTrip` KHÔNG chép `title`/`note` của ngày.** Chép sang thì thành chữ mà
> người dùng không thấy, không sửa được, không xoá được — nhưng **vẫn hiện ra khi họ chia
> sẻ chuyến**, và còn mô tả một ngày mà họ vừa xếp lại hoàn toàn.
>
> Ghi chú của **từng mục** thì chép bình thường: nó gắn vào đúng một địa điểm nên không bị
> lạc nghĩa khi người dùng đảo thứ tự, và trình soạn có ô sửa.

- **Lúc nghỉ chỉ là CHỮ, không phải ô nhập.** Cột giữa đã dày chữ; một cột toàn khung input
  đọc ra là biểu mẫu khai báo chứ không phải một lịch trình. Bấm vào mới thành ô, blur thì
  lưu, `Esc` huỷ, `Enter` lưu ở ô một dòng (ô nhiều dòng để Enter xuống dòng).
- **Khi chưa có nội dung** thì mời bằng một dòng mờ, hiện theo đúng luật của hàng nút thao
  tác: rê chuột / tab tới mới hiện, máy cảm ứng thì luôn hiện.
- Tên ngày vẫn nằm trong **`<h2>`** — bản chỉ-đọc dùng h2, đổi sang `<button>` trần là làm
  gãy cấu trúc tiêu đề.
- `RailItem` và `DayHeading` nhận khe `note` / `titleNode`; **bỏ trống thì rơi về bản chỉ
  đọc**, nhờ vậy trang mẫu và bản chia sẻ không phải biết gì về chuyện sửa.

## 6e. Ẩn/hiện từng thông tin của mục

`components/trip/trip-fields.tsx` — nút **"Hiển thị"** ở cuối dải chọn ngày, cho bật/tắt
từng trường trên mọi mục: **Ảnh · Thời gian ở lại · Giờ mở cửa · Ghi chú · Chặng di chuyển**.

Vì sao có: mỗi người xếp lịch theo một thứ khác nhau — người đi ăn cần giờ mở cửa, người đi
chơi cần thời gian ở lại, người đã thuộc đường chỉ muốn một danh sách tên cho gọn. Trước
đây cứ thấy chật là **gỡ hẳn một trường ra khỏi code**; cách đó chỉ đúng cho một kiểu người
dùng, và mỗi lần gỡ là mất luôn dữ liệu đó với mọi người còn lại.

- **KHÔNG cho tắt: giờ đến, tên, cảnh báo.** Hai cái đầu là danh tính của mục; cảnh báo là
  lý do tồn tại của cả tính năng (§1) — cho tắt thì người dùng tự tay bỏ đi thứ đáng giá
  nhất mà không biết mình vừa bỏ gì.
- **Tắt Ảnh → rơi về đúng ô icon loại** vốn đã dùng cho mục không có ảnh. Không phát sinh
  trạng thái thứ ba.
- **Lưu ở `localStorage`, KHÔNG ở DB**: đây là sở thích XEM, không phải dữ liệu chuyến đi.
  Áp dụng cho cả ba trang (soạn · mẫu · bản chia sẻ).
- Đọc bằng **`useSyncExternalStore`** để không lệch hydration — cùng cách `header-chrome.tsx`
  theo dõi vị trí cuộn. ⚠️ `getSnapshot` phải trả **cùng một object** khi chuỗi lưu không
  đổi, nếu không React render lại vô tận.

**KHÔNG dùng dấu chấm giữa (`·`) làm dấu ngăn** ở giao diện lịch trình. Các dữ kiện đứng
cạnh nhau ngăn bằng **vạch dọc mảnh** (`h-3 w-px bg-border`) — cùng chất liệu 1px với dải số
liệu ở hero điểm đến và với đường ray. (Tiêu đề tab trình duyệt vẫn dùng `·` theo quy ước
chung của site.)

**Thời gian ở lại đặt NGAY TRÊN con số đang hiển thị** (`StayPicker`), không chôn trong menu
"…". Bản trước để hàng preset trong menu đó — không ai tìm ra, và cũng **không có cách nhập
một số bất kỳ**, chỉ chọn được trong chín mốc dựng sẵn. Popover hiện có cả ba: preset cho
nhanh · ô nhập phút cho những trường hợp preset không với tới (75 phút, 20 phút…) · lối về
mặc định (vì mặc định là con số suy theo loại, không phải người dùng đặt).

**Đã bỏ dòng "tổng giờ di chuyển trong ngày"** khỏi trình soạn: từng chặng đã ghi ngay trên
ray giữa hai mốc, cộng lại thành một con số ở đầu ngày không đổi được quyết định nào.

**Mỗi mục trên ray chỉ còn: tên · một dòng thông tin · (ghi chú) · (cảnh báo).**
Đã gỡ dần dòng phụ qua ba bước, mỗi bước một lý do:

1. Loại (`typeLabel`) là từ đầu của một chuỗi ngăn bằng dấu chấm ("Quán ăn · Hải sản · Đường
   Phạm Văn Đồng") → muốn biết mục nào ăn mục nào ngủ phải ĐỌC từng dòng. Đổi thành **icon**
   (cùng lý do `place-tabs.tsx`: *"nhìn hình là biết mục gì"*).
2. Gỡ **`bestTime`** ("Đẹp nhất: hoàng hôn") — vẫn còn ở trang chi tiết từng địa điểm.
3. Gỡ **`categoryLabel`** (hải sản, biển, homestay) và **`areaLabel`** (địa chỉ). Còn mỗi
   icon nằm lơ lửng trên một dòng riêng → dọn hẳn **lên ảnh**.

**Huy hiệu loại nằm trên ảnh nhỏ** (`Thumb` trong `trip-rail.tsx`), góc dưới trái, tràn ra
ngoài mép một chút (`-bottom-1 -left-1`): nằm gọn bên trong thì nó phải tự chống chọi với
mọi tông ảnh phía sau; gá lên mép thì phần lớn huy hiệu tựa trên nền trang, đọc chắc mà
không phải tô thêm lớp phủ tối lên ảnh.
- Mục **không có ảnh** → ô đặc chỉ có icon loại (trước là icon `Route` chung chung cho mọi
  loại, nói được đúng con số không).
- Icon để **màu trung tính** — hình đã đủ phân biệt; tô bốn màu cho bốn loại là đi ngược
  nguyên tắc "chỉ một điểm màu" của cả dải.
- Luôn kèm `<span className="sr-only">` mang tên loại: icon không có tên với trình đọc màn hình.

Thêm hai điều chỉnh nhỏ cùng đợt:
- **Cảnh báo chỉ tô nền ở mức `high`.** Tô cả ba mức thì một ngày vài cảnh báo thành mấy
  mảng màu chồng nhau, mà mắt lại không phân biệt được cái nào đáng lo.
- **Nút thao tác trên mỗi mục chỉ hiện khi rê chuột / tab tới** (`pointer:coarse` thì luôn
  hiện). Chuyến 8 mục × 3 nút = 24 nút xám nằm chờ — đúng bài học đã ghi ở thẻ lưu trú.

> **Giữ khi sửa tiếp:** `components/trip/trip-rail.tsx` là nguồn duy nhất của dòng thời
> gian (`RailItem` · `RailLeg` · `DayHeading` · `Warning` · `Thumb` · `MICRO`). Trang soạn và
> trang chỉ-đọc **đều** dùng nó — đừng chép ra sửa riêng, đó là cách chúng trôi khác nhau.

## 6f. NÚT "LỊCH TRÌNH" — viên nổi ở mọi trang + ngăn kéo soạn nhanh

**Lỗ hổng nó lấp:** `AddToTripButton` bỏ mục vào một chuyến mà người dùng **không nhìn
thấy**. Bằng chứng duy nhất là cái toast 4 giây; qua trang sau thì không đâu trên site nói
*đang lên lịch cho chuyến nào* và *đã gom được gì*. Cookie `halivivu_trip` (§4) là một
trạng thái quan trọng nhưng vô hình — chính vì vô hình mà v1 phải vá bằng nút "Đổi chuyến"
nhét trong toast.

`TripDock` (`components/trip/trip-dock.tsx`) biến trạng thái đó thành một **vật thể thường
trực**: một viên tròn nhỏ nổi ở mọi trang công khai, mở ra ngăn kéo "gom rồi xếp".

**Nút CHỈ CÓ MỘT DẠNG: viên "Lịch trình"** — icon + nhãn + viên số **mục chưa xếp ngày**
(0 thì không có số). Bản đầu đổi hình theo trạng thái (có mục thì thành ảnh bìa mục mới
nhất + "4 mục / chưa xếp ngày"); nhìn thì bắt mắt nhưng một vật thể thường trực mà cứ đổi
hình đổi cỡ thì mắt phải nhận diện lại mỗi lần, và bề rộng nhảy làm mọi thanh chừa chỗ
theo nó cũng nhảy. Viên số đặt **sau nhãn**, không phải huy hiệu dán lên icon: icon chỉ
`size-4`, huy hiệu cỡ đó đè kín mất hình.

Chưa đăng nhập / chưa có chuyến vẫn hiện y hệt — nó là **cửa vào** tính năng, không chỉ
cái gương soi: bấm vào thì ngăn kéo mời đăng nhập (`LoginDrawer`) hoặc tạo chuyến.

### Nút giữ ở mức TỐI THIỂU

Một viên **tròn 44px** (đúng ngưỡng chạm thoải mái, không hơn), đặt ở **giữa cạnh phải**.

- Vì sao không phải viên chữ "Lịch trình": dễ hiểu hơn thật, nhưng một vật thể nổi trên MỌI
  trang thì mỗi pixel nó chiếm là một pixel **vĩnh viễn** lấy của nội dung — mà nội dung mới
  là thứ người ta tới để xem. Nghĩa của nút do `aria-label` + `title` gánh.
- Vì sao **giữa cạnh phải** chứ không phải góc đáy–phải: dải đáy là chỗ đông nhất
  (`BottomNav` · `PeerBar` · `BackToTop` · lời mời cài app). Đặt vào đó là phải bắt cả bốn
  thứ kia tránh đường — tôi đã thử, bằng hai biến CSS `--trip-dock-h`/`--trip-dock-w` do nút
  tự ghi ra; chạy được, nhưng thành bốn chỗ phải nhớ mỗi khi thêm một phần tử nổi mới. Dời
  nút ra khỏi dải đáy thì **không cần chỗ nào tránh nó cả**.
- Số **mục chưa xếp ngày** là một huy hiệu nhỏ ở góc nút (0 thì không có).

> **Đã thử và BỎ: cho KÉO THẢ CHÍNH CÁI NÚT** (dính mép, nhớ vị trí trong `localStorage`).
> Chạy đúng, nhưng giải sai bài: nút đã nhỏ và đã tránh dải đáy thì không còn che gì đáng để
> phải dời, mà người dùng lại phải học thêm một thao tác chẳng để làm gì. Thứ thật sự cần
> kéo là **các mục trong lịch trình**.

**Ngăn kéo hiện CẢ LỊCH TRÌNH, không chỉ cái túi.** Bản đầu chỉ liệt kê mục *chưa xếp
ngày* — như vậy nó mới là một cái giỏ hàng, và muốn biết chuyến đang thành hình ra sao
thì vẫn phải mở trình soạn. Nay thân ngăn kéo là: **Chưa xếp ngày** (thứ đang chờ mình
làm gì đó, nên đứng trước) → **từng ngày kèm mục trong nó** → **+ Thêm ngày**.

- Tiêu đề nhóm **dính khi cuộn** (`sticky`), luôn biết đang đọc ngày nào.
- Nhãn ngày = **"Ngày 2 · Tên tự đặt"**. Lấy mỗi `title` làm nhãn (bản đầu) thì một ngày
  đặt tên "Ngày ra đảo" mất luôn dấu hiệu nó là ngày thứ mấy — trong khi cả lịch trình
  chạy theo số ngày.
- **Hai hình dạng cho hai việc khác nhau:** mục trong **túi** có nút chữ **"Xếp ngày ▾"**
  (việc đang chờ) + thùng rác; mục **trong một ngày** chỉ có nút **"…"** gom chuyển ngày /
  đưa về túi / bỏ. Lặp chữ "Ngày 1" ở mọi hàng ngay dưới tiêu đề đã ghi "NGÀY 1" là chữ
  thừa.
- Đổi chuyến đang lên lịch ngay trên tiêu đề (`listMyTrips` + `setPlanningTrip`) — cách thứ
  tư để đổi, cạnh ba cách ở §4, và là cách duy nhất **luôn ở trong tầm tay**.
- **KÉO–THẢ ngay trong ngăn kéo**: kéo giữa túi ↔ các ngày và đổi thứ tự trong một ngày.
  Dùng **chung `applyMove`/`BACKLOG`/`dayKey` của `trip-dnd.ts`** với trình soạn — phép tính
  chỉ số khi đổi vùng là chỗ dễ sai nhất, đã có `pnpm check:trip-dnd` canh, viết bản thứ hai
  là tự chuốc lỗi. Bốn điều bắt buộc:
  - **Tay cầm grip nhìn thấy được**, không phải "cả hàng kéo được" (cùng kết luận §6c: kéo
    cả hàng thì trên cảm ứng mọi cú vuốt để cuộn đều có thể thành cú kéo). Grip cũng là tay
    cầm cho **bàn phím**. Ảnh và link tên mục đặt `draggable={false}`.
  - **`data-vaul-no-drag`** trên vùng danh sách: thiếu nó thì trên điện thoại, kéo một mục
    xuống dưới sẽ kéo luôn cả ngăn kéo đóng lại (vaul hiểu vuốt dọc là "đóng bảng").
  - **`DndContext` và `DragOverlay` phải nằm NGOÀI `DrawerContent`**: vaul đặt `transform`
    lên panel, mà `position: fixed` bên trong một phần tử có `transform` lấy chính phần tử
    đó làm gốc toạ độ ⇒ bản sao đi theo con trỏ trôi lệch hẳn khỏi con trỏ.
  - Khối "Chưa xếp ngày" render **kể cả khi rỗng** (thành vùng thả để kéo mục ra khỏi ngày),
    và ngày rỗng cũng là một `DropZone`.
- Menu vẫn còn cho những lần dời xa và cho cảm ứng: `moveItem(id, dayId, day.items.length,
  version)` — chèn xuống cuối ngày; `dayId = null` là bỏ khỏi ngày.
- Ngăn kéo cố ý **không** có giờ ước tính và cảnh báo giờ mở cửa: nhân đôi trình soạn thì
  hai chỗ sớm muộn lệch nhau. Đó là lý do vẫn có nút "Mở lịch trình →".
- **Bàn cục bộ**: `syncedSig` giữ chữ ký của **bản server đã tiếp nhận gần nhất**, KHÔNG
  phải chữ ký của bàn cục bộ — lưu nhầm cái sau thì ngay sau khi thả, bản server (còn cũ vì
  action chưa xong) sẽ khác nó và ghi đè lại ⇒ mục nhảy về chỗ cũ. Đồng bộ làm **trong
  render** (mẫu "adjusting state when props change"), không phải trong effect: effect gọi
  setState là một vòng render thừa và eslint chặn. Cờ "đang kéo" là **state `activeId`**,
  không phải ref — đọc ref trong render bị React Compiler cấm.
- Gửi kèm `Trip.version`; lệch (`stale`) thì **không** báo lỗi đỏ mà nạp lại rồi mời làm lại.
- `ItemRow` phải ở **cấp module**, không khai trong thân `TripDock`: component khai trong
  render là một kiểu MỚI sau mỗi lần render ⇒ React unmount cả hàng ⇒ menu chọn ngày vừa
  mở đóng ngay.

**Hình thức:** trượt từ **đáy** dưới `lg` (ngón cái với tới), **nép phải** từ `lg`. Một
`Drawer` (vaul) đổi `direction`, không phải hai component.

**Ẩn ở** `/lich-trinh` (trong trình soạn thì cả trang ĐÃ là cái túi), `/cms`, `/sale`,
`/login`, `/offline`.

## 7. Lịch trình mẫu — đòn bẩy mạnh nhất

- Soạn ở **`/cms/lich-trinh`** — dùng lại chính trình soạn ở §6, chỉ khác `isTemplate=true`
  + có `slug` / `status` / ảnh bìa.
- `/lich-trinh/ha-long-3n2d` — công khai, chỉ đọc, nút lớn **"Dùng lịch trình này"**
  → deep-copy sang tài khoản người dùng (`isTemplate=false`, `startDate=null`, `slug=null`).
- **Cross-link:** trang `/diem-den/[slug]` hiện khối "Gợi ý lịch trình" lọc theo
  `Trip.placeId` — giải luôn bài toán *vào `/lich-trinh` lần đầu thấy trang trống*.
- Blog đã hứa "lịch trình gợi ý" (`src/app/(site)/blog/page.tsx`) → nối vào đây.

### 7a. Trang danh sách `/lich-trinh` — MẪU ĐẦY ĐỦ + CỬA TỰ XẾP

> **Viết lại 2026-08-29.** Bản trước là *dải mở đầu có ảnh → thanh công cụ nổi → chip điểm
> đến → lưới thẻ (đổi được sang danh sách) → Tải thêm → dải bốn cam kết*, phần tương tác nằm
> ở `src/components/trip/trip-browser.tsx`. **Bộ duyệt đó đã xoá** — lấy lại trong lịch sử
> git nếu số mẫu vượt ~8; đừng dựng lại từ đầu.

**Vì sao bỏ bộ duyệt.** Đo trên dữ liệu thật: **8 ô điều khiển cho 2 lịch trình** (ô tìm
kiếm + lọc số ngày + sắp xếp + 3 chip điểm đến + 2 nút đổi kiểu xem), cộng "tải thêm" chia
trang 9. Lọc 2 mục thì không phải là lọc, chỉ là đồ đạc. Tệ hơn: đúng 2 mẫu đó **trang chủ
đã bày sẵn** trong section "Lịch trình mẫu", nên trang index không thêm nội dung nào, chỉ
thêm bộ máy.

**Vì sao đổi vai trang.** Bản cũ *GIẢI THÍCH* cách tự xếp lịch trình — một đoạn văn ở đáy
trang: "bấm **Thêm vào lịch trình** ở bất kỳ địa điểm, quán ăn hay chỗ ở nào rồi kéo vào
ngày bạn muốn". Trong khi site đã có sẵn nút một-chạm **"Lên lịch trình đi X"** (§6b) mà
trang này không hề mời. Một trang công cụ phải giải thích công cụ bằng lời thì cái nút đang
nằm sai chỗ.

Bố cục hiện tại:

```
Dải mở đầu: ẢNH TRÀN VIỀN + "LỊCH TRÌNH" in hoa giãn chữ + 2 nút kính (khuôn /diem-den)
[đã đăng nhập] DẢI TRẠNG THÁI tràn viền ngay dưới hero, nền `primary/5`, MỘT hàng:
   (ảnh đại diện)  Bạn đang lên lịch trình <tên chuyến> ····· n ngày  n mục  Tiếp tục →

   ⚠️ Hai thứ nói "đây là của BẠN", cả hai đều cần:
      · ẢNH ĐẠI DIỆN của người đang đăng nhập (`Avatar` của shadcn — dùng `<img>`
        của Radix nên KHÔNG phải khai domain trong `next.config.ts`);
      · CÂU Ở NGÔI THỨ HAI, viết thường. Bản trước dùng nhãn IN HOA NHỎ `MICRO`
        — đó đúng là kiểu chữ của nhãn phân loại ở các hàng mẫu ("BÌNH THUẬN ·
        3 NGÀY 2 ĐÊM"), nên nó đọc ra như metadata của một mẫu chứ không phải
        lời hệ thống nói với người dùng.
   ⚠️ Không phải một thẻ trong cột nội dung. Bản cũ là thẻ có viền đặt trên danh
   sách mẫu, mà nó lặp đúng hình của một hàng mẫu — đây là VIỆC DỞ CỦA BẠN, không
   phải mẫu để xem. Nền phớt màu đã tự tách khối nên KHÔNG thêm đường kẻ.
Lịch trình mẫu — MỘT MẪU MỘT HÀNG tràn ngang, các hàng ngăn bằng `divide-y`:
   ┌────────┬────────────────────────────────────────────┐
   │        │ BÌNH THUẬN   3 NGÀY 2 ĐÊM   17 ĐIỂM DỪNG   │
   │  ảnh   │ Phan Thiết 3 ngày 2 đêm                    │
   │        │ Một chiều thả lỏng ở biển…      (max-w-2xl)│
   │        │ 01  Về tới biển             5 điểm dừng    │
   │        │ 02  Bình minh đồi cát       8 điểm dừng    │
   └────────┴────────────────────────────────────────────┘
   Tiêu đề section KHÔNG kèm dữ kiện phụ (`SectionHead` có `meta` tuỳ chọn).
   CẢ HÀNG là link — không nút phụ, không dòng chữ phụ

   ⚠️ TÊN MẪU là CHỮ ở cột phải, KHÔNG đè lên ảnh như thẻ /diem-den: ảnh ở đây
   chỉ rộng ~19rem, đặt tên lên đó thì chật và tranh chỗ với chính tấm ảnh.
   ⚠️ Ảnh dùng `sm:h-full` + `min-h`, KHÔNG đặt tỉ lệ cố định: cột chữ cao thấp
   khác nhau theo số ngày (1 ngày vs 3 ngày), `aspect-[…]` thì hàng nào cũng
   thừa hoặc thiếu chỗ.
   ⚠️ Danh sách ngày trải HẾT cột phải (không `max-w`) — số điểm dừng neo ở mép
   phải hàng nên không còn khoảng trống thừa. Riêng TÓM TẮT vẫn giữ `max-w-2xl`:
   đó là văn xuôi, cần độ dài dòng đọc được.
   ⚠️ KHÔNG kẻ nét dưới từng ngày. Số thứ tự ở cột trái và số điểm dừng neo mép
   phải đã tạo sẵn hai trục thẳng hàng để mắt bám theo — thêm nét thì một trang
   5 mẫu có tới ~16 đường ngang. Cả trang giờ chỉ còn nét dưới tiêu đề section
   và `divide-y` giữa các hàng.
```

> **ĐÃ GỠ (2026-09-06) — đừng dựng lại mà không hỏi:** khối *"Tự xếp chuyến của bạn"*
> (lưới thẻ điểm đến, mỗi thẻ một `PlanTripButton`) và dải *"Đo trên bản đồ"*. Cả hai
> **lặp đúng hai nút đã có sẵn trên hero** — "Chọn điểm đến" (→ `/diem-den`) và "Đo chuyến
> trên bản đồ" (→ `/ban-do`) — nên trang mời cùng hai việc đó hai lần trong một màn hình.
> Gỡ kèm luôn truy vấn `place.findMany` chỉ phục vụ khối đó: trang nay còn **2 truy vấn**.
> Muốn dựng lại thì lấy trong lịch sử git; `PlanTripButton` vẫn còn nguyên và vẫn dùng ở
> trang điểm đến.

**Phong cách lấy nguyên của `/diem-den`** (`destination-filter.tsx`): tiêu đề in hoa giãn chữ
bằng `--font-display` (Be Vietnam Pro, khai ở root layout), hằng
`MICRO` **0.6rem** dùng chung, bo góc theo bộ chung (`lib/radius.ts`). Một lịch trình và một
điểm đến là hai mặt của cùng một chuyến đi, người dùng đi qua lại giữa hai trang — chúng
không được là hai sản phẩm khác nhau.

> **Đã thử và bỏ HAI bố cục khác, đừng dựng lại mà không hỏi:**
> · *hàng 2 cột* (ảnh trái — tóm tắt + bảng từng ngày bên phải): phần giá trị nhất
>   (các ngày) thành cột chữ nép bên cạnh, và hai mẫu lặp y hệt nhau;
> · *dải dòng thời gian ngang* (mỗi ngày một nốt trên một đường): nói đúng thứ sản phẩm
>   bán, nhưng **phần lớn mẫu chỉ 2–3 ngày** nên dải lúc nào cũng ngắn hơn bề ngang trang.
>
> Bài học chung: **mọi khối trên trang này phải TRẢI HẾT bề ngang với số thẻ THẬT** (hiện
> là 2). Đừng bó `max-w`, đừng khai số cột lớn hơn số thẻ — mép phải răng cưa làm cả trang
> đọc ra như bị hụt nội dung. Lưới "Tự xếp chuyến" chỉ bật `lg:grid-cols-4` khi có ≥3 nơi.
>
> Ảnh thẻ luôn có: bìa mẫu → ảnh điểm dừng đầu tiên → `coverUrl([], slug)`. **Đừng lấy URL
> thô** — nhiều điểm dừng chưa có ảnh thật và thẻ sẽ thành ô xám trống.

Nút kính trên ảnh hero là **`components/site/hero-link.tsx`** — tách ra dùng chung sau khi
phát hiện `/diem-den` (`BrowseLink`) và `/dia-diem` (`HeroLink`) giữ hai bản chép **giống
nhau từng ký tự**. Đổi độ mờ hay viền thì phải đổi một chỗ, không phải ba.

⚠ **Đổi hero thì phải đổi kèm `lib/site-chrome.ts`.** Ảnh chạy từ y=0 nên header phải CHÌM
lên trên nó (chữ trắng trên kính) — `/lich-trinh` đã được thêm vào danh sách `overlay` ở đó.
Ngược lại cũng đúng: bỏ ảnh hero mà quên gỡ route khỏi danh sách thì chữ trắng của header rơi
xuống nền sáng. Hero cũng cần `lg:pt-[7rem]` để tiêu đề không chui xuống dưới header, và có
nền tối `bg-[#0b1a12]` vẽ sẵn dưới ảnh cho trường hợp chưa mẫu nào có ảnh điểm dừng.

- **Hàng ngang thay cho thẻ trong lưới.** Hai mẫu xếp thành thẻ thì bỏ trống nửa hàng và
  không nói được gì hơn tên + số ngày. Hàng ngang có chỗ cho thứ thật sự phân biệt lịch
  trình này với lịch trình kia: **từng ngày có gì**.
- **Lưới điểm đến CO THEO SỐ THẺ** (`starters.length <= 2` → `max-w-2xl`): hiện chỉ hai điểm
  đến có đủ nội dung để xếp lịch, để nguyên 4 cột thì hai ô trống đọc ra như lỗi tải. Cùng
  bài học đã ghi ở khối "Gợi ý lịch trình" của trang điểm đến.
- ⚠ **Tiêu đề khối đó KHÔNG được là "Không mẫu nào đúng chuyến của bạn?"** — đã thử và bỏ:
  hai nơi duy nhất đủ nội dung (Phan Thiết, Tà Xùa) chính là hai nơi đã có mẫu ở ngay trên,
  nên câu đó tự mâu thuẫn. Chuyện thật là *cùng một nơi, chuyến của bạn không nhất thiết
  giống mẫu* → **"Tự xếp chuyến của bạn"** + "Mẫu chỉ là một cách đi".
- **`PlanTripButton` nhận `children`** để cả một thẻ ảnh làm trigger — dùng lại NGUYÊN hộp
  thoại "tiếp tục chuyến đang có / bắt đầu từ mẫu / tạo mới" + cửa đăng nhập, thay vì chép
  lại luồng đó lần thứ hai.
- **Nhãn "Lên lịch trình →" dưới thẻ luôn hiện**, không giấu sau hover: thẻ này mở hộp thoại
  chứ không phải link thường, mà trên điện thoại thì không có hover.
- **Thẻ "Đang lên lịch trình"** (cookie `getPlanningTripId` + kiểm `ownerId`) nằm ở ĐẦU
  trang: người đang có chuyến dở cần đường quay lại, không cần một mẫu mới.

#### Ảnh

- Ảnh của một mẫu: **bìa riêng → ảnh bìa của ĐIỂM DỪNG đầu tiên có ảnh → hoạ tiết nốt**.
  Nấc giữa là nấc bản cũ bỏ qua (nó chỉ dùng ảnh điểm dừng cho dải mở đầu, còn thẻ để trống).
- ⚠ **Mẫu chưa có ảnh: KHÔNG mượn `coverUrl()`** (ảnh giữ chỗ picsum). Đã thử và bỏ **hai
  lần** — mẫu Tà Xùa, một chuyến LÊN NÚI SĂN MÂY, nhận về một tấm **bờ biển bão tố**.
- **Không có ảnh thì để TRỐNG**, chỉ còn khuôn chữ trên nền `muted` (cùng bố cục: nhãn nơi
  in nghiêng → tên → hai dữ kiện gạch mảnh). Hoạ tiết **N nốt tròn nối nét đứt** của bản
  trước đã bỏ: nó kế thừa từ thẻ cũ, nơi ô ảnh KHÔNG có chữ nào nên cần thứ gì đó lấp chỗ.
  Từ khi tên nằm giữa ảnh thì nốt vừa **đè lên chính cái tên**, vừa nói lại đúng điều hàng dữ
  kiện đã nói ("2 ngày 1 đêm"). Muốn ô đó có ảnh thì việc phải làm là **biên tập**: gắn ảnh
  bìa cho mẫu trong CMS.
- **Ảnh dải mở đầu KHÔNG được trùng ảnh của bất kỳ mẫu nào bên dưới** — cùng một tấm hiện hai
  lần trong một màn hình thì dải mở đầu đọc ra như một cái thẻ bị phóng to. Lấy ảnh của một
  ĐIỂM DỪNG chưa dùng làm ảnh mẫu (vẫn là ảnh của đúng chuyến đó).
- Dải mở đầu có **nền tối vẽ sẵn dưới ảnh** (`bg-[#0b1a12]`): chưa mẫu nào có ảnh điểm dừng
  thì chữ trắng vẫn đọc được, thay vì trắng trên trắng.

## 8. Chia sẻ

Theo đúng khuôn `StayShare` đã có ở trang lưu trú: nút chia sẻ + **mã QR** + copy link.
Bật chia sẻ mới sinh `shareId`. Trang `/lich-trinh/s/[shareId]` chỉ đọc, `noindex`, có nút
"Nhân bản về lịch trình của tôi".

## 9. Sáu quyết định — ĐÃ CHỐT khi dựng v1

| # | Vấn đề | Đã làm |
|---|---|---|
| 1 | **Nguồn định tuyến.** `src/lib/map-actions.ts` tự ghi chú "OSRM demo, KHÔNG dùng cho production". | ✅ Ma trận thời gian → **ORS** qua `getDrivingDistances` (cache 30 ngày). OSRM **chỉ còn vẽ hình tuyến** trên bản đồ. ORS im lặng → ước lượng chim bay ×1.3 @38km/h, đánh dấu `approx` và UI hiện tiền tố `~`. |
| 2 | **`Place` không có `lat/lng`** | ✅ Thêm `Place.lat/lng` + `pnpm backfill:place-coords`. Kết quả: **31/31 điểm đến** có toạ độ, **1/63 tỉnh** (tỉnh hiếm khi là điểm dừng; nhập tay được trong CMS). |
| 3 | **"Ước tính chi phí"** | ✅ **BỎ khỏi v1** đúng như đề xuất — không có dòng chi phí nào trong UI. `Eatery`/`Accommodation` cố ý không có `priceRange` nên mọi con số sẽ sai vô hình. |
| 4 | **Offline** | ❌ Chưa làm (xem §13). |
| 5 | **`BottomNav`** | ✅ **Không** thêm tab. Giữ nút ở header (`lich-trinh-nav-link.tsx`) — thanh tab vẫn 4 mục. |
| 6 | **Nút "Thêm" trên lưới card** | ✅ Chỉ ở **trang chi tiết + popup**. Lưới thẻ không đụng vào. |

## 10. Phân kỳ — tình trạng

1. ✅ **Schema + migration** — 3 bảng, `Image.tripId`, `Place.lat/lng`.
2. ✅ **Trình soạn** `/lich-trinh/[id]` — cột chưa xếp, ngày, đổi thứ tự, bản đồ.
3. ✅ **Máy tính giờ + cảnh báo** (§5).
4. ✅ **Nút "Thêm vào lịch trình"** + đăng nhập giữa chừng + chuyến đang lên lịch.
5. ✅ **CMS template** + `/lich-trinh/mau/[slug]` + khối gợi ý ở trang điểm đến.
6. ✅ **Chia sẻ** + QR + nhân bản.

## 11. Hiện trạng liên quan (khảo sát 2026-08-18)

| Mảnh | Trạng thái |
|---|---|
| `/lich-trinh` | `src/app/(site)/lich-trinh/page.tsx` — chỉ `ComingSoon` |
| Lối vào | `components/site/lich-trinh-nav-link.tsx` (nút header) · `mobile-menu-sheet.tsx` (`soon: true`) · shortcut PWA trong `app/manifest.ts` |
| Chỉ đường nhiều điểm | **Đã có** — `map-explorer.tsx` chế độ `itinerary`: thêm/xoá/sắp điểm, vẽ tuyến, km/phút từng chặng. Nhưng **ephemeral (chỉ React state) và bị nhốt trong một Place** |
| Định tuyến | `lib/map-actions.ts` (OSRM demo) · `lib/routing.ts` (ORS matrix, cache 30 ngày) · `lib/nearby.ts` (haversine) |
| Giờ mở cửa | `lib/opening-hours.ts` — `openingStatus()` nhận mốc phút bất kỳ ⇒ **dùng lại được ngay** |
| Dữ liệu cá nhân đã có | Chỉ `CheckIn` + `Review`. **Không có bookmark/lưu ở bất kỳ đâu** — lịch trình là tính năng "lưu" đầu tiên của site |

Nói cách khác: chế độ "Lộ trình" trong `map-explorer` đã làm sẵn ~70% phần khó (sắp xếp
điểm → tuyến → thời gian chặng). Lịch trình về bản chất là **làm cho thứ đó tồn tại lâu
dài, vắt qua nhiều ngày và nhiều tỉnh**.

## 12. Bản đồ mã nguồn (v1 đã dựng)

| Lớp | File | Vai trò |
|---|---|---|
| Logic thuần | `src/lib/trip-time.ts` | Máy tính giờ + cảnh báo (§5). Không Prisma, không React, không "bây giờ" ⇒ test tay được |
| Quãng đường | `src/lib/trip-route.ts` | `getLegs()` — ORS cho chặng liên tiếp, rơi về chim bay và đánh dấu `approx` |
| Dữ liệu | `src/lib/trip.ts` | Nạp Trip → quy 5 loại mục về `ResolvedItem`; `buildDayViews()` dùng chung cho **cả ba** trang |
| Mutation | `src/app/(site)/lich-trinh/actions.ts` | CRUD chuyến/ngày/mục, `moveItem`, chia sẻ, nhân bản, cookie chuyến-đang-mở |
| Trang | `src/app/(site)/lich-trinh/{page,[slug],cua-toi/page,cua-toi/[id],s/[shareId]}` | Danh sách mẫu (công khai) · một mẫu · chuyến của tôi · trình soạn · bản chia sẻ |
| Kéo–thả | `src/components/trip/trip-dnd.ts` | Bàn id theo vùng + `applyMove` (§6c) · kiểm bằng `pnpm check:trip-dnd` |
| Mục của chuyến | `src/lib/trip-sections.ts` · `trip-side-nav.tsx` · `trip-topbar.tsx` · `trip-soon.tsx` · `[id]/[muc]/page.tsx` | Sidebar 5 mục + route. **Ghi chú** · **Đồ mang theo** · **Chi phí** đã dựng (`trip-notes/packing/money.tsx`). Mục *Phân công* đã **bỏ hẳn** — xem [lich-trinh-cong-cu-nhom.md](lich-trinh-cong-cu-nhom.md) |
| Vỏ chung | `src/components/trip/trip-shell.tsx` · `trip-day-strip.tsx` · **`trip-rail.tsx`** | Khung BA CỘT trong container `max-w-7xl` · dải chọn ngày · **dòng thời gian dạng ray** — dùng chung cả ba trang (§6a) |
| UI soạn | `src/components/trip/trip-editor.tsx` | Dòng thời gian, cột Chưa xếp ngày, đổi thứ tự, sửa thời gian ở lại |
| UI đọc | `src/components/trip/trip-view.tsx` | Bản chỉ đọc dùng cho chia sẻ + mẫu |
| Bản đồ | `src/components/trip/trip-map{,-inner}.tsx` | Pin **đánh số theo thứ tự** + tuyến của MỘT ngày |
| Chia sẻ | `src/components/trip/trip-share.tsx` | Công tắc bật/tắt + QR + copy (khuôn `StayShare`) |
| Nút lên lịch | `src/components/site/plan-trip-button.tsx` | CTA trang điểm đến (§6b) — `getPlanOptions` · `startTripForPlace` |
| **Nút Lịch trình** | **`src/components/trip/trip-dock.tsx`** · `trip-bag-events.ts` | Viên nổi + ngăn kéo **kéo–thả được** "gom rồi xếp" ở MỌI trang công khai (§6f). Dữ liệu: `getTripBag()` (trả **cả ngày kèm mục** + túi chưa xếp, một truy vấn rồi chia nhóm ở JS); dựng ở `(site)/layout.tsx` |
| Nút thêm | `src/components/site/add-to-trip-button.tsx` | Gắn ở hero địa điểm, trang hoạt động, trang lưu trú, popup quán ăn, popup lưu trú. **KHÔNG** ở trang điểm đến (§6b) |
| CMS | `src/app/cms/lich-trinh/**` | Danh sách + form xuất bản mẫu + ảnh bìa. **Nội dung ngày soạn ở trình soạn công khai** |
| Script | `scripts/backfill-place-coords.ts` | `pnpm backfill:place-coords` |

Sửa kèm ở nơi khác: `Place.lat/lng` (schema + form CMS + actions) · `Image.tripId` +
`lib/owner.ts` + enum của route uploadthing · `RESERVED_SLUGS` thêm `lich-trinh` ·
`sw.js` lên **v2** kèm `CACHE_ANYWAY` · `sitemap.ts` thêm mẫu · gỡ nhãn "Sắp có" khỏi
`site-header.tsx` và `mobile-menu-sheet.tsx` · khối "Gợi ý lịch trình" ở trang điểm đến ·
`.dl-trip-pin` trong `globals.css` · **`--trip-dock-h`/`--trip-dock-w` trong `globals.css`
+ `back-to-top.tsx`, `install-prompt.tsx`, `place-about-video.tsx`, `peer-bar.tsx` tránh chỗ
cho cái túi (§6f).**

> **Cách kiểm giờ ước tính ngoài trình duyệt:** script gọi `lib/trip.ts` sẽ vướng hai thứ —
> `import "server-only"` (không có trong node_modules gốc) và `unstable_cache` (ném
> `Invariant: incrementalCache missing` ngoài runtime Next). Cả hai đều **không phải lỗi
> code**: `getLegs()` bắt lỗi và rơi về ước lượng chim bay. Muốn chạy thì stub
> `server-only` qua `NODE_PATH` và chấp nhận mọi chặng đều `approx`.

## 12b. Tìm & thêm ngay trong trang soạn (2026-10-23)

Trước đây muốn thêm một nơi phải rời trang soạn, vào trang địa điểm rồi bấm "Thêm vào lịch
trình". Giờ có hộp tìm `trip-add-search.tsx`, mở từ **hai lối**: nút *Thêm địa điểm vào ngày N*
ở cuối mỗi ngày (thêm THẲNG vào ngày đó, xuống cuối) và ô *Tìm địa điểm, quán ăn…* ở cột Chưa
xếp ngày (thêm vào danh sách chưa xếp).

**Ngăn lịch trình nổi (`trip-dock.tsx`) dùng CHÍNH hộp đó**: ô tìm ngay dưới tên chuyến + nút
**+** ở đầu từng nhóm (Chưa xếp ngày / Ngày N). Ngăn giữ dữ liệu ở client (`getTripBag`),
`revalidatePath` không chạm tới ⇒ hộp nhận `onAdded` và ngăn truyền `tripBagChanged`. Màn
"Lịch trình đang trống" đã bỏ: chuyến chưa có mục nào vẫn hiện đủ các ngày, nếu không thì không
có nút **+** nào để thêm thẳng vào ngày. Hộp tìm (Radix Dialog) lồng trên ngăn (vaul) — Esc chỉ
đóng hộp, ngăn vẫn mở.

- `searchTripCandidates(tripId, q)`: bốn loại thêm được (spot · eatery · activity ·
  accommodation), tối đa 4/loại khi ô trống, 6/loại khi có chữ. **Ô trống ⇒ gợi ý ở điểm đến
  của chuyến** (cả điểm đến con); có chữ ⇒ tìm toàn site nhưng nơi thuộc điểm đến của chuyến
  đứng trước. Ảnh chỉ lấy `kind: "gallery"`, không có ảnh thật thì ô xám có ký hiệu.
- `addItem(target, tripId, dayId)` — `dayId` chỉ được nhận khi có `tripId` rõ ràng.
- **Ô tìm cũng là ô TỰ THÊM** (đã gộp, cột Chưa xếp ngày không còn form riêng): có chữ là
  luôn có dòng *Thêm "…"* — kể cả khi tìm ra kết quả, vì kết quả gần đúng ("Chợ đêm Phan
  Thiết") chưa chắc là thứ người ta muốn.
- ⚠️ **Mục tự thêm KHÔNG toạ độ là một VIỆC, không phải một NƠI** (`isTask()` ở
  `lib/trip-time.ts`): "Đặt xe", "Chờ người" diễn ra tại nơi gần nhất phía trước. Nên:
  `getLegs` chỉ nhận mục CÓ toạ độ · chặng đi tiếp xuất phát từ nơi cuối cùng phía trước
  (`ScheduledItem.legKey`) · không vạch "di chuyển" tới một việc (`legHidden`) · không cảnh báo
  "chưa có toạ độ" · mặc định **30 phút** (`TASK_STAY_MIN`), không phải 60 của mục tự thêm có
  toạ độ. Trước đây một "Chờ người" nằm giữa hai nơi làm mất cả chặng lái A → B.
- Ô trống có sẵn 4 việc (`TASKS` trong `trip-add-search.tsx`) kèm thời lượng riêng. Có chữ mà
  không tên nào chứa trọn cụm đã gõ ⇒ dòng *Thêm "…"* lên ĐẦU và được chọn sẵn ("đặt xe" ra
  "Thuê xe máy" là có kết quả mà không đúng).
- **Chèn ở BẤT KỲ vị trí nào**: nút **+** ĐÚNG GIỮA hai chấm số liền nhau trên trục
  (`InsertMarks` trong `trip-editor.tsx`) — rê vào BẤT KỲ đâu trên một mục là hiện MỘT dấu +,
  ở khe ngay dưới nó — với mục cuối là ở ĐÁY trục (chèn trước mục đầu thì dùng menu). **Không
  còn nút "Thêm vào ngày N" ở cuối ngày** (trùng với dấu + đáy trục); chỉ NGÀY TRỐNG mới có nút
  đó, nằm trong dòng "…hoặc kéo một mục…" vì chưa có trục nào để gắn dấu +; + *Thêm phía trước / phía sau* trong menu từng mục (lối cho màn cảm ứng, có
  cả ở ngăn nổi).
  · Vị trí dấu + phải **ĐO** (`[data-rail-dot]` + `ResizeObserver`): khoảng cách hai chấm đổi
    theo ghi chú, dòng di chuyển, ô ghi chú trống ẩn bằng `opacity` mà vẫn chiếm chỗ — bản canh
    bằng CSS từng lệch xuống. Đo trong `useEffect`, **không** `useLayoutEffect`: effect bố cục
    của con chạy trước khi React gắn ref cho `<ol>` cha ⇒ đo ra rỗng và không đo lại. Vị trí tính bằng `insertAt()`
  (`lib/trip-drop.ts`) rồi gửi qua `addItem(..., at)` — cùng kiểu `DropAt` với kéo–thả.
  · ⚠️ **Mốc chèn TRÔI sau mỗi lần thêm** (`afterId` = mục vừa thêm): giữ nguyên mốc cũ thì
    thêm A rồi B vào cùng khe sẽ ra B, A — ngược thứ tự bấm.
- Hộp **không tự đóng sau mỗi lần thêm**: người ta thường thêm vài nơi một lượt. Nơi đã có
  trong chuyến hiện *Đã có*, không bấm được.
- Hộp đang mở là `role="dialog"` + `data-state="open"` ⇒ `useTripLiveSync` tạm dừng.

## 12c. Bật/tắt tự tính đường đi (2026-10-23)

`Trip.autoTravel` (mặc định bật, migration `trip_auto_travel`) — công tắc *Tự tính đường đi* ở
hàng ngày khởi hành / số người của trang soạn.

- **Theo CHUYẾN, không theo người xem** — khác hẳn menu *Hiển thị* (`trip-fields.tsx`, lưu
  `localStorage`). Mục "Chặng di chuyển" trong *Hiển thị* chỉ ẨN DÒNG CHỮ, giờ vẫn cộng chặng;
  còn công tắc này đổi GIỜ của cả lịch nên mọi người cùng sửa phải thấy như nhau. Tắt thì mục
  "Chặng di chuyển" biến khỏi *Hiển thị* (không còn gì để ẩn).
- Tắt ⇒ `buildDayViews` **không gọi OSRM**, `scheduleDay(..., { travel: false })`: giờ đến =
  giờ rời mục trước, `legHidden` hết, không cảnh báo chặng dài / thiếu toạ độ. Trang xem chia sẻ
  và lịch trình mẫu đi cùng đường nên cũng theo cờ này.
- Dòng di chuyển hiện thêm **km** (`ItemView.driveKm`, lấy từ cùng `Leg` của OSRM).
- ⚠️ `shape()` đọc `trip.autoTravel ?? true`: tiến trình nào còn giữ Prisma client cũ sẽ đọc ra
  `undefined` — không có `?? true` là mọi chuyến lặng lẽ mất chặng. (Lỗi "bấm tắt là sập trang"
  lúc đầu là đúng chuyện đó; gốc đã sửa ở `lib/prisma.ts` — xem CLAUDE.md §4.)

## 12d. Menu *Hiển thị* — "Ẩn tất cả" (2026-10-24)

- Hai nút cuối menu: **Ẩn tất cả** / **Hiện lại tất cả** (lưu `localStorage`, theo người xem).
  Chỉ **giờ đến + tên** luôn hiện. **Cảnh báo cũng là một tuỳ chọn** (`warn`, mặc định bật —
  biên tập yêu cầu "ẩn tất cả là ẩn thật"); "Ghi chú" ẩn cả ghi chú của NGÀY.
  · ⚠️ Menu dùng ở HAI trang — `trip-editor.tsx` và `trip-view.tsx` (lịch mẫu, link chia sẻ).
    Thêm trường mới thì gắn cờ ở cả hai; trang xem từng in ghi chú bỏ qua menu.
- Tắt **Ảnh** thì **bỏ hẳn ô 48px**, chỉ còn ký hiệu loại 14px TRƯỚC TÊN (bản cũ giữ ô icon nên
  tắt ảnh gần như không gọn đi chút nào). Mục không còn dòng phụ nào (`bare` trong `RailItem`)
  thì đệm dưới `pb-3` thay vì `pb-5` ⇒ ẩn tất cả ra một danh sách một-dòng-một-mục.

## 12e. Hoạt động lồng dưới địa điểm (2026-10-24, biên tập chọn)

Đúng §1 CLAUDE.md: `Spot` là một CHỖ, `Activity` là một VIỆC làm tại chỗ. Bản cũ cho hoạt động
mượn toạ độ của Spot đầu tiên rồi đứng ngang hàng như một điểm dừng — có số riêng, có chặng
"di chuyển 0 phút" từ chính chỗ của nó.

- `anchorsOf()` (`lib/trip-time.ts`): hoạt động đứng sau ĐÚNG một Spot của nó (`atSpots`, cho
  phép xen việc / hoạt động khác cũng đang lồng ở đó) ⇒ **lồng** vào Spot đó. Không thì nó vẫn là
  điểm dừng, ghi "tại {Spot đầu tiên}".
- Mục lồng: `inPlace` khi tính giờ (như một việc — không chặng tới nó, chặng đi tiếp tính từ
  Spot) · không vào `getLegs` · `RailItem` vẽ chấm nhỏ không số, ảnh nhỏ, thụt `pl-5`.
- **Số thứ tự chỉ đếm điểm dừng** (`ItemView.stopNo`). Bàn kéo–thả cục bộ chưa tính lại lồng
  cho tới khi server trả về — chấp nhận được, chỉ lệch trong lúc chờ.
- Đã thử và BỎ: giữ ngang hàng chỉ thêm "tại …" · gộp hẳn hoạt động vào dòng của địa điểm.

## 12f. Hai cột "Ở đâu | Làm gì" (2026-10-24, biên tập chọn)

Mỗi ngày là các hàng `StopRow` (`trip-rail.tsx`), gom bằng `groupStops()` (`lib/trip-stops.ts`):

- **Ở đâu** (trái, có trục + số): mục là một NƠI — địa điểm, quán, chỗ ở, mục tự thêm có toạ độ.
  Hoạt động đứng riêng ⇒ cột trái là `PlaceStub` ghi nơi của nó (Spot đầu tiên), cột phải là
  chính hoạt động. Việc đứng đầu ngày trước mọi nơi ⇒ `PlaceStub` "Chưa rõ ở đâu", chấm không số.
- **Làm gì** (phải, `DoingRow`): hoạt động đang lồng (§12e) + việc tự thêm, mỗi dòng có giờ
  riêng. Không có gì ⇒ "—" (chỉ từ `sm`). Nút **+ Thêm việc** chèn vào cuối hàng, đặt `absolute`
  trong phần đệm đáy để lúc ẩn không chiếm chỗ.
- Chặng di chuyển nằm GIỮA các hàng (`RailLeg` của mục cuối hàng). Số thứ tự đếm HÀNG.
- Dưới `sm` hai cột xếp chồng; cột phải thụt theo nội dung và tự vẽ tiếp đoạn trục
  (`STACKED_RAIL`) cho đường không đứt.
- ⚠️ `SortableContext` của ngày dùng **`rectSortingStrategy`**: mục nằm ở hai cột, chiến lược dọc
  chỉ dời theo y nên kéo giữa hai cột sẽ chồng lên nhau.
- Dấu + ở trục (`InsertMarks`) giờ là giữa các HÀNG — `slotIndexes` đổi chấm thứ k thành chỉ số
  chèn sau hàng k.
- Dùng chung ở trang soạn và `trip-view.tsx` (lịch mẫu, link chia sẻ).

## 12g. Dòng tự gõ: nơi · việc · bao lâu (2026-10-24)

`TripItem.customPlace` (migration `trip_item_custom_place`) — mục tự thêm là một **NƠI** dù không
có toạ độ ("Nhà bạn Minh"). `isTask()` = custom + **không** `customPlace` + không toạ độ.

- Hộp thêm có chữ ⇒ hai dòng: **Việc: …** (vào cột "Làm gì" của nơi đang đứng) và **Nơi: …**
  (hàng mới ở "Ở đâu"), cộng **Tự gõ đủ: ở đâu, làm gì, bao lâu…** mở form ba ô — phần nào cũng
  bỏ trống được, không cả hai. Mọi lối đều qua `addCustomStop()` (một transaction): có "ở đâu"
  ⇒ tạo nơi rồi việc NGAY SAU nó (thời lượng thuộc việc, nơi `stayMin = 0`); chỉ "làm gì" ⇒ việc.
  `"Bao lâu"`: *Tự động* = `null` (nơi 1 giờ, việc 30 phút) · *Không tính* = 0.
- ⚠️ **Nơi không toạ độ CẮT chuỗi toạ độ** (`scheduleDay`): `lastPlace` về null ⇒ chặng kế tiếp
  "chưa ước tính" thay vì mượn chặng từ nơi CÓ toạ độ trước đó (bản đầu ghi "Chợ → Bàu Trắng 57
  phút", thực ra là chặng Đồi cát bay → Bàu Trắng). `seenPlace` tách "chưa tới đâu" (ẩn chặng)
  khỏi "đang ở chỗ không rõ toạ độ" (vẫn hiện dòng chặng).
- Cảnh báo "chưa có toạ độ" chỉ cho NƠI CỦA SITE thiếu toạ độ (lỗi dữ liệu); xét ở **nơi đang
  đứng** (`here`), không ở việc. Nơi tự gõ thì chỉ dòng "chưa ước tính" xám.
- `cloneTrip` chép cả `customPlace`.

## 12h. Rà trải nghiệm tab Lịch trình (2026-10-24)

Soát trên chuyến thật 33 mục / 4 ngày; trang ngắn đi ~10–12% mà không bớt thông tin.

- ⚠️ **Mục chưa có ghi chú KHÔNG giữ dòng ẩn nữa** — bản cũ để ô "Thêm ghi chú…" `opacity-0`
  dưới MỌI mục (~22px trắng mỗi mục, cột "Làm gì" cách nhau gần 90px). Giờ thêm qua **⋯ → Thêm
  ghi chú**; ô gõ mở ngay tại chỗ (`InlineEdit startEditing`).
  · ⚠️ Mở ô gõ trong **`onCloseAutoFocus`** của menu, KHÔNG trong `onSelect`: lúc menu còn chạy
    hiệu ứng đóng nó vẫn giữ focus, mở sớm là ô gõ (trống) mất focus và tự đóng. Headless KHÔNG
    thấy lỗi này nếu không bật `Emulation.setFocusEmulationEnabled` (cửa sổ nền không phát blur).
- **Giờ bắt đầu ngày luôn 24h** (`StartTimePicker`): bỏ `<input type="time">` — trình duyệt vẽ
  theo ngôn ngữ máy nên ra "02:00 PM" cạnh mọi giờ khác viết "14:00".
- **"0 phút" ⇒ "Ghé qua"** (chỗ ở: "Nhận phòng") — `stayLabel()`.
- **Trục không đứt**: ô "Ở đâu" của `StopRow` là `grid` để kéo hết chiều cao hàng.
- Bỏ "—" ở cột "Làm gì" trống (gần như mọi hàng đều trống — chỉ là nhiễu).
- Cảnh báo của ngày và tiêu đề cột có khoảng thở (`StopHeader` `mt-6`).
- ~~Còn treo: ô ngày khởi hành~~ — đã thay ở §12m.

## 12i. Việc THUỘC nơi — `TripItem.parentId` (2026-10-25, biên tập chọn)

Thay cho §12e/§12f chỗ "gom suy ra từ thứ tự": quan hệ "nơi → việc" giờ **lưu thật**. Kéo một nơi
là kéo cả hàng, việc của nó đi theo. Migration `trip_item_parent`.

- **Đúng 2 mức.** Mục gốc (`parentId = null`) = một HÀNG; việc (`parentId` = id mục gốc) nằm ở cột
  "Làm gì" của hàng đó. `order` của mục gốc đếm trong NGÀY, của việc đếm trong CHA (`Scope` +
  `scopeWhere()` trong `actions.ts`). `dayId` của việc luôn = của cha — `moveItem` dời cha sang
  ngày khác thì `updateMany` các con theo.
- **Đọc ra luôn PHẲNG** (`flatten()` trong `lib/trip.ts`): gốc rồi ngay sau là con. Nhờ vậy tính
  giờ / bản đồ / trang xem không phải biết gì về cây. Mục con mà cha không cùng vùng ⇒ coi như gốc.
- Mục gốc là việc / hoạt động (không có nơi) ⇒ hàng `PlaceStub`, chính nó đứng đầu cột "Làm gì"
  và cầm tay kéo của cả hàng. `anchorsOf()` không còn dùng lúc hiển thị (chỉ còn cho script chuyển).
- **Kéo–thả** (`trip-dnd.ts`): vùng gốc `backlog` / `day:X` chỉ chứa mục gốc; việc nằm ở
  `in:<id>` (luôn có, kể cả rỗng). `canBeDoing()` = hoạt động hoặc việc tự thêm — **nơi không chui
  vào nơi khác**, mục đang có việc cũng không; kéo chúng qua cột "Làm gì" thì `resolveOver()` đổi
  thành vị trí của CẢ HÀNG đó.
  · ⚠️ `collide` (trang soạn): chuột nằm trong cột / việc nào thì lấy đúng nó trước,
    `closestCorners` sau — cột "Làm gì" nằm trong một hàng lớn hơn nó nhiều, dò theo góc thì cả
    hàng luôn thắng và việc thả vào cột trống của nơi khác rơi thành hàng riêng.
- **Thêm** (`AddPos` = `at` cho NƠI mới + `parent` cho VIỆC): "+ Thêm việc" và dấu + trên trục sau
  hàng k ⇒ việc vào hàng k, nơi thành hàng mới. Thêm một nơi xong thì `parent` chuyển sang CHÍNH nơi
  đó — gõ "Chợ" rồi "Mua hải sản" là ra đúng một hàng. Hoạt động của site là việc khi có `parent`.
- **Bỏ một nơi KHÔNG bỏ việc của nó**: việc đứng ra thành mục gốc ngay chỗ nơi đó (`removeItem`).
  `moveItemToTrip` mang việc theo; `cloneTrip` nối lại cha bằng id mới; ngăn nổi chỉ xếp mục gốc,
  ghi "kèm N việc".
- ⚠️ **DEPLOY: chạy `scripts/backfill-trip-item-parents.ts` MỘT LẦN** sau migration (chạy `--dry`
  trước). Nó gom như cách lịch đang hiển thị. Phải đọc dữ liệu **đúng kiểu trang đọc** (items của
  cả chuyến, `orderBy: order`) — bản đầu hỏi riêng từng ngày và xáo một ngày có `order` TRÙNG trên
  dữ liệu dev (đã khôi phục tay theo ảnh chụp). Script in cảnh báo cho mọi ngày có `order` trùng —
  xem lại các ngày đó bằng mắt.

## 12j. "Làm gì" xếp DƯỚI nơi, không còn cột ngang (2026-10-25, biên tập chọn)

Thay bố cục hai cột của §12f: mỗi hàng là **nơi, rồi ngay dưới là các việc**, thụt thẳng theo nội
dung của nơi, trục vẽ tiếp xuyên qua (`STACKED_RAIL`, `DOINGS_INDENT` trong `trip-rail.tsx`) —
ở MỌI khổ, như bản điện thoại cũ. Bỏ tiêu đề cột "Ở đâu / Làm gì" (`StopHeader` đã xoá).

- Nơi chưa có việc ⇒ phần dưới **cao 0** (`hasDoings=false`). Chỉ khi **đang kéo một VIỆC**
  (`draggingDoing`: hoạt động / việc tự thêm, không có việc con) phần đó mới có chiều cao thật và
  khung thả nét đứt nở ra (`DoingsColumn armed`) — cao 0 thì khung bị hàng kế tiếp đè. Kéo một
  NƠI thì KHÔNG mở (nó không bao giờ vào được nơi khác; bản đầu mở cho mọi cú kéo nên kéo địa điểm
  cũng hiện khung "việc" dưới mọi nơi). `MeasuringStrategy.Always` vì bố cục đổi khi bắt đầu kéo.
- **Kéo CẢ HÀNG ⇒ mọi hàng thu gọn** (`collapsed`): việc ẩn, thay bằng dòng "kèm N việc". Nơi
  nhiều việc kéo đi là một khối rất dài, cả ngày dài gấp mấy lần — thu lại thì chỉ còn xếp các
  nơi. Kéo một VIỆC thì giữ nguyên (cần thấy chỗ để thả).
  · Thu gọn **ngay lúc NHẤN** tay kéo của hàng (`pressRow`, `onPointerDown` bọc quanh listener của
    dnd-kit), không đợi chuột dịch đủ ngưỡng kích hoạt. ⚠️ Hàng phía trên thu lại làm hàng đang
    nhấn NHẢY LÊN khỏi con trỏ ⇒ `useLayoutEffect` cuộn bù đúng khoảng đó (`[data-stop-row=id]`).
- **Mục của site vs mục tự gõ**: mục của site có trang ⇒ tên là liên kết **gạch chân chấm**; ô
  ký hiệu khi chưa có ảnh **nền đặc**. Mục tự gõ ⇒ ô ký hiệu **viền nét đứt, không nền** (cùng kiểu
  dòng "tự thêm" trong hộp thêm). Quán ăn không có trang riêng nên tên không gạch chân, nhưng ô
  vẫn nền đặc.
- ⚠️ `collide` theo CHUỘT, ba tầng: ① việc / cột "Làm gì" dưới chuột ② đang kéo một VIỆC mà chuột
  ở trên một hàng ⇒ vào việc của hàng đó (thả đâu trên hàng cũng được; không thì việc bị đổi thành
  hàng riêng mỗi lần lướt qua một hàng) ③ kéo cả hàng ⇒ hàng dưới chuột. Hàng giờ cao nên
  `closestCorners` (theo góc) làm hàng to luôn "gần chính nó nhất" và không chịu đổi chỗ — chỉ còn
  là phương án cuối.

## 12k. Nút ở đâu thì thêm đúng thứ ở đó (2026-10-25, biên tập yêu cầu)

`AddPos.mode` quyết định hộp thêm cho thêm GÌ:

| Lối vào | `mode` | Cho thêm |
|---|---|---|
| Dấu + trên trục giữa hai hàng · ⋯ "Thêm phía trước/sau" của một HÀNG · nút ngày trống | `place` | địa điểm / quán / chỗ ở của site, **Nơi: …**, form "nơi kèm việc" (bắt buộc có ở đâu) |
| Nút **+ Việc** của một hàng · ⋯ trước/sau của một VIỆC | `doing` | hoạt động, việc mẫu, **Việc: …**, form chỉ "làm gì + bao lâu" — vào ĐÚNG nơi đó |
| Ô tìm ở cột Chưa xếp ngày · ngăn nổi | `any` | mọi thứ (như cũ) |

- Bản trước: dấu + và nút "Thêm việc" mở CÙNG một hộp nên bấm "Thêm việc" vẫn thêm được một nơi
  mới ở chỗ khác — sai với vị trí người ta vừa bấm.
- **"+ Việc" nằm trong cụm nút của nơi** (cạnh tay kéo và ⋯, hiện khi rê / luôn hiện trên màn
  cảm ứng; dưới `sm` chỉ còn dấu +). Bản `absolute` ở đáy hàng đã bỏ.
- Dấu + trên trục nằm **GIỮA HAI CHẤM SỐ** (① ↔ ②; hàng cuối: giữa chấm và đáy trục) — biên tập
  chọn: nó thuộc về ĐƯỜNG TRỤC, không thuộc khoảng trắng giữa hai hàng. Nơi có nhiều việc thì dấu +
  rơi ngang tầm các việc, nhưng bấm vẫn chèn nơi mới SAU cả hàng trên (sau mọi việc của nó).
  Đã thử và BỎ: canh giữa khoảng trắng giữa hai hàng.

## 12l. Trục dọc (2026-10-25, biên tập yêu cầu "hiện đại hơn")

- **Mốc số VUÔNG bo 5px, viền `primary`, nền trắng, số `primary-ink` đậm** — thay chấm tròn
  xanh đặc (vừa nặng, vừa trái luật "không `rounded-full`" của §3). Hàng chưa rõ nơi: ô vuông rỗng
  nhỏ viền xám.
- **Trục 2px.** Nét LIỀN = đang ở một chỗ; **nét ĐỨT = đoạn đi** (`RailLeg`, `Rail dashed`) —
  nhìn trục là thấy ngày chia thành ở / đi.
- **Mỗi việc một mốc vuông 7px trên trục**, ngang dòng giờ của nó (đặt trong ô giờ của
  `DoingRow`, lùi về đúng toạ độ trục = `DOINGS_INDENT` − tâm trục). ⚠️ Ô giờ phải `self-start`:
  để kéo giãn theo cả dòng thì `top-1/2` rơi xuống giữa dòng, mốc lệch khỏi chữ giờ.

## 12m. Thanh đầu trang soạn — `TripTopbar` (2026-10-25)

Tên chuyến (rê thì có nền nhẹ = sửa được) + **một hàng CHIP** (`CHIP`: viền, cao 36px, icon +
giá trị; bấm mở bảng chỉnh) + số liệu "3 ngày  33 mục" dạt mép phải, chữ thường (bản cũ in hoa
giãn chữ lẫn vào hàng ô nhập).

- **Ngày đi** (`DateChip` + `MonthGrid` tự dựng — dự án chưa có component lịch, không thêm gói):
  chip hiện cả KHOẢNG "T5 12/11 → T7 14/11/2026" (theo số ngày), lịch tuần bắt đầu **thứ Hai**,
  tô cả khoảng ngày của chuyến. Bỏ `<input type="date">` vì ra "mm/dd/yyyy" theo ngôn ngữ máy.
  ⚠️ Ngày đi/ra là NGÀY LỊCH: đọc/ghi bằng `Date.UTC` (`parseDay`/`isoDay`), đừng để múi giờ máy
  lệch một ngày. "Hôm nay" lấy theo `Asia/Ho_Chi_Minh`.
- **Số người** (`PartyChip`): nút − / +, đóng bảng là lưu — nhưng ⚠️ CHỈ khi người dùng đã bấm
  −/+ (`touched`): chưa có số người mà mở rồi đóng thì không được tự ghi số khởi điểm 2.
- **Tự tính đường đi**: giữ công tắc, gói vào cùng kiểu chip.
- **Nền — "bàn + tờ"** (`TripShell canvas`, chỉ trang soạn): cả khu nằm trên MỘT nền `--canvas`
  (`#f4f4f2`, tối: tối hơn `--background`), phần đầu và cột trái đứng thẳng trên nền đó (cột trái
  KHÔNG có khối nền riêng; mục nav đang mở là một mảnh trắng), lịch trình là **tờ trắng** nổi lên
  bằng bóng rất nhẹ (không viền). Dưới `sm` tờ tràn hết bề ngang.
  · Đã thử và BỎ: dải `band` chỉ sau phần đầu + khối `muted/40` cho cột trái + cột giữa trắng —
    ba mảng màu (hai tông kem khác nhau) ra vá víu. Chip để NỀN TRẮNG để nổi trên nền.

## 13. Còn thiếu / cố ý chưa làm

| Việc | Ghi chú |
|---|---|
| **Lưu offline** | §9.4 — chưa làm. Lịch trình cần nhất lúc mất sóng mà lại bắt đăng nhập + đọc DB. Hướng: nút "Lưu để dùng offline" ghi snapshot JSON vào IndexedDB. |
| `PostRef.tripId` | Chưa thêm — blog chưa trỏ thẳng vào lịch trình mẫu được. |
| Toạ độ **tỉnh** | 62/63 tỉnh chưa có `lat/lng`. Mục kiểu "Tỉnh" trong lịch trình sẽ hiện cảnh báo ⚪. Nhập tay trong CMS hoặc bổ sung bảng tra. |
| Ước tính chi phí | **Cố ý bỏ** (§9.3) — đừng thêm lại nếu chưa có dữ liệu giá thật. |
