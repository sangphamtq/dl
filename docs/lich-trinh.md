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
| `/lich-trinh/cua-toi/[id]/[muc]` | Chủ sở hữu — ghi chú · đồ · chi phí | noindex |
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

### 7a. Trang danh sách `/lich-trinh` — DẢI MỞ ĐẦU + BỘ DUYỆT + LƯỚI THẺ

Bố cục: dải mở đầu (chữ trái, ảnh mờ dần bên phải) → **thanh công cụ nổi** cưỡi lên mép dưới
của dải → **chip điểm đến** → số kết quả + đổi kiểu xem → **lưới thẻ** (đổi được sang danh
sách) → *Tải thêm* → dải **bốn cam kết** + lối sang phần tự xếp.

Phần tương tác nằm ở `src/components/trip/trip-browser.tsx` (client); trang vẫn là Server
Component, chỉ lấy dữ liệu rồi dựng dải mở đầu và dải cuối. Số mẫu xuất bản đếm trên đầu
ngón tay nên **lọc ở client là đủ** — khỏi một vòng server cho mỗi lần bấm chip.

#### Mọi ô điều khiển đều mọc từ dữ liệu thật

`Trip` **không có `category`, không có `tags`, không có đánh giá**. Vì vậy bản dựng KHÔNG có
hàng chip "sở thích" (Biển đảo · Trekking · Food tour…) và KHÔNG có sao/điểm trên thẻ — hai
thứ đó chỉ dựng được bằng cách bịa. Với một site mà cả một mục (`/kiem-tra`, huy hiệu xác
minh ở Lưu trú) tồn tại để chống thông tin giả thì một hàng `★ 4.8 (128)` bịa là thứ đắt
nhất có thể mất. Ba trục còn lại đều đọc thẳng từ dữ liệu, và **ô nào chỉ có một giá trị thì
tự ẩn**:

| Ô | Nguồn |
|---|---|
| Chip **điểm đến** | `Trip.placeId` — nhóm tự nhiên nhất của lịch trình mẫu |
| **Số ngày** | `days.length`, câu hỏi đầu tiên của người xếp lịch |
| **Sắp xếp** | Nổi bật (giữ thứ tự server) · Ít ngày trước · Nhiều ngày trước |

Cũng bỏ **nút trái tim** trên thẻ: site chưa có tính năng lưu chuyến của người khác, một
trái tim không làm gì thì tệ hơn là không có.

#### Thẻ KHÔNG CÓ HỘP

Bản đầu của thẻ là đúng khuôn mặc định của mọi trang liệt kê trên đời: hộp trắng bo góc có
viền và bóng khi rê chuột, ảnh dán trên nóc, một viên kính *"3 ngày 2 đêm"* ở góc ảnh, rồi
tên → hai dòng mô tả → hàng chip màu → hàng chân có icon bên trái và con số bên phải. **Không
mảnh nào trong đó nói rằng thứ đang xem là một lịch trình** — thay ảnh và chữ là nó thành thẻ
khách sạn, thẻ khoá học, thẻ bất động sản.

| Bỏ | Thay bằng |
|---|---|
| Viền + bóng + nền thẻ | Ảnh và chữ đặt thẳng trên nền trang (đúng quy ước đã chốt ở popup Quán ăn: hộp dành cho thứ khác hẳn về vật liệu, không phải để gói mọi thứ cho gọn) |
| Viên kính "3 ngày 2 đêm" trên ảnh | Một dòng nhãn `3 NGÀY 2 ĐÊM │ BÌNH THUẬN` — một dòng chữ thay cho một miếng dán, và gộp hai dữ kiện từng nằm ở hai chỗ hai chất liệu |
| Hàng chip màu | **Bảng ngày có kẻ chỉ**: mỗi dòng là một ngày thật (`01` · tên ngày · số điểm dừng) |
| Hàng chân "tổng n điểm dừng" | Bỏ hẳn — cột phải của bảng đã liệt kê từng ngày, cộng lại là ra |

Bảng ngày dùng `mt-auto` để **bị đẩy xuống đáy thẻ**: các thẻ trong cùng một hàng lưới có
bảng thẳng hàng nhau dù tên chuyến dài ngắn khác nhau. Và `max-w-xl` — chỉ có tác dụng ở kiểu
DANH SÁCH, nơi cột chữ rộng cả nghìn pixel; không chặn thì tên ngày và số điểm dừng dạt về
hai mép cách nhau gần 900px.

Kiểu danh sách ngăn nhau bằng **kẻ chỉ** (`divide-y`) chứ không phải khoảng cách: thẻ đã bỏ
vỏ hộp, chỉ cách nhau một khe thì bảng ngày của mục trên chạy thẳng vào dòng nhãn của mục dưới.

#### Ảnh

- **Ảnh dải mở đầu KHÔNG được trùng ảnh bìa của bất kỳ thẻ nào bên dưới** — cùng một tấm
  hiện hai lần trong một màn hình thì dải mở đầu đọc ra như một cái thẻ bị phóng to. Thẻ chỉ
  dùng ảnh bìa của chuyến, nên ảnh dải lấy từ **điểm dừng trong ngày** (vẫn là ảnh của đúng
  chuyến đó).
- Ảnh dải phải tan ở **cả mép trái lẫn mép dưới** (`mask-image` + một lớp gradient nền), nếu
  không dải màu cắt ngang ảnh bằng một đường thẳng.
- ⚠ **Mẫu chưa có ảnh bìa: KHÔNG mượn `coverUrl()`** (ảnh giữ chỗ picsum). Đã thử và bỏ —
  mẫu Tà Xùa, một chuyến LÊN NÚI SĂN MÂY, nhận về một tấm **bờ biển bão tố**. Chỗ ảnh vẽ
  thứ có thật thay thế: **N nốt tròn đánh số nối nhau bằng nét đứt** = chuyến này dài mấy
  ngày, bằng chính hoạ tiết tuyến đường của dự án. Nốt phải đủ LỚN (`size-10 sm:size-12`) —
  bản đầu để `size-3` thì cả tấm 448×298 chỉ có hai chấm tí xíu ở giữa, đọc ra là ảnh hỏng.

#### Chi tiết phải giữ

- **Ô tìm kiếm có trần bề ngang (`sm:max-w-md`), cụm ô chọn dồn về mép phải.** Để ô tìm kiếm
  ăn hết `flex-1` thì ở màn 1440 nó thành một ô trống dài 1000px.
- **`<select>` thật của trình duyệt** cho Số ngày / Sắp xếp (lớp chữ hiển thị nằm dưới, select
  trong suốt phủ lên): trên điện thoại nó mở bộ chọn của hệ điều hành, và bàn phím / trình đọc
  màn hình có sẵn mọi thứ.
- **Đổi bộ lọc thì kéo danh sách về trang đầu** (`reset()`): đang mở 18 mục rồi lọc còn 2 thì
  nút *Tải thêm* biến mất mà người dùng không hiểu vì sao.
- **Bốn cam kết ở dải cuối phải ĐÚNG.** Bản phác có *"Hỗ trợ 24/7"* và *"Đánh giá từ người đi
  trước"* — site không có tổng đài, lịch trình mẫu không có đánh giá nào. Bốn dòng đang dùng
  đều kiểm lại được bằng chính mã nguồn: do biên tập soạn · có giờ ước tính · sao về rồi sửa ·
  xem không cần đăng nhập.
- **Mẫu RỖNG không lên trang công khai** — `where` đòi `days: { some: { items: { some: {} } } }`.
  Một mẫu vừa tạo trong CMS lọt ra đây thì trang đang mời khách xem một lịch trình không có
  gì. Biên tập vẫn thấy nó ở `/cms/lich-trinh`. KHÔNG dùng `items: { some: {} }` — `items`
  tính cả mục còn trong túi *Chưa xếp ngày*.
- **Số điểm dừng cộng từ CHÍNH các ngày**, không lấy `Trip._count.items` (mẫu Phan Thiết:
  21 mục nhưng chỉ 17 nằm trong ba ngày).
- **`h1` KHÔNG lặp lại chữ của breadcrumb**, và con số nằm trong ngữ pháp chứ không xếp thành
  một hàng số liệu (cùng quy ước với `/diem-den`).
- **Container `max-w-7xl px-4 sm:px-6`** — đúng bằng container của header.

> **Tông header:** `/lich-trinh` và `/lich-trinh/cua-toi` đã vào `LIGHT_ROUTES`
> (`src/lib/site-chrome.ts`). Hai trang mở bằng nền sáng mà header lấy mặc định `dark` thì
> tint `black/20` ra một vệt xám ~#cacaca vắt ngang đầu trang, chữ trắng trên đó chỉ ~1.7:1.

> **Các bản đã dựng rồi thay** (đọc lịch sử git nếu cần lấy lại): ① lưới thẻ + nền
> `from-sky-100` + vòng tròn đồng tâm — bản đầu, ba lỗi §6a lặp lại ở trang index; ② trang đôi
> ảnh lớn + khung ngày dạng ray dọc; ③ cột lề dính + dải phim theo ngày; ④ mục lục đánh số +
> tuyến đường nốt tròn.

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
| Vỏ chung | `src/components/trip/trip-shell.tsx` · `trip-day-strip.tsx` · **`trip-rail.tsx`** | Khung BA CỘT tràn viền · dải chọn ngày · **dòng thời gian dạng ray** — dùng chung cả ba trang (§6a) |
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

## 13. Còn thiếu / cố ý chưa làm

| Việc | Ghi chú |
|---|---|
| **Lưu offline** | §9.4 — chưa làm. Lịch trình cần nhất lúc mất sóng mà lại bắt đăng nhập + đọc DB. Hướng: nút "Lưu để dùng offline" ghi snapshot JSON vào IndexedDB. |
| `PostRef.tripId` | Chưa thêm — blog chưa trỏ thẳng vào lịch trình mẫu được. |
| Toạ độ **tỉnh** | 62/63 tỉnh chưa có `lat/lng`. Mục kiểu "Tỉnh" trong lịch trình sẽ hiện cảnh báo ⚪. Nhập tay trong CMS hoặc bổ sung bảng tra. |
| Ước tính chi phí | **Cố ý bỏ** (§9.3) — đừng thêm lại nếu chưa có dữ liệu giá thật. |
