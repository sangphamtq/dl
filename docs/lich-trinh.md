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

### "Chuyến đang lên lịch trình"

Có nhiều chuyến thì mỗi lần bấm lại hỏi "chuyến nào" là quá phiền. Giải: một người có
nhiều chuyến nhưng tại một thời điểm chỉ **đang lên lịch cho MỘT chuyến**, lưu id chuyến
đó trong **cookie** (`halivivu_trip`); bấm Thêm là vào thẳng Túi đồ của nó.

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
   ≥2 chuyến) → chọn chuyến → `moveItemToTrip` chuyển mục sang Túi đồ chuyến đó **và**
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
2. ✅ **Trình soạn** `/lich-trinh/[id]` — túi đồ, ngày, đổi thứ tự, bản đồ.
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
| UI soạn | `src/components/trip/trip-editor.tsx` | Dòng thời gian, Túi đồ, đổi thứ tự, sửa thời gian ở lại |
| UI đọc | `src/components/trip/trip-view.tsx` | Bản chỉ đọc dùng cho chia sẻ + mẫu |
| Bản đồ | `src/components/trip/trip-map{,-inner}.tsx` | Pin **đánh số theo thứ tự** + tuyến của MỘT ngày |
| Chia sẻ | `src/components/trip/trip-share.tsx` | Công tắc bật/tắt + QR + copy (khuôn `StayShare`) |
| Nút thêm | `src/components/site/add-to-trip-button.tsx` | Gắn ở hero điểm đến (2 biến thể), hero địa điểm, trang hoạt động, trang lưu trú, popup quán ăn, popup lưu trú |
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
| **Kéo–thả** sắp lại mục | Đang dùng **nút ▲▼ + menu "Chuyển sang ngày"**. Cố ý: kéo–thả xuyên vùng chứa mà không thư viện thì rất dễ vỡ trên cảm ứng, trong khi giá trị của tính năng nằm ở dòng thời gian + cảnh báo. Muốn làm thật thì thêm `@dnd-kit`. |
| **Lưu offline** | §9.4 — chưa làm. Lịch trình cần nhất lúc mất sóng mà lại bắt đăng nhập + đọc DB. Hướng: nút "Lưu để dùng offline" ghi snapshot JSON vào IndexedDB. |
| Sửa **tiêu đề/ghi chú của ngày** và **ghi chú của mục** | Schema có (`TripDay.title/note`, `TripItem.note`), trang chỉ-đọc đã hiện, nhưng trình soạn chưa có ô nhập. |
| `PostRef.tripId` | Chưa thêm — blog chưa trỏ thẳng vào lịch trình mẫu được. |
| Toạ độ **tỉnh** | 62/63 tỉnh chưa có `lat/lng`. Mục kiểu "Tỉnh" trong lịch trình sẽ hiện cảnh báo ⚪. Nhập tay trong CMS hoặc bổ sung bảng tra. |
| Ước tính chi phí | **Cố ý bỏ** (§9.3) — đừng thêm lại nếu chưa có dữ liệu giá thật. |
