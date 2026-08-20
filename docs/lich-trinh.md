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
  slug       String? @unique               // CHỈ template — /lich-trinh/mau/[slug]
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

| Route | Ai xem | Index? |
|---|---|---|
| `/lich-trinh` | Chủ sở hữu — danh sách chuyến + gợi ý mẫu | noindex |
| `/lich-trinh/[id]` | Chủ sở hữu — **trình soạn** | noindex |
| `/lich-trinh/s/[shareId]` | Ai có link — **chỉ đọc** | noindex |
| `/lich-trinh/mau/[slug]` | Công khai — **lịch trình mẫu** | ✅ index, SEO chính |

- `lich-trinh` phải thêm vào **danh sách tiền tố dành riêng** trong `CLAUDE.md` §URL.
- ⚠️ **Va chạm `sw.js`:** `NEVER_CACHE` khớp theo **prefix**, nên thêm `/lich-trinh` sẽ
  chặn luôn `/lich-trinh/mau/...` (công khai, rất đáng cache). Phải sửa `isPrivate()`
  trong `public/sw.js` để có allowlist đi trước — và **nhớ tăng `VERSION`**.

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

## 6. Bố cục — BA CỘT TRÀN VIỀN

Dùng chung cho **cả ba** trang (soạn · bản chia sẻ · lịch trình mẫu) qua
`components/trip/trip-shell.tsx`. Ba trang là anh em — người dùng bấm "Dùng lịch trình
này" là đi thẳng từ trang mẫu sang trang soạn, nên khung lệch nhau lộ ngay.

```
┌ header TRÀN VIỀN: tên · ngày đi · số người · chia sẻ ─────────────────┐
├────────────┬────────────────────────────┬─────────────────────────────┤
│ Chưa xếp 4 │ [Ngày1][Ngày2 ●]   👁 Hiển │                             │
│          « │                            │  BẢN ĐỒ của NGÀY ĐANG CHỌN  │
│ □ Hòn Rơm  │ Ngày 2  T7 12/9  🌅 4:30 → │      ②────①                 │
│ □ Làng chài│  ① 4:30  Đồi cát bay       │       │      ○ ← chấm mờ:   │
│ □ Suối Tiên│     ↓ 12 phút di chuyển    │      ③       mục chưa xếp   │
│ + tự thêm  │  ② 6:00  Bàu Trắng         │                             │
└────────────┴────────────────────────────┴─────────────────────────────┘
   14rem · thu gọn được thành thanh 2.75rem
```

- **KHÔNG giới hạn bề ngang.** Vỏ `(site)` vốn không chặn; giới hạn cũ (`max-w-7xl`) nằm
  ngay trong hai component lịch trình, đã bỏ.
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
| Dải `from-sky-100/70 to-background` làm header cả ba trang | Không nói gì, chỉ tô màu — dán vào trang nào cũng vừa | Trang công khai: **ảnh bìa tràn viền + tên bằng font display**. Trang soạn: bỏ hẳn nền, phân cấp bằng **chữ** (eyebrow micro cam + display + vạch dọc ngăn dữ kiện) |
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

## 6c. Kéo–thả

`@dnd-kit` (core + sortable + utilities). Bài toán là **sortable nhiều vùng chứa**: cột Chưa xếp ngày
và mỗi ngày là một vùng; kéo được cả trong một vùng lẫn giữa các vùng.

### Tay cầm & cho khách BIẾT là kéo được

Bản đầu chỉ lấy **nút tròn đánh số** làm tay cầm, không kèm dấu hiệu nào: máy tính chỉ đổi
con trỏ khi rê trúng, còn cảm ứng thì **không có tín hiệu gì**. Tối giản đến mức **giấu mất
tính năng** thì không phải tối giản. Hiện tại:

- **Nút grip nhìn thấy được** (`GripVertical` = `drag-indicator` của Material Symbols, thêm
  qua `scripts/build-icons.mjs` — **KHÔNG sửa tay `icons.tsx`**) là tay cầm chính, và là tay
  cầm cho **bàn phím** (nhận `attributes` + `listeners`). Hiện theo luật của hàng nút thao
  tác: rê chuột / tab tới mới hiện, máy cảm ứng thì luôn hiện.
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

## 7. Lịch trình mẫu — đòn bẩy mạnh nhất

- Soạn ở **`/cms/lich-trinh`** — dùng lại chính trình soạn ở §6, chỉ khác `isTemplate=true`
  + có `slug` / `status` / ảnh bìa.
- `/lich-trinh/mau/ha-long-3n2d` — công khai, chỉ đọc, nút lớn **"Dùng lịch trình này"**
  → deep-copy sang tài khoản người dùng (`isTemplate=false`, `startDate=null`, `slug=null`).
- **Cross-link:** trang `/diem-den/[slug]` hiện khối "Gợi ý lịch trình" lọc theo
  `Trip.placeId` — giải luôn bài toán *vào `/lich-trinh` lần đầu thấy trang trống*.
- Blog đã hứa "lịch trình gợi ý" (`src/app/(site)/blog/page.tsx`) → nối vào đây.

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
| Trang | `src/app/(site)/lich-trinh/{page,[id],s/[shareId],mau/[slug]}` | Danh sách · trình soạn · bản chia sẻ · lịch trình mẫu |
| Kéo–thả | `src/components/trip/trip-dnd.ts` | Bàn id theo vùng + `applyMove` (§6c) · kiểm bằng `pnpm check:trip-dnd` |
| Mục của chuyến | `src/lib/trip-sections.ts` · `trip-side-nav.tsx` · `trip-topbar.tsx` · `trip-soon.tsx` · `[id]/[muc]/page.tsx` | Sidebar 5 mục + route. **Ghi chú** · **Đồ mang theo** · **Chi phí** đã dựng (`trip-notes/packing/money.tsx`). Mục *Phân công* đã **bỏ hẳn** — xem [lich-trinh-cong-cu-nhom.md](lich-trinh-cong-cu-nhom.md) |
| Vỏ chung | `src/components/trip/trip-shell.tsx` · `trip-day-strip.tsx` · **`trip-rail.tsx`** | Khung BA CỘT tràn viền · dải chọn ngày · **dòng thời gian dạng ray** — dùng chung cả ba trang (§6a) |
| UI soạn | `src/components/trip/trip-editor.tsx` | Dòng thời gian, cột Chưa xếp ngày, đổi thứ tự, sửa thời gian ở lại |
| UI đọc | `src/components/trip/trip-view.tsx` | Bản chỉ đọc dùng cho chia sẻ + mẫu |
| Bản đồ | `src/components/trip/trip-map{,-inner}.tsx` | Pin **đánh số theo thứ tự** + tuyến của MỘT ngày |
| Chia sẻ | `src/components/trip/trip-share.tsx` | Công tắc bật/tắt + QR + copy (khuôn `StayShare`) |
| Nút lên lịch | `src/components/site/plan-trip-button.tsx` | CTA trang điểm đến (§6b) — `getPlanOptions` · `startTripForPlace` |
| Nút thêm | `src/components/site/add-to-trip-button.tsx` | Gắn ở hero địa điểm, trang hoạt động, trang lưu trú, popup quán ăn, popup lưu trú. **KHÔNG** ở trang điểm đến (§6b) |
| CMS | `src/app/cms/lich-trinh/**` | Danh sách + form xuất bản mẫu + ảnh bìa. **Nội dung ngày soạn ở trình soạn công khai** |
| Script | `scripts/backfill-place-coords.ts` | `pnpm backfill:place-coords` |

Sửa kèm ở nơi khác: `Place.lat/lng` (schema + form CMS + actions) · `Image.tripId` +
`lib/owner.ts` + enum của route uploadthing · `RESERVED_SLUGS` thêm `lich-trinh` ·
`sw.js` lên **v2** kèm `CACHE_ANYWAY` · `sitemap.ts` thêm mẫu · gỡ nhãn "Sắp có" khỏi
`site-header.tsx` và `mobile-menu-sheet.tsx` · khối "Gợi ý lịch trình" ở trang điểm đến ·
`.dl-trip-pin` trong `globals.css`.

> **Cách kiểm giờ ước tính ngoài trình duyệt:** script gọi `lib/trip.ts` sẽ vướng hai thứ —
> `import "server-only"` (không có trong node_modules gốc) và `unstable_cache` (ném
> `Invariant: incrementalCache missing` ngoài runtime Next). Cả hai đều **không phải lỗi
> code**: `getLegs()` bắt lỗi và rơi về ước lượng chim bay. Muốn chạy thì stub
> `server-only` qua `NODE_PATH` và chấp nhận mọi chặng đều `approx`.

## 13. Còn thiếu / cố ý chưa làm

| Việc | Ghi chú |
|---|---|
| **Lưu offline** | §9.4 — chưa làm. Lịch trình cần nhất lúc mất sóng mà lại bắt đăng nhập + đọc DB. Hướng: nút "Lưu để dùng offline" ghi snapshot JSON vào IndexedDB. |
| `PostRef.tripId` | Chưa thêm — blog chưa trỏ thẳng vào lịch trình mẫu được. |
| Toạ độ **tỉnh** | 62/63 tỉnh chưa có `lat/lng`. Mục kiểu "Tỉnh" trong lịch trình sẽ hiện cảnh báo ⚪. Nhập tay trong CMS hoặc bổ sung bảng tra. |
| Ước tính chi phí | **Cố ý bỏ** (§9.3) — đừng thêm lại nếu chưa có dữ liệu giá thật. |
