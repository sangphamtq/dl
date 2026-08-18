# Lịch trình chuyến đi — thiết kế

> Tài liệu thiết kế cho chức năng **Lịch trình** (`/lich-trinh`). **CHƯA TRIỂN KHAI** —
> mọi thứ dưới đây là quyết định đã chốt + phần còn treo, viết ra để lần sau bám theo
> mà không phải phân tích lại từ đầu.
>
> Trạng thái: **phân tích xong, chờ chốt 6 mục ở §9 trước khi viết code.**
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
  placeId? spotId? eateryId? accommodationId? activityId?

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
2. **Túi đồ = `dayId` null.** Người dùng *gom trước, xếp sau*. Bắt chọn ngày ngay lúc bấm
   "thêm" là ma sát giết chết tính năng. Đây là lý do `dayId` nullable chứ không phải
   thiếu sót.
3. **Mục tự nhập là bắt buộc có ở v1.** Thiếu nó thì lịch trình luôn *dở dang* (không ghi
   được chuyến bay, nhà người quen) và bị bỏ giữa chừng.
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
3. Quay về → **tự thêm** + toast "Đã thêm vào Túi đồ · Xem lịch trình".

### "Chuyến đang mở"

Có nhiều chuyến thì mỗi lần bấm lại hỏi "chuyến nào" là quá phiền. Giải: lưu
`activeTripId` trong **cookie**; bấm là thêm thẳng vào chuyến đang mở, toast kèm nút
"Đổi chuyến". Chưa có chuyến nào → tự tạo "Chuyến đi của tôi".

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

## 6. Màn hình soạn `/lich-trinh/[id]`

Dùng lại đúng khuôn hai cột của `src/components/map/map-explorer.tsx`, kể cả cơ chế
`mobileView: "list" | "map"`:

```
┌ Trái: dòng thời gian ──────────────┐┌ Phải: bản đồ ─────────┐
│ Ngày 1 · T7 12/9 · bắt đầu 08:00   ││  pin đánh số 1..n     │
│  ① 08:00 Hang Sửng Sốt      90′    ││  tuyến vẽ của NGÀY    │
│      ↓ 25 phút lái                 ││  ĐANG CHỌN            │
│  ② 10:15 Chả mực Bà Tình 🔴 chưa mở││                       │
│  ...                               ││                       │
│ + Thêm từ Túi đồ (5)               ││                       │
└────────────────────────────────────┘└───────────────────────┘
```

- **Túi đồ** là panel gập ở đáy/cạnh, **không phải trang riêng** — phải nhìn thấy được
  ngay lúc đang xếp ngày.
- Bản đồ chỉ vẽ tuyến của **một ngày**. Vẽ cả chuyến 4 ngày thành mớ bòng bong.
- ⚠️ **Nút "Thêm vào lịch trình" ở v1 CHỈ đặt ở trang chi tiết + popup**, chưa đụng vào
  lưới card. Lý do: card lưu trú đã qua ba vòng cắt gọt và **đã bỏ NĂM bản nút luôn-hiện**
  (xem `CLAUDE.md` §Nơi lưu trú) — nhét thêm nút vào là đi ngược toàn bộ quyết định đó.
  Lưới là nơi khách đang *so sánh*, chưa phải lúc *chọn*. Khi nào làm, theo đúng cơ chế đã
  chốt ở đó: hiện khi `pointer:fine` hover / `focus-visible`, máy cảm ứng là viên nhỏ.

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

## 9. ⚠️ Phải chốt TRƯỚC khi viết dòng code đầu tiên

| # | Vấn đề | Đề xuất | Chốt? |
|---|---|---|---|
| 1 | **Nguồn định tuyến.** `src/lib/map-actions.ts` tự ghi chú "OSRM demo, KHÔNG dùng cho production". Lịch trình gọi nhiều gấp bội bản đồ. | Ma trận thời gian → **ORS** (đã có key + cache 30 ngày ở `lib/routing.ts`); OSRM chỉ còn vẽ hình tuyến. | ☐ |
| 2 | **`Place` không có `lat/lng`** — chỉ có bảng tra `src/lib/place-coords.ts` theo slug, không phủ hết. Mục kiểu `Place` sẽ thường xuyên rơi vào cảnh báo ⚪. | Thêm `lat/lng` vào `Place`, migrate từ `PLACE_COORDS`. Hoặc: chỉ cho thêm listing (có toạ độ) vào lịch trình. | ☐ |
| 3 | **"Ước tính chi phí"** đang hứa trong text placeholder của `/lich-trinh`. | **Bỏ khỏi v1.** `Eatery`/`Accommodation` **cố ý không có `priceRange`** ⇒ ước tính sẽ *sai một cách vô hình*, đúng cái bẫy `foodIntro`/`priceRange` mà `CLAUDE.md` đã ghi lại. Chỉ cộng `ticketTiers` và gọi đúng tên **"Vé vào cửa (ước tính)"**. | ☐ |
| 4 | **Offline.** DB + bắt đăng nhập ⇒ "mang theo khi đi" mất tác dụng, đúng lúc cần nhất. | v1.5: nút "Lưu để dùng offline" ghi snapshot JSON vào IndexedDB. | ☐ |
| 5 | **`BottomNav`** đang 4 mục (đã ẩn Cộng đồng để nhường chỗ). | Lịch trình có xứng một tab không, hay giữ nút ở header (`lich-trinh-nav-link.tsx`)? | ☐ |
| 6 | **Nút "Thêm" trên lưới card** | v1 chỉ ở trang chi tiết + popup (lý do ở §6). | ☐ |

## 10. Phân kỳ

1. **Schema + migration** — 3 bảng, `Image.tripId`, `Place.lat/lng`. Không UI.
2. **Trình soạn** `/lich-trinh/[id]`: túi đồ, ngày, kéo thả, bản đồ. Chưa cảnh báo.
3. **Máy tính giờ + cảnh báo** (§5) — *phần tạo ra giá trị thật*.
4. **Nút "Thêm vào lịch trình"** + luồng đăng nhập giữa chừng + chuyến đang mở (§4).
5. **CMS template** + `/lich-trinh/mau/[slug]` + khối gợi ý ở trang điểm đến (§7).
6. **Chia sẻ** + QR + nhân bản (§8).

> Bước **3 và 4 mới là chỗ ăn thua**; 1–2 chỉ là hạ tầng. Nếu hụt thời gian, thà chậm ở
> 5–6 còn hơn làm mỏng 3.

## 11. Hiện trạng liên quan (đã khảo sát 2026-08-18)

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
