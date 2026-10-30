# Lịch trình chuyến đi — thiết kế

> Tài liệu của chức năng **Lịch trình** (`/lich-trinh`): quyết định đã chốt, hiện trạng, và bẫy.
> Chỉ ghi **trạng thái hiện tại** — lịch sử từng lần đổi nằm trong git. "Đã thử và BỎ" chỉ giữ một dòng, để
> khỏi dựng lại. Bản đồ mã nguồn ở §12, phần còn thiếu ở §13. Cập nhật: **2026-10-30**.

## 1. Định vị — cái này KHÔNG phải TripIt

Cùng logic với `Accommodation` (danh bạ xác minh, không phải OTA):

- ✅ **TRONG:** gom điểm quan tâm → xếp theo ngày → **kiểm tra tính khả thi** (giờ mở cửa, thời gian di chuyển) →
  chia sẻ link → lịch trình mẫu do biên tập soạn. Công cụ nhóm (ghi chú · đồ mang theo · chi phí) xem
  [lich-trinh-cong-cu-nhom.md](lich-trinh-cong-cu-nhom.md); nhiều người cùng sửa xem [lich-trinh-cong-tac.md](lich-trinh-cong-tac.md).
- ❌ **NGOÀI:** đặt chỗ/thanh toán, đồng bộ vé máy bay/email, chat nhóm.

> **Lý do tồn tại:** site biết `openingHours`, `meals`, `bestTime`, `durationText`, `seasonText` — nên nói được
> **"quán này 21:00 đã đóng mà bạn xếp 21:30"**. Google Maps không nói được. Cắt scope thì cắt chỗ khác, đừng cắt
> phần cảnh báo khả thi.

## 2. Ba quyết định đã chốt

| Ngã rẽ | Đã chọn | Hệ quả |
|---|---|---|
| Lưu ở đâu | **DB ngay, bắt đăng nhập** | bài toán "đăng nhập giữa chừng" (§4) |
| Chi tiết ngày | **Thứ tự + giờ ước tính tự tính** | không nhập giờ từng mục; cần máy tính giờ (§5) |
| Phạm vi v1 | **Đầy đủ: chia sẻ + lịch trình mẫu** | CMS + trang công khai có SEO |

Đã loại (đừng quay lại khi chưa có lý do mới): *local-first không đăng nhập* (mất chia sẻ + mẫu) · *nhập giờ từng
mục* (ma sát, bỏ dở) · *danh sách đã lưu không có ngày* (mất cảnh báo khả thi).

## 3. Schema

Nguồn chân lý là `prisma/schema.prisma`; đây chỉ là các trường mang quyết định.

- **`Trip`**: `title` · `summary` · `startDate @db.Date` (null = chưa định ngày) · `partySize` (chỉ hiển thị) ·
  `shareId`/`visibility` · `isTemplate` + `slug` (chỉ mẫu) · `placeId` · **`autoTravel`** (mặc định bật, §5) ·
  `version` (cộng tác, §6c) · `originName` (**giữ cột, giao diện đã gỡ** "Đi từ đâu"; `cloneTrip` vẫn chép).
- **`TripDay`**: `index` (0-based) · **`startMin Int`** (phút từ 00:00, mặc định 480) · `title`/`note` (**chỉ mẫu**, §6d).
- **`TripItem`**: `dayId?` (null = **chưa xếp ngày**) · `order` · `stayMin?` (null = mặc định) · `note` ·
  exclusive arc `spotId | eateryId | accommodationId | activityId` **hoặc** mục tự thêm (`customTitle`, `customLat/Lng`,
  `customAddress`, `customPlace`) · **`parentId`** (thẻ hoạt động của một nơi, §6g) · **`special`** + `travelMode`,
  `travelFrom`, `travelTo`, `bookingCode` (mục đặc biệt, §6g).

**Điểm cố ý — đừng "dọn dẹp" mất:**

1. **`startMin` là phút, không phải `DateTime`** — khớp thẳng `openingStatus(intervals, phút)` ở `lib/opening-hours.ts`.
2. **`dayId` nullable có chủ đích**: gom trước, xếp sau. Bắt chọn ngày lúc bấm "thêm" là giết tính năng.
3. **Mục tự thêm là bắt buộc** — thiếu thì lịch trình luôn dở dang (chuyến bay, nhà người quen).
4. **`TripItem` KHÔNG có `placeId`** (§6b). `Trip.placeId` thì có: mẫu = "hiện ở trang điểm đến"; chuyến người dùng =
   "nơi đến" chọn lúc tạo. Đặt lúc tạo, **không bảo trì** — chỉ dùng làm gợi ý, đừng coi là chân lý phạm vi chuyến.
5. **Mẫu dùng chung bảng `Trip`** (cờ `isTemplate`). Nhân bản = deep-copy Trip → Days → Items.
6. **`customTitle = ""` (không null) cho mục đặc biệt để trống tên** — `customTitle != null` là dấu "mục tự thêm" ở
   `updateItem`; tên hiện ra ghép lúc đọc (`specialTitle`).
7. Enum `special` còn `checkout` dù **giao diện không còn thêm "Trả phòng"** — dữ liệu cũ vẫn đọc được (§6g).

⚠️ **DEPLOY** (theo thứ tự): migration `trip_origin` · `trip_item_address` · `trip_item_special`, rồi chạy **MỘT LẦN**
`scripts/migrate-trip-doings-to-tags.ts` (`--dry` trước; chạy lại không đổi gì): hoạt động con ⇒ thẻ (giờ CỘNG vào nơi
cha, thẻ mang `stayMin = 0` làm dấu), việc tự gõ con ⇒ mục gốc ngay sau nơi cha, giữ giờ.

## 4. URL & luồng đăng nhập

Ranh giới **CÔNG KHAI vs RIÊNG TƯ** nằm ngay trong đường dẫn:

| Route | Ai xem | Index |
|---|---|---|
| `/lich-trinh` | công khai — danh sách mẫu | ✅ |
| `/lich-trinh/[slug]` | công khai — một mẫu | ✅ SEO chính |
| `/lich-trinh/cua-toi` | chủ — chuyến của tôi | noindex |
| `/lich-trinh/cua-toi/tao` | chủ — **trang tạo chuyến** (§6h) | noindex |
| `/lich-trinh/cua-toi/[id]` · `/[id]/[muc]` | chủ — trang soạn · bản đồ · đồ mang theo · chi phí | noindex |
| `/lich-trinh/s/[shareId]` | ai có link — chỉ đọc | noindex |

- Cả nhánh riêng tư dưới **một** tiền tố `/cua-toi` ⇒ `sw.js` chặn cache bằng một dòng `NEVER_CACHE`.
- URL cũ redirect **vĩnh viễn**: `/lich-trinh/mau[/slug]` ở `next.config.ts`; `/lich-trinh/[cuid]` → `/cua-toi/[id]`
  tra trong `[slug]/page.tsx` (config không phân biệt được slug với cuid).
- ⚠️ `cua-toi` · `s` · `mau` là **slug dành riêng** của mẫu (`RESERVED_TRIP_SLUGS`, `lib/slug.ts`, kiểm ở CMS). Route
  tĩnh `tao` thắng `[id]`; id là cuid nên không đụng.

**Bấm "Thêm vào lịch trình" khi chưa đăng nhập** = một bức tường: dialog tại chỗ (không điều hướng) → ghi ý định vào
`sessionStorage` + `callbackUrl` về đúng trang → quay về thì **tự thêm** + toast.

**"Chuyến đang lên lịch trình"** = cookie `halivivu_trip`; bấm Thêm là vào thẳng mục chưa xếp ngày của nó. Bốn cách đổi:
mở trang soạn (`markTripPlanning`, cố ý **không** revalidate) · menu "…" ở `/cua-toi` · nút **"Đổi chuyến"** trong toast
(≥2 chuyến; `moveItemToTrip`) · tiêu đề ngăn nổi (§6f). Chưa có chuyến ⇒ tự tạo "Chuyến đi của tôi", không hỏi tên.
> ⚠️ Đừng gọi là "chuyến đang mở" — "đang mở" đã là **quán còn mở cửa**.

## 5. Máy tính giờ (phần lõi) — `lib/trip-time.ts`

```
t = day.startMin
cho từng mục GỐC theo order:          // thẻ hoạt động (parentId) không vào lịch
  arrive = t;  status = openingStatus(parseOpeningHours(openingHours), arrive)
  t += effectiveStayMin(item)
  t += chặng lái tới NƠI kế tiếp        // ORS matrix, cache 30 ngày
```

**Thời lượng mặc định** (`effectiveStayMin`, khi `stayMin = null`): địa điểm **90′** · quán **60′** · hoạt động đọc
`durationText` (không ra thì **120′**) · chỗ ở **0′** · mục tự thêm có toạ độ/địa chỉ **60′** · **việc 30′**
(`TASK_STAY_MIN`) · mục đặc biệt theo `SPECIAL_STAY`: di chuyển 120′ · nhận/trả phòng 15′ · bữa ăn 60′ · nghỉ 60′.
Thời gian ở một nơi là **TỔNG** — gồm mọi hoạt động gắn vào nó.

**Nơi vs việc** (`isTask`): mục tự thêm **không** địa chỉ, **không** toạ độ, **không** `customPlace` = một VIỆC ("Đặt xe",
"Chờ người") diễn ra tại nơi gần nhất phía trước. Việc không vào `getLegs`, không có chặng tới nó (`legHidden`), chặng đi
tiếp xuất phát từ nơi cuối phía trước (`legKey`), không cảnh báo thiếu toạ độ.

⚠️ **Ba chỗ CẮT chuỗi toạ độ** (`scheduleDay`) — thiếu là ra chặng sai vô hình:
- **Nơi không toạ độ** (nơi tự gõ, chưa geocode): `lastPlace` về null ⇒ chặng kế "chưa ước tính" thay vì mượn chặng từ nơi
  có toạ độ trước đó. `seenPlace` tách "chưa tới đâu" (ẩn chặng) khỏi "đang ở chỗ không rõ toạ độ" (vẫn hiện dòng chặng).
- **Di chuyển** tính theo THỜI LƯỢNG, không vẽ chặng lái tới / ra khỏi nó; sau nó `lastPlace`/`here`/`seenPlace` rỗng —
  không thì ra "lái xe từ Hà Nội tới bãi biển Mũi Né".
- **`autoTravel = false`**: không gọi ORS, giờ đến = giờ rời mục trước, không cảnh báo chặng. Cờ **theo CHUYẾN** (đổi giờ
  của cả lịch nên mọi người phải thấy như nhau), khác menu Hiển thị (theo người xem). ⚠️ `shape()` đọc
  `trip.autoTravel ?? true` — Prisma client cũ đọc ra `undefined`.

**Cảnh báo** (hiện ngay trên thẻ, không chôn trong panel):

| Mức | Điều kiện | Hiện |
|---|---|---|
| 🔴 | `closed` / `opensLater` tại giờ dự kiến | "Chưa mở lúc 7:15, mở 15:00" |
| 🟠 | `closingSoon` | "Chỉ còn 60 phút trước giờ đóng" |
| 🟠 | chặng lái > 90′ | "Chặng dài 1 giờ 50" |
| ⚪ | **nơi của site** thiếu toạ độ (lỗi dữ liệu), xét ở nơi đang đứng | "Không ước tính được đường đi" |

- **Không còn cảnh báo cấp ngày** (về muộn, ngày dài >12 tiếng) — biên tập bỏ: đi chơi 14–15 tiếng là thường.
- Ba cảnh báo về GIỜ kèm luôn giờ mở cửa trong cùng dòng (§6a).

**Hiệu năng** (`lib/trip-route.ts`): khoá cache ORS là **CẶP toạ độ** nên gần như mỗi lần đổi thứ tự sinh cặp mới (~0,8s
mỗi lời gọi chưa cache). Nên:
- **Ngân sách 300ms** (`ROUTE_BUDGET_MS`); quá hạn ⇒ ước lượng chim bay ×1.3 @38km/h, đánh dấu `approx` (UI hiện `~`).
  ⚠️ Lời gọi bỏ dở phải giao cho **`after()`** (serverless đóng băng hàm khi trả response ⇒ cache không bao giờ nạp), và
  `.catch` gắn **ngay trên promise gốc** (rejection không người nhận hạ tiến trình Node).
- `moveItem` đánh số lại cả vùng bằng **một** `UPDATE … FROM (VALUES …)`.
- Cột giờ chỉ mờ ở **ngày nguồn + đích**, chỉ khi chờ **>350ms** (`useDelayedFlag`). Mục chưa có giờ hiện `···`.
- Bước tiếp nếu vẫn chậm: tính lịch lạc quan ở client bằng chính `scheduleDay` (hàm thuần).

> Kiểm giờ ngoài trình duyệt: script gọi `lib/trip.ts` vướng `server-only` (stub qua `NODE_PATH=scripts/.shim`) và
> `unstable_cache` (ngoài Next ⇒ mọi chặng `approx`). Không phải lỗi code.

## 6. Bố cục trang soạn

Khung dùng chung cho **cả ba** trang (soạn · chia sẻ · mẫu) — `components/trip/trip-shell.tsx`, container `max-w-7xl`.

```
┌ (header site chìm, tông sáng) ──────────────────────────────────────────────┐
│ Tên chuyến (sửa tại chỗ)                                                     │
│ ◎ Phan Thiết  ▢ T6 06/11 – CN 08/11  ⚇ 2 người  ⇄ Tự tính đường đi  3 ngày 11 mục│
├────────────┬─────────────────────────────────────────────┬──────────────────┤
│ CHUYẾN ĐI ◫│ NGÀY 1●  NGÀY 2  NGÀY 3            👁 Hiển thị│ Ghi chú        ◫ │
│ Lịch trình │ ▌Ngày 1  Thứ 6, 6/11          🌅 6:00 – 16:45│ (ghi chú chuyến) │
│ Bản đồ     │  6:00 ▪ ✈ Hà Nội ┄┄┄┄┄┄ Phan Thiết            │                  │
│ Đồ mang theo│ 11:00 ① 🍜 Bánh canh chả cá Bà Lý   [ảnh mờ] │                  │
│ Chi phí    │       30′                                    │                  │
│ CHƯA XẾP   │       ⊞ Thêm vào ngày 1                      │                  │
└────────────┴─────────────────────────────────────────────┴──────────────────┘
   14rem, thu gọn 2.5rem      tờ TRẮNG trên nền band             gấp được
```

- **Header site = thanh TRẮNG dính trên đầu như mọi trang** (`chromeFor` trong `lib/site-chrome.ts` chỉ còn `overlay`; chế
  độ "chìm" `underlay` và header không dính ở trang lịch trình đã bỏ — biên tập: "header đang chìm"). ⚠️ Mọi thứ dính ở trang
  lịch trình lùi đúng `h-16` của header từ `lg`: thanh ngày `lg:top-16`; cột trái / phải / bảng công cụ `lg:top-22` +
  `calc(100dvh-7rem)`. Đổi hero của `/lich-trinh` thì sửa kèm danh sách `overlay`.
- **Đầu trang kiểu Notion, không ảnh**: tên chuyến to (`TitleField`, sửa tại chỗ — rê có nền, đang sửa viền + quầng
  `primary`; ⚠️ giữ `size={1}` và lớp đo `min-w-0 overflow-hidden`, không thì tràn 320px) + **hàng thuộc tính** không viền
  (`PROP`): chip **nơi đến** (link), **ngày đi** (`MonthGrid` tự dựng, tuần bắt đầu thứ Hai, tô cả khoảng ngày), **số
  người** (−/+; ⚠️ chỉ lưu khi đã bấm — `touched`), **Tự tính đường đi**, số liệu "3 ngày 11 mục" ở mép phải.
  · ⚠️ Ngày là NGÀY LỊCH: đọc/ghi bằng `Date.UTC` (`parseDay`/`isoDay`); "hôm nay" theo `Asia/Ho_Chi_Minh`.
  · KHÔNG `<input type="date">`/`type="time"`/`type="number"` — trình duyệt vẽ theo ngôn ngữ máy ("mm/dd/yyyy", "02:00 PM").
- **Nền**: cả trang `bg-band`; cột lịch là **tờ trắng** (từ `lg`: `R_CARD` + bóng mềm, không viền; dưới `lg` tràn bề ngang).
  Nội dung tab trải hết tờ trắng.
- **Cột trái** (14rem, thu gọn 2.5rem bằng glyph `panel-left`/`panel-right` — không dùng mũi tên ←/→): nhãn "Chuyến đi"
  + nút thu gọn cùng hàng; menu mục (đang mở = viên trắng + bóng mảnh + icon `warm`); khay **Chưa xếp ngày** (tấm trắng,
  ô tìm ở đầu, mỗi mục ảnh · tên · loại, nút **+ → Xếp vào Ngày N**). "Ghi chú" không còn trong menu (`hidden: true` trong
  `TRIP_SECTIONS` — `/ghi-chu` vẫn vào được).
  · ⚠️ Tay kéo/nút của mục trong khay **nổi đè mép phải** khi rê (`absolute`), không ẩn bằng `opacity` tại chỗ.
- **Cột phải = Ghi chú chuyến** (`TripNotes compact`) — mã đặt phòng, số tài xế là thứ cần tra NGAY lúc xếp lịch.
- **Thanh công cụ ngày** = thanh ngày + nút Hiển thị, cùng chất liệu khay `TOOLBAR_TRAY` (foreground 5%, `trip-fields.tsx`)
  nên đọc ra MỘT thanh (`items-stretch gap-2`).
- **Thanh ngày** (`trip-day-strip.tsx`) = **DẢI PHÂN ĐOẠN TRẢI HẾT BỀ NGANG**: các ngày chia đều (`flex-1`, tối thiểu 5.5rem,
  nhiều ngày thì cuộn ngang), chữ canh giữa; ngày đang chọn là ô TRẮNG nổi nhẹ (bóng; dark mode vòng 1px) — không gạch chân,
  không viền từng ô. Mỗi ô hai dòng: **"Ngày 2"**
  + dòng phụ: ngày lịch rút gọn **"T7 7/11"** (`shortDate()` từ `dateLabel`), chưa định ngày ⇒ "N điểm dừng" / "Trống". Chấm
  đỏ khi có mục chưa mở cửa. Bấm ⇒ cuộn tới ngày đó (và MỞ nếu đang thu gọn). Nút **Hiển thị** ở mép phải.
  ⚠️ **Ngày lịch chỉ hiện ở thanh ngày** — đầu ngày bên dưới KHÔNG lặp (biên tập: "ngày chỉ hiện ở một nơi"); thanh dính
  nên lúc nào cũng thấy. Đã thử và BỎ: nhãn `MICRO` in hoa một dòng · ô hai dòng gạch chân cam.
- **Thu gọn từng ngày** (`trip-collapse.ts`, `useCollapsedDays(tripId)`): bấm **CẢ HÀNG đầu ngày** (hoặc nút ▾ — lối bàn
  phím) ở trang soạn lẫn trang xem; thứ bấm được bên trong hàng (giờ bắt đầu, ⋯, ô tên ngày của mẫu) bị bỏ qua bằng
  `closest("button, a, input…")`. Ngày thu gọn chỉ còn đầu ngày + MỘT dòng tóm tắt (`DayCollapsedSummary`: "5 điểm dừng" đậm + tên các mục,
  cắt một dòng; bấm để mở). Lưu `localStorage` theo chuyến (`halivivu:trip-collapsed:<id>`) — sở thích XEM, không vào DB.
  ⚠️ `read` trả CÙNG một Set khi chuỗi lưu không đổi (`useSyncExternalStore`). Ngày thu gọn không dựng `SortableContext`.
- **Đầu ngày** (`DayHeading`): ▾ thu gọn + chữ lớn nhất = danh tính ngày ("Ngày 1" font display — KHÔNG ngày tháng; mẫu có
  tên ngày thì nhãn micro `warm-ink` "NGÀY 1" + tên). **Vạch cam ngắn** ở lề trái = ngày đang mở (đích của mọi lối thêm) — không chạy hết chiều cao.
  Giờ bắt đầu (`StartTimePicker`: lưới 24 giờ + :00/:15/:30/:45, gõ "420" ⇒ 4:20) và giờ kết thúc gộp **một câu**.
- **Bản đồ là MỘT MỤC riêng** (`/[id]/ban-do`), vẽ **một** ngày. ⚠️ Dựng **có điều kiện** (`{tab === "ban-do" && …}`) —
  Leaflet trong `display:none` dựng ở 0×0. ⚠️ `trip-map.tsx` bọc **`isolate`** (z-index 400–1000 của Leaflet đè Sheet/Dialog).
  Mục chưa xếp có toạ độ hiện **chấm mờ** (`.dl-trip-ghost`), vẽ trước pin số, không tính vào `fitBounds`. Trang mẫu/chia
  sẻ vẫn có cột bản đồ (`TripShell map`).
- **Dưới `lg`**: dải tab mục hiện sẵn (`TripSectionTabs`, icon trên chữ, vừa 320px) + thanh khung nhìn (Lịch trình · Chưa
  xếp ngày · Ghi chú) dính `top-0` cao cố định `h-10` khai `--trip-pane-bar`; ⚠️ thanh ngày dính ở
  `top-[var(--trip-pane-bar)]` — cùng `top-0` thì chui xuống dưới.
- Trang chỉ-đọc dùng cột trái làm **"Gợi ý thêm"** (mục chưa xếp ngày của mẫu).
- Nút "Thêm vào lịch trình" **chỉ ở trang chi tiết + popup**, không vào lưới thẻ (lưới là lúc so sánh, chưa phải lúc chọn).

### 6.1 Tên gọi các phần (dùng chung khi trao đổi)

| Tên gọi | Là gì | Mã nguồn |
|---|---|---|
| **Tên chuyến** · **hàng thuộc tính** | tiêu đề lớn · nơi đến, ngày đi, số người, tự tính đường đi | `TitleField`, `TripTopbar` |
| **Menu chuyến** · **ô chưa xếp ngày** | cột trái | `TripSideNav` / `TripSectionTabs`, `BacklogList` |
| **Cột ghi chú** | cột phải tab Lịch trình | `TripNotes compact` |
| **Thanh ngày** · **Hiển thị** | NGÀY 1 · NGÀY 2…, dính khi cuộn | `TripDayStrip`, `TripFieldsMenu` |
| **Đầu ngày** | ▾ thu gọn, "Ngày 1", vạch cam, giờ bắt đầu/kết thúc, ⋯ | `DayHeading`, `StartTimePicker`, `DayCollapsedSummary` |
| **Dòng thời gian** · **hàng** | danh sách mục một ngày · cột giờ + trục + thẻ | `DayBlock`, `StopRow`/`RailItem` |
| **Trục** · **mốc** · **nhãn thời lượng** | vạch dọc · ô số / chấm nhỏ · "1g30" dưới mốc | `Rail`, `RailDot`, `RailStay` |
| **Thẻ** | khối nội dung bên phải trục (§6a) | `cardClass`, `ItemBody`, `CompactBody`, `TicketBody` |
| trong thẻ: **icon đầu thẻ** · **ảnh nền** | icon loại màu · ảnh mờ nửa phải | `HeadTile`, `KindIcon`, `TravelIcon` |
| trong thẻ: **ghi chú** · **cảnh báo** · **dải hoạt động** · **gợi ý quán** | | `NoteLine`, `Warning`, `ActivityTags`, `MealPicksRow` |
| trong thẻ: **viên ✎ ⋯** | sửa · menu mục | `ItemActions` |
| **Dòng chặng** | "25 phút di chuyển  18 km" giữa hai thẻ | `RailLeg` |
| **Hàng thêm** | ô "+" viền đứt + "Thêm vào ngày N" cuối trục | trong `DayBlock` |
| **Hộp thêm** · **hộp sửa** | popup tìm/thêm · popup từ ✎ | `TripAddSearch`, `ItemEditDialog` |
| **Ngăn nổi** | nút tròn giữa cạnh phải ở trang khác | `TripDock` |

## 6a. Ngôn ngữ thị giác — dòng thời gian & thẻ

Nguồn **duy nhất**: `components/trip/trip-rail.tsx`, dùng chung trang soạn và trang chỉ-đọc — đừng chép ra sửa riêng.
Chỉ **trang soạn** đóng khung thẻ (bấm/kéo được); trang xem dùng cùng thân thẻ, không viền.

**Màu loại thẻ — xếp theo ƯU TIÊN** (token `--kind-*` trong `globals.css`, có bản dark; dùng `text-kind-*`/`bg-kind-*`):

| Bậc | Loại | Token | Màu | Lý do |
|---|---|---|---|---|
| 1 | Nơi (tham quan · hoạt động · quán không mang vai) | `--kind-place` | xanh lá, họ `primary` | lý do của chuyến |
| 2 | Lưu trú | `--kind-stay` | chàm (hue 278) | mốc mở/đóng ngày |
| 2 | Bữa ăn | `--kind-meal` | mâm xôi (hue 345) | né đỏ lỗi (27) & cam cảnh báo |
| 3 | Di chuyển | `--kind-travel` | xám lạnh (C 0,025) | chỉ là đoạn nối |
| — | Nghỉ · việc tự gõ | — | trung tính | khoảng trống / việc phụ |

- Màu **chỉ** ở: icon đầu thẻ · mốc · đoạn trục. **Không tô chữ thân, không tô nền thẻ, không vạch
  mép.** Đây là ngoại lệ có chủ ý của luật "màu mang nghĩa" (§3 CLAUDE.md) — mỗi màu nói đúng một LOẠI.
- Thẻ, icon, mốc, trục lấy màu từ cùng nguồn (`lookOf` → `headKindOf` → `dotTone`) nên luôn khớp nhau.
- ⚠️ Turbopack đôi khi không dựng lại CSS khi chỉ đổi token trong `globals.css` — chạm nội dung file để ép.
- Đã thử và BỎ: `sky/pink/indigo-500` (tươi, như nhãn dán) · ba màu ngang vai với nơi để xám · vạch màu 3px mép trái ·
  ô icon tô nền màu · viền màu lúc đứng yên (một loại bị nói BỐN lần).

**Trục** (`Rail`, `RailDot`, `RailStay`):
- Vạch 2px; nét **liền** = đang ở một chỗ, nét **đứt** = dòng chặng (`RailLeg`, trung tính). Đoạn trục của mỗi mục nhuốm
  màu loại 35% (`LINE`).
- **Quy ước đánh số** (`stopNo` ở `buildDayViews`, đếm lại từ 1 mỗi ngày, tính lúc đọc nên tự nhảy khi đổi chỗ):
  · **Ô vuông có số** 22px bo 4px (viền `kind/70`, chữ màu loại, nền pha 10% vào `--background` — **đục** để che vạch): mọi
    mục của site + mục tự thêm có địa chỉ/toạ độ.
  · **Chấm vuông 10px không số**: việc tự gõ, di chuyển, nghỉ, bữa ăn / nhận phòng chưa có chỗ. Không chiếm số.
  · **Thẻ hoạt động** không có mốc. Ô "+" viền đứt cuối trục là **hàng thêm**, không phải mốc.
  · Rê thẻ ⇒ mốc của nó đậm lên (`group-hover`).
- **Nhãn thời lượng** dưới mốc: `stayShort()` ("45′", "1g30"), `text-foreground/70 font-medium`, nền trắng để cắt vạch;
  0 phút thì để trống. Chỉ là chữ (sửa qua ✎).
- **Cột giờ** bên trái: `tabular-nums` đậm, canh phải; dưới `sm` hẹp `w-11` (`TIME`, `ROW_GAP`). Thẻ có đệm trên ⇒ giờ
  và mốc dịch `pt-3`/`pt-2.5` cho thẳng dòng tên.

**Thẻ** (`lookOf` + `LOOK_CARD`/`cardClass`; mọi hình cùng đệm `px-3 py-2.5`):

| Hình | Gồm | Thân |
|---|---|---|
| `place` | địa điểm · hoạt động đứng riêng · quán không mang vai | `ItemBody` |
| `meal` | bữa ăn tự thêm · quán mang vai bữa | `ItemBody` / `CompactBody` |
| `stay` | **mọi** chỗ ở của site · nhận (trả) phòng tự thêm | `ItemBody` / `CompactBody` |
| `transport` | Di chuyển — **thẻ vé** | `TicketBody` |
| `minor` | việc / nơi tự gõ khác | `CompactBody` |
| `rest` | Nghỉ — viền đứt, nền trong suốt (một khoảng trống của ngày) | `CompactBody` |

- ⚠️ **Thẻ KHÔNG viền, KHÔNG nền** (biên tập: "ít border", rồi "bỏ cả nền xám"): thẻ là chữ trơn trên tờ trắng — trục, icon,
  giờ đã đủ tách từng mục. Nền nhạt **chỉ khi rê** (`CARD_HOVER`, foreground pha 3,5% — ĐỤC bằng `color-mix`); nhấn/kéo ⇒
  `bg-background` + bóng (`SortableStop`) để thẻ đang kéo không trong suốt. Chip hoạt động & gợi ý quán: **đặc 7%** không viền
  (rê 11%); "+ Hoạt động" nền trắng đục (vô hình trên thẻ, đọc được trên ảnh nền). Đã thử và BỎ: viền trung tính + viền ngả
  màu loại khi rê · tấm nền xám 3,5% thường trực.
- **Vạch ngăn mảnh giữa hai hàng** (`StopRow` `::after`, `foreground/8%`, 1px): chỉ trong CỘT THẺ (`left-20` / `sm:left-28` =
  cột giờ + trục + hai khoảng cách — cùng số với hàng thêm), không cắt qua cột giờ và trục; hàng cuối ngày (`last:`) và hàng
  đang kéo không có. Có ở cả trang soạn lẫn trang xem.
- **Icon đầu thẻ TRẦN** 24px trong cột `w-7` (`HeadTile`), màu loại — bộ icon **đặc hai lớp** riêng (`KindIcon`: núi ·
  la bàn · bát · giường; `TravelIcon`: 6 phương tiện) trong `travel-icon.tsx`, khác bộ nét mảnh `glyphs.tsx`. Dưới `sm`
  thành icon nhỏ trước tên (`InlineKindIcon`).
- **Ảnh nền mờ nửa phải** (thẻ `place`/`meal`/`stay` có ảnh, chỉ trang soạn): `absolute`, 50% (42% từ `sm`), `mask-image`
  mờ về trái, `opacity-70` (dark 50) — mặt nạ chứ không lớp trắng phủ nên dark mode tự đúng; không ăn bề ngang của tên.
  Khung có `relative overflow-hidden`, ruột bọc `relative`. ⚠️ Thứ nằm đè vùng ảnh phải có **nền** (chip, "+ Hoạt động",
  viên ✎ ⋯). Trang xem vẫn ảnh vuông cạnh tên (`Thumb`). Đã thử và BỎ: ảnh vuông 56px · ảnh 4:3 128px sát mép trái.
- **Một cột chữ**: tên, ghi chú, cảnh báo, dải hoạt động, gợi ý quán đều thẳng mép trái của tên (`sm:pl-10` = `w-7` +
  `gap-3`; thẻ gọn `2.375rem`).
- **Tên**: `font-bold` 18px từ `sm` (17px dưới), tối đa **2 dòng** (`line-clamp-2`). Mục của site đổi màu khi rê, không gạch chân.
- **Thẻ vé**: `"Hà Nội ┄┄┄ Phan Thiết"` (vạch đứt từ `sm`; dưới `sm` hai dòng "Hà Nội" / "đến Phan Thiết"). **Không in tên
  phương tiện** (icon nói), **không in giờ**. Thiếu một đầu ⇒ "…"; tiêu đề tự đặt khác tên ghép ⇒ dòng xám trên cùng.
- **Thẻ lưu trú**: khu vực (`areaLabel`) dưới tên. ⚠️ **KHÔNG dấu tick xác minh** (biên tập) — nó sống ở `/luu-tru/[slug]`.
- **Ghi chú** = tầng phụ: ký hiệu `note` + chữ xám 14px, không nghiêng, không nền; `whitespace-pre-line`. `NoteLine` render
  **hai bản** (`display` chọn): từ `sm` dưới tên, dưới `sm` hết bề ngang thẻ.
- **Cảnh báo**: chữ + icon, mức cao chữ đỏ — **không mảng nền**. ⚠️ **Giờ mở cửa KHÔNG có dòng riêng** — chỉ in trong dòng
  cảnh báo `closed`/`opensLater`/`closingSoon` (`HOUR_WARNINGS`): "⚠ Chỉ còn 60 phút trước giờ đóng   Giờ mở 6:00 – 12:00".
- **Viên ✎ ⋯** (`ItemActions`): nổi bằng **bóng** (dark mode: vòng 1px `white/12`), hai nút 28px bo `R_BADGE` cách vạch đứng
  ngắn; ⋯ đang mở giữ nền `muted`. Trượt vào khi rê; cảm ứng luôn hiện. ⚠️ Đừng để icon trơn — chìm vào ảnh nền.
- **Hàng thêm** (cuối mỗi ngày có mục): cùng lưới `RailItem` — cột giờ trống · ô 22px viền đứt có "+" · "Thêm vào ngày N";
  vạch đứt ngắn nối đáy trục; **cả hàng là một nút**, rê ⇒ ô đặc `primary`. Chèn giữa thì dùng ⋯ → "Chèn trước/sau". Ngày
  trống: nút có khung + "hoặc xếp một mục từ cột Chưa xếp ngày". Đã thử và BỎ: dấu "+" giữa hai mốc trên trục
  (`InsertMarks`) · nút có khung đứng riêng dưới cột thẻ.
- **Dòng chặng** dùng icon **xe**, không `Navigation` (tam giác nhỏ đọc nhầm thành cảnh báo); hiện km (`driveKm`).
- **Không dùng `·` làm dải phân cách** — khoảng trắng rộng.
- ⚠️ `RailItem` phải `min-w-0` (con của ô GRID trong `StopRow` — một thẻ vé đủ đẩy cả trang tràn ngang).

## 6b. Trang điểm đến: "Lên lịch trình đi X", KHÔNG phải "Thêm vào lịch trình"

**Một `Place` là NƠI CHỨA các điểm dừng, không phải một điểm dừng** — làm nó thành mục thì sai cả bốn: "ở lại Phan Thiết
2 tiếng", chặng đo tới một trọng tâm không có thật, không `openingHours`, pin ngang vai một quán. **Quy tắc:** có toạ độ
thật + có thời lượng ⇒ là mục. Địa điểm · quán · chỗ ở · hoạt động giữ "Thêm vào lịch trình"; điểm đến/tỉnh đổi thành
CTA **"Lên lịch trình đi X"** (`PlanTripButton`).

- Trang điểm đến là **CỬA TRƯỚC**: tạo/tiếp tục chuyến → đặt làm chuyến đang lên lịch → trang soạn → lướt các mục, bấm
  "Thêm" là rơi đúng chuyến. Ngữ cảnh đặt **trước** khi gom.
- **Không đẻ chuyến trùng**: `getPlanOptions` tra chuyến liên quan bằng **nội dung** (kể cả điểm đến con), không chỉ
  `Trip.placeId`. Có chuyến cũ/mẫu ⇒ hộp chọn [Tiếp tục] / [Bắt đầu từ mẫu] / [Tạo mới] (→ `/tao?noi-den=`); không có gì ⇒
  vào thẳng trang tạo.
- CTA cam ở **thân hero**, không ở thanh hành động trên cùng; là CTA cam duy nhất của trang.
- **Cửa thứ hai**: `/ban-do` *Đo chuyến* → `startTripFromRoute(slugs)` — **mỗi nơi một ngày**, nhãn nơi ở `TripDay.title`.
  Chuyến nhiều điểm đến cần làm gì đó với liên kết thì nâng lên **`TripDay.placeId`** — đừng hồi sinh `TripItem.placeId`.

## 6c. Kéo–thả

`@dnd-kit` (core + sortable). **Chỉ đổi chỗ trong CÙNG một ngày** ở trang soạn; chuyển ngày bằng ⋯ → "Chuyển sang Ngày N";
khay chưa xếp ngày không kéo (nút **+ → Xếp vào Ngày N**).

- **Cả tấm thẻ là tay cầm** (`SortableStop`): ⚠️ dùng **`setActivatorNodeRef`** (không thì Enter/Space trên ✎ ⋯ kích hoạt
  kéo); ⚠️ `role="group"` đè `role="button"` của dnd-kit (thẻ chứa link/nút); ⚠️ thẻ dựng NGAY trong `SortableStop`,
  `RailItem` chỉ nhận hàm `card(content)` — truyền ref setter qua object prop bị React Compiler chặn.
- **Sensor**: chuột dịch **3px** · cảm ứng **giữ 220ms** (tolerance 8 — dưới ngưỡng vẫn là cuộn) · bàn phím
  `sortableKeyboardCoordinates`. `draggable={false}` cho link và ảnh.
- **Chính tấm thẻ đi theo tay** (`transform` của `useSortable`, không `DragOverlay`); `collide` = `closestCenter` lọc cùng
  ngày + khoá trục ngang (`lockX`, tự viết). **Nhấn xuống là nhấc lên ngay** (CSS `:active`, bỏ qua khi nhấn link/nút bằng
  `:not(:has(a:active,button:active))`). Dòng chặng nằm TRONG hàng (`SortableStop after`) để trượt cùng thẻ; mờ khi kéo.
- ⚠️ **Cầm lên phải trơn từ khung hình đầu** — ba thứ đã gây giật: `setActiveDayId` lúc nhấn dựng lại cả trang (giờ chỉ đặt
  khi ĐỔI ngày, bọc `startTransition`) · `useDndContext()` trong `DayBlock` dựng lại mọi ngày mỗi lần nhích (cờ "đang kéo"
  là thuộc tính **`data-trip-dragging` trên `<html>`**, CSS dùng variant `[[data-trip-dragging]_&]:…`, `useTripLiveSync` đọc
  cùng cờ) · ruột thẻ không ghi nhớ (`SortableStop` dùng `useMemo`).
- **Bàn cục bộ** (`trip-dnd.ts`): danh sách id theo vùng; chỉ nhận lại từ server khi không đang kéo và chữ ký thật sự đổi.
  ⚠️ **`applyMove`**: kéo trong cùng vùng, chỉ số đích tính trên danh sách **GỐC** trước khi gỡ — không thì mọi lần kéo XUỐNG
  lệch một chỗ. **`pnpm check:trip-dnd`** (40 ca) canh chỗ này và `groupStops` — chạy lại mỗi khi động vào.
- Gửi kèm `Trip.version`; lệch (`stale`) ⇒ nạp lại rồi mời làm lại, không báo lỗi đỏ.
- **Ngăn nổi** có kéo–thả riêng (vẫn kéo giữa các ngày) — xem §6f.

## 6d. Sửa mục & ranh giới mẫu / chuyến cá nhân

- **Mọi chỉnh sửa qua nút ✎** → `ItemEditDialog`: tên (chỉ mục tự thêm) · địa chỉ · gắn/bỏ gắn quán hoặc chỗ ở · phương
  tiện/từ/đến (di chuyển) · **thời gian** · ghi chú. Một nút Lưu gửi MỘT `updateItem` với đúng trường đã đổi.
  · **Thời gian**: 8 mốc (0′ 15′ 30′ 45′ 1g 1g30 2g 3g) · giờ −/+ và phút 0/15/30/45 · **"đến lúc"** (sớm hơn giờ đến ⇒ qua
    nửa đêm) · về mặc định. Chữ theo loại: nơi "Ở lại bao lâu?", hoạt động/việc "Mất bao lâu?".
  · Mục của site **không đổi tên** (`updateItem` từ chối khi `customTitle` null).
- ⚠️ **Esc phải qua cờ `cancelled`** (`TitleField` và mọi ô sửa tại chỗ): Esc gọi `blur()` cùng lượt nên `onBlur` vẫn thấy
  `draft` cũ — lưu nhầm thứ vừa huỷ.
- ⚠️ **`TripDay.title`/`note` CHỈ cho mẫu** (giọng biên tập, gánh SEO). Người tự soạn gần như không đặt tên ngày, ô trống
  cõng ~60px. ⇒ **`cloneTrip` KHÔNG chép** title/note của ngày (thành chữ không thấy, không sửa được nhưng vẫn hiện khi chia
  sẻ). Ghi chú của từng mục thì chép. `cloneTrip` chép đủ `customAddress`, `customPlace`, `special`, `travel*`, `parentId`
  (nối lại bằng id mới), `originName`.
- `RailItem`/`DayHeading` nhận khe `note`/`titleNode`/`name`; bỏ trống thì rơi về bản chỉ đọc.

## 6e. Menu *Hiển thị* — ẩn/hiện từng thông tin

`components/trip/trip-fields.tsx`. **Nút**: khay cùng chất liệu thanh ngày, icon SVG riêng `ViewIcon` (hai thanh trượt —
đọc ra "chỉnh", không phải "xem"; đã BỎ icon con mắt), chữ "Hiển thị" (ẩn dưới `sm`), số mục đang ẩn trong ô đặc `R_BADGE`.
**Bảng**: đầu bảng tiêu đề + cặp **Ẩn hết / Hiện hết** dạng phân đoạn (cái đang đúng thì mờ); mỗi dòng = glyph + tên + gợi
ý + **công tắc VUÔNG** tự dựng (`Toggle`, bo 4px — KHÔNG dùng `ui/switch` vì nó `rounded-full`), cả dòng là `role="switch"`.
Các tuỳ chọn: **Icon loại · Ảnh · Địa chỉ, khu vực · Thẻ hoạt động · Thời gian ở
lại · Ghi chú · Chặng di chuyển · Cảnh báo** + **Ẩn tất cả / Hiện lại tất cả**. Chỉ **giờ đến + tên** luôn hiện; mọi tuỳ
chọn mặc định BẬT (`ALL_ON`) — thêm trường mới thì thêm vào `ALL_ON`, bản lưu cũ thiếu khoá sẽ tự nhận giá trị bật.

- **Icon loại** tắt ⇒ mất icon đầu thẻ (cả thẻ vé) và ký hiệu nhỏ trước tên; cột chữ thôi lùi `pl-10` (cảnh báo, ghi chú,
  dải thẻ theo cùng). Màu loại vẫn còn ở mốc + trục.
- **Địa chỉ, khu vực** gồm: địa chỉ mục tự thêm, khu vực chỗ ở, dòng "tại …" của hoạt động đứng riêng.
- **Thẻ hoạt động** tắt ⇒ ẩn dải chip VÀ nút "+ Hoạt động" (thêm mà không thấy thì vô nghĩa); menu ⋯ vẫn còn lối thêm. Gợi ý
  quán của bữa ăn KHÔNG theo cờ này (đó là lối gắn quán, không phải thông tin).

- **Lưu `localStorage`, theo người xem** (sở thích XEM, không phải dữ liệu chuyến); áp cho cả ba trang. ⚠️ Menu dùng ở **hai**
  file (`trip-editor.tsx`, `trip-view.tsx`) — thêm trường thì gắn cờ ở cả hai.
- Đọc bằng `useSyncExternalStore`; ⚠️ `getSnapshot` trả **cùng một object** khi chuỗi lưu không đổi.
- Tắt **Ảnh** ⇒ bỏ ảnh nền / ô ảnh, chỉ còn ký hiệu loại trước tên. Mục không còn dòng phụ nào ⇒ đệm `pb-3`.
- "Chặng di chuyển" chỉ ẩn DÒNG CHỮ (giờ vẫn cộng chặng); `autoTravel` tắt thì mục này biến khỏi menu.
- **"Giờ mở cửa" đã gỡ** (giờ chỉ hiện trong cảnh báo, §6a); khoá `hours` cũ trong `localStorage` bị bỏ qua vô hại.

## 6f. Ngăn nổi `TripDock` — viên tròn ở mọi trang + ngăn kéo

Biến cookie "chuyến đang lên lịch" (vô hình) thành một **vật thể thường trực**.

- **Một dạng duy nhất**: viên tròn **44px ở giữa cạnh phải** (dải đáy đã đông: `BottomNav`, `PeerBar`, `BackToTop`, lời mời
  cài app), huy hiệu số **mục chưa xếp ngày** (0 thì không có). Nghĩa do `aria-label` + `title` gánh. Chưa đăng nhập vẫn hiện
  (là cửa vào). Đã thử và BỎ: viên đổi hình theo trạng thái · cho kéo chính cái nút.
- **Ngăn hiện CẢ LỊCH TRÌNH**: Chưa xếp ngày → từng ngày kèm mục → + Thêm ngày; tiêu đề nhóm `sticky`, nhãn "Ngày 2 · Tên".
  Mục trong túi: "Xếp ngày ▾" + thùng rác; mục trong ngày: chỉ "…". Ô tìm (chính `TripAddSearch`) dưới tên chuyến + nút
  **+** đầu từng nhóm. Đổi chuyến ngay trên tiêu đề.
- **Kéo–thả trong ngăn** (giữa túi ↔ ngày): dùng **chung `applyMove`/`BACKLOG`/`dayKey`**. ⚠️ `data-vaul-no-drag` trên vùng
  danh sách · ⚠️ `DndContext`/`DragOverlay` **ngoài** `DrawerContent` (vaul đặt `transform` ⇒ `fixed` lệch gốc toạ độ) ·
  grip nhìn thấy được (không kéo cả hàng) · vùng rỗng vẫn là `DropZone`.
- ⚠️ `syncedSig` giữ chữ ký **bản server đã nhận gần nhất**, không phải của bàn cục bộ; đồng bộ **trong render**; cờ kéo là
  state `activeId`; `ItemRow` ở **cấp module** (khai trong render ⇒ unmount mỗi lần ⇒ menu vừa mở đóng ngay).
- Dữ liệu ở client (`getTripBag`) ⇒ hộp thêm nhận `onAdded`, ngăn phát `tripBagChanged`. Hộp (Radix) lồng trên ngăn (vaul):
  Esc chỉ đóng hộp.
- Cố ý **không** có giờ ước tính/cảnh báo (nhân đôi trang soạn thì sớm muộn lệch) ⇒ nút "Mở lịch trình →".
- Trượt từ **đáy** dưới `lg`, nép **phải** từ `lg` — một `Drawer` đổi `direction`. Ẩn ở `/lich-trinh` `/ban-do` `/cms`
  `/sale` `/login` `/offline`.

## 6g. Thêm mục — hộp thêm, mục tự thêm, mục đặc biệt, hoạt động

**Hộp thêm** (`trip-add-search.tsx`), mở từ hàng thêm cuối ngày · ⋯ "Chèn trước/sau" · ô tìm ở khay chưa xếp · ngăn nổi.

- `searchTripCandidates(tripId, q, forItemId?)`: spot · eatery · activity · accommodation; ô trống ⇒ gợi ý ở điểm đến của
  chuyến (cả điểm đến con; chuyến không gắn nơi đến thì suy từ mục site đầu tiên — `resolveTripPlaceId`), có chữ ⇒ toàn site
  nhưng nơi của chuyến đứng trước. Ảnh chỉ `kind: "gallery"`. Lọc **bỏ dấu** (`slugifyVi`).
- **Hộp không tự đóng** sau mỗi lần thêm; **mốc chèn TRÔI** theo mục vừa thêm (`afterId`) — không thì thêm A rồi B ra B, A.
  Hộp đang mở (`role="dialog"` + `data-state="open"`) ⇒ `useTripLiveSync` tạm dừng.
- **Thêm trùng được** ở trang soạn (bãi biển sáng & chiều, một quán hai bữa): dòng đã có ghi "✓ Đã có trong chuyến", nút
  "Thêm lần nữa"; chọn sẵn (Enter) vẫn ưu tiên dòng chưa có. ⚠️ `addItem` **chỉ chống trùng khi KHÔNG có `tripId`** — tức nút
  "Thêm vào lịch trình" ở trang chi tiết (bấm lại báo "đã có", không nhân đôi). `dayId` chỉ nhận khi có `tripId`.
- **Mục tự thêm = MỘT kiểu: tiêu đề · địa chỉ (tuỳ chọn) · bao lâu** (`addCustomStop`). Có địa chỉ ⇒ `customPlace = true`
  (một NƠI, lấy số); không ⇒ việc. `updateItem({ customAddress })` đặt lại theo cùng luật. Địa chỉ **chưa geocode**. Gõ
  chữ ⇒ dòng **Thêm “…”** (lên đầu, chọn sẵn khi không tên nào chứa trọn cụm đã gõ) + **"Tự thêm kèm địa chỉ…"** (form).
  Chip "Hay dùng": Đặt xe, Chờ người.

**Mục đặc biệt** (`TripItem.special`, cấu hình ở `lib/trip-special.ts` — dùng chung server + client):

| Loại | Form | Ghi chú |
|---|---|---|
| **Di chuyển** | phương tiện (máy bay · tàu hoả · xe khách · ô tô · xe máy · tàu thuyền) · từ · đến · bao lâu | không bao giờ có số; cắt chuỗi chặng (§5) |
| **Nhận phòng** | chỗ ở trên site (`VenuePicker`) hoặc gõ tên/địa chỉ · bao lâu | gắn được chỗ ở ⇒ mục có vai |
| **Bữa ăn** | quán trên site hoặc gõ địa chỉ · bao lâu | gắn được quán ⇒ mục có vai |
| **Nghỉ** | Nghỉ trưa / Tự do khám phá / Nghỉ ở chỗ ở | thẻ `rest` |

- ⚠️ **Bữa ăn KHÔNG phân sáng / trưa / tối** (biên tập): nhãn cố định "Bữa ăn". Dữ liệu cũ tên "Ăn trưa"… vẫn hiện.
- ⚠️ **Không còn thêm "Trả phòng"**: mục cũ vẫn hiện dạng `stay` và **mượn tên chỗ của lần nhận phòng gần nhất trước nó**
  (`ResolvedItem.stayOf`, `linkCheckouts()` trong `shape()` — theo thứ tự ngày rồi `order`).
- **Không có ô mã chuyến / mã đặt phòng** (biên tập). Cột `bookingCode` giữ lại, thẻ hiện nếu có dữ liệu cũ. Không bao giờ là
  số tài khoản (luật §Nơi lưu trú).
- Tên mục đặc biệt để trống ⇒ ghép lúc đọc: di chuyển "Hà Nội – Sa Pa" (gạch ngang, không mũi tên), loại khác = nhãn loại.
  Tên chỉ là nhãn loại ⇒ dòng chính của thẻ là địa chỉ / chỗ nhận phòng trước đó / chữ xám "Chưa chọn quán", "Chưa chọn chỗ ở".

**Mục có vai** — mục SITE mang `special` (`roleOf` trong `actions.ts`): chỗ ở ⇒ `checkin`; quán ⇒ `meal`.
- Được: cảnh báo giờ mở cửa cho bữa ăn, toạ độ ⇒ chặng + điểm bản đồ, ảnh thật. Vai hiện bằng icon/màu thẻ (§6a).
- **Gắn sau**: `attachVenue(itemId, venue | null)` biến mục tự gõ thành mục site (giữ chỗ, giờ, ghi chú, vai) hoặc ngược lại.
  Nút "Chọn chỗ ở" trên thẻ nhận phòng chưa có địa chỉ; bữa ăn chưa có quán **lẫn** địa chỉ có **hàng gợi ý quán**
  (`MealPicksRow`): `getMealPicks(tripId)` — 3 quán của điểm đến theo thứ tự biên tập, quán đã có trong chuyến xếp sau,
  **ảnh thật** 24px (`kind: "gallery"`) hoặc không ảnh; bấm là gắn; "Quán khác…" mở hộp sửa.
- `VenuePicker` không chặn mục `inTrip` (một chỗ ở nhiều đêm là bình thường).

**Hoạt động thành THẺ của một nơi** (`parentId`) — đo trên dữ liệu thật: chỉ 11/72 nơi có việc con, giờ nơi + giờ việc thì
**đếm hai lần**. Nên:
- Thời gian ở một nơi là **TỔNG**; mục con là thẻ **"làm gì ở đây"** — hoạt động của site **hoặc thẻ TỰ GÕ**
  (`addCustomTag`: `customTitle` + `parentId`, `stayMin = 0`), không giờ, không số, không chặng (`ActivityTags`). Chỉ
  **địa điểm / nơi tự gõ** có thẻ (`parentScope()` chặn chỗ khác).
- ⚠️ **Hộp "Làm gì ở X" (nút + Hoạt động) CHỈ có hoạt động của đúng X** — `searchTripCandidates(…, forItemId)` lọc
  `SpotActivity` của X theo chữ gõ (bỏ dấu, `slugifyVi`), **không bao giờ** rơi xuống tìm toàn site; X không phải `Spot` ⇒
  không có kết quả nào, chỉ còn lối tự gõ. Gõ chữ ⇒ **"Thêm “…”" thành THẺ của X**, không tách thành dòng có giờ. Chế độ này
  ẩn "Hay dùng", "Mục đặc biệt" và form địa chỉ / thời lượng.
- **Tự gắn**: thêm một hoạt động mà nơi của nó (`SpotActivity`) đã có trong ngày ⇒ server gắn thành thẻ.
- Thẻ ⋯ → **Tách thành dòng có giờ riêng** (tour, đặt chỗ); dòng hoạt động ⋯ → **Gắn vào {nơi}** (nơi gần nhất phía trên,
  không thì phía dưới). Thẻ không kéo được — đi theo hàng. Bỏ một nơi thì thẻ của nó đứng ra thành mục gốc.
- "+ Hoạt động": nơi chưa có thẻ ⇒ nút trơn cạnh ⋯ chỉ hiện khi rê (cảm ứng: menu ⋯); đã có ⇒ chữ trơn cuối dải. ⚠️ Đừng
  giữ chỗ ẩn ở nơi chưa có thẻ (mỗi hàng dài thêm ~36px). Chip đặc không viền, la bàn `kind-place`, ⋯ mờ 40% tới khi rê.
- Đọc ra luôn **PHẲNG** (`flatten()`): gốc rồi ngay sau là con — tính giờ, bản đồ, trang xem không phải biết về cây.
  `order` của gốc đếm trong ngày, của con đếm trong cha.

## 6h. Trang tạo chuyến `/lich-trinh/cua-toi/tao`

`CreateTripForm` (`create-trip-form.tsx`) hỏi **nơi đến · số ngày · ngày đi · số người · tên** → `createTrip` →
`router.replace` sang trang soạn. Mọi trường bỏ trống được; `?noi-den=<id>` điền sẵn; chưa đăng nhập ⇒ `/login` giữ tham số.

- **Nơi đến** = `Trip.placeId`; `getTripDestinations()` trả **mọi** `Place` đã xuất bản (điểm đến lẫn tỉnh; điểm đến + tỉnh
  `treatAsDestination` đứng trước). Tìm bỏ dấu, tìm cả theo tên tỉnh chứa nó. Chip "Hay đi" = 8 nơi đầu.
- **Số ngày** 1–14 (mặc định 3) dựng sẵn đúng chừng ấy `TripDay`. Tên trống ⇒ `defaultTripTitle()` (`lib/trip-title.ts`):
  "Cao Bằng 3 ngày 2 đêm" · "Cao Bằng 1 ngày" · "Chuyến đi 3 ngày 2 đêm".
- **Lối vào**: nút "Tạo lịch trình" ở `/cua-toi` · ngăn nổi · "Lên lịch trình đi X". **Cố ý không hỏi** ở lối ngầm (bấm
  "Thêm vào lịch trình" khi chưa có chuyến ⇒ tự tạo "Chuyến đi của tôi").
- "Đi từ đâu" đã gỡ khỏi giao diện (cột giữ lại).

## 7. Lịch trình mẫu — đòn bẩy mạnh nhất

- Soạn ở **`/cms/lich-trinh`** (metadata, `slug`, `status`, ảnh bìa) — **nội dung ngày soạn bằng chính trang soạn công khai**.
- `/lich-trinh/[slug]`: chỉ đọc, nút lớn **"Dùng lịch trình này"** → `cloneTrip` (`isTemplate=false`, `startDate=null`).
- Trang `/diem-den/[slug]` hiện "Gợi ý lịch trình" lọc theo `Trip.placeId`.
- ⚠️ `trip-ta-xua` cố ý chỉ 2N1Đ / 6 mục — đừng "làm dày" cho cân với Phan Thiết.

### 7a. Trang `/lich-trinh` — mẫu đầy đủ + cửa tự xếp

```
Hero: ẢNH TRÀN VIỀN + "LỊCH TRÌNH" in hoa giãn chữ + 2 nút kính ("Chọn điểm đến" · "Đo chuyến trên bản đồ")
[đã đăng nhập] dải trạng thái tràn viền nền primary/5: (avatar) Bạn đang lên lịch trình <tên> … n ngày n mục Tiếp tục →
Lịch trình mẫu — MỘT MẪU MỘT HÀNG (ảnh trái | nhãn nơi · số ngày · số điểm dừng / tên / tóm tắt / từng ngày), divide-y
```

- Phong cách lấy nguyên `/diem-den` (`--font-display`, `MICRO`, `lib/radius.ts`); nút kính là `hero-link.tsx` dùng chung.
- Dải trạng thái: **avatar + câu ngôi thứ hai viết thường** (không nhãn `MICRO` — đọc ra như metadata của mẫu); không phải
  một thẻ trong cột (nó lặp hình một hàng mẫu).
- Hàng mẫu: **cả hàng là link**; tên là CHỮ ở cột phải (không đè lên ảnh ~19rem); ảnh `sm:h-full` + `min-h`, không tỉ lệ cố
  định; danh sách ngày trải hết cột phải, tóm tắt giữ `max-w-2xl`; **không kẻ nét dưới từng ngày**.
- **Ảnh mẫu**: bìa riêng → bìa của điểm dừng đầu tiên có ảnh → **để trống** (nền `muted`). ⚠️ **Không `coverUrl()`** (mẫu Tà
  Xùa săn mây từng nhận ảnh bờ biển bão tố). Ảnh hero **không trùng** ảnh mẫu bên dưới; nền tối `bg-[#0b1a12]` dưới ảnh.
- ⚠️ Đổi hero thì đổi kèm `lib/site-chrome.ts` (header chìm chữ trắng); hero cần `lg:pt-[7rem]`.
- Mọi khối **trải hết bề ngang với số thẻ THẬT** — đừng khai số cột lớn hơn số thẻ.
- Đã gỡ (đừng dựng lại khi chưa hỏi): bộ duyệt tìm/lọc/sắp xếp (8 ô điều khiển cho 2 mẫu; `trip-browser.tsx` trong git) ·
  khối "Tự xếp chuyến của bạn" và dải "Đo trên bản đồ" (lặp hai nút hero) · hàng 2 cột · dải dòng thời gian ngang.

## 8. Chia sẻ

Khuôn `StayShare`: công tắc + **mã QR** + copy link (`trip-share.tsx`). Bật mới sinh `shareId`.
`/lich-trinh/s/[shareId]`: chỉ đọc, `noindex`, nút "Nhân bản về lịch trình của tôi".

## 9. Sáu quyết định — ĐÃ CHỐT khi dựng v1

| # | Vấn đề | Đã làm |
|---|---|---|
| 1 | **Nguồn định tuyến** | Ma trận thời gian → **ORS** (`lib/routing.ts`, cache 30 ngày). OSRM demo **chỉ vẽ hình tuyến** trên bản đồ. ORS im lặng → chim bay ×1.3 @38km/h, `approx`, UI `~`. |
| 2 | **`Place` không có `lat/lng`** | Thêm `Place.lat/lng` + `pnpm backfill:place-coords`: 31/31 điểm đến có toạ độ, tỉnh gần như chưa (nhập tay ở CMS). |
| 3 | **"Ước tính chi phí"** | **BỎ** — `Eatery`/`Accommodation` cố ý không có `priceRange`, mọi con số sẽ sai vô hình. (Chi phí THỰC do người dùng nhập là chuyện khác — xem [lich-trinh-cong-cu-nhom.md](lich-trinh-cong-cu-nhom.md).) |
| 4 | **Offline** | Chưa làm (§13). |
| 5 | **`BottomNav`** | **Không** thêm tab — lối vào ở header (`lich-trinh-nav-link.tsx`) + ngăn nổi. |
| 6 | **Nút "Thêm" trên lưới thẻ** | Chỉ ở trang chi tiết + popup. |

## 10. Tình trạng

✅ Đã dựng: schema · trang soạn · máy tính giờ + cảnh báo · nút thêm + đăng nhập giữa chừng · chuyến đang lên lịch · CMS mẫu
+ trang mẫu + khối gợi ý ở trang điểm đến · chia sẻ + QR + nhân bản · ngăn nổi · trang tạo chuyến · mục đặc biệt + mục có vai ·
ghi chú / đồ mang theo / chi phí · cộng tác nhiều người.

## 12. Bản đồ mã nguồn

| Lớp | File | Vai trò |
|---|---|---|
| Logic thuần | `src/lib/trip-time.ts` | `scheduleDay`, `effectiveStayMin`, `isTask`, `stayLabel`, cảnh báo (§5). Không Prisma/React/"bây giờ" |
| Mục đặc biệt | `src/lib/trip-special.ts` | `SPECIALS`, `SPECIAL_LABEL`, `SPECIAL_STAY`, `TRAVEL_MODES`, `REST_PRESETS`, `specialTitle` |
| Tên / gom / chèn | `src/lib/trip-title.ts` · `trip-stops.ts` · `trip-drop.ts` | `defaultTripTitle` · `groupStops` (gốc + thẻ + số) · `insertAt`/`DropAt` |
| Quãng đường | `src/lib/trip-route.ts` | `getLegs()` — ORS, ngân sách 300ms, `after()`, rơi về chim bay |
| Dữ liệu | `src/lib/trip.ts` | Nạp Trip → `ResolvedItem` (`shape`, `flatten`, `linkCheckouts`); `buildDayViews()` cho cả ba trang; `getMealPicks`; `resolveTripPlaceId` |
| Mutation | `src/app/(site)/lich-trinh/actions.ts` | CRUD chuyến/ngày/mục, `createTrip`, `addItem` (+ `roleOf`), `addCustomStop`, `attachVenue`, `updateItem`, `moveItem`, `searchTripCandidates`, chia sẻ, `cloneTrip`, cookie chuyến đang lên lịch |
| Trang | `src/app/(site)/lich-trinh/{page,[slug],cua-toi/page,cua-toi/tao,cua-toi/[id],cua-toi/[id]/[muc],s/[shareId]}` | danh sách mẫu · một mẫu · chuyến của tôi · tạo chuyến · trang soạn (`trip-workspace.tsx`) · mục con · bản chia sẻ |
| Dòng thời gian | **`src/components/trip/trip-rail.tsx`** | `RailItem`, `Rail`, `RailDot`, `RailLeg`, `ItemBody`/`CompactBody`/`TicketBody`, `lookOf`, `cardClass`, `ActivityTags`, `DayHeading`, `Warning`, `Thumb` — **nguồn duy nhất**, dùng chung |
| Icon loại | `src/components/trip/travel-icon.tsx` | `TravelIcon`, `KindIcon`, `KIND_INK`/`TRAVEL_INK` (icon đặc hai lớp) |
| UI soạn | `src/components/trip/trip-editor.tsx` | `DayBlock`, `SortableStop`, `ItemActions`, `ItemEditDialog`, `MealPicksRow`, `TagActions`, hàng thêm |
| Thêm / chọn | `trip-add-search.tsx` · `trip-venue-picker.tsx` · `create-trip-form.tsx` | hộp thêm · `VenuePicker` · trang tạo chuyến |
| Vỏ & đầu trang | `trip-shell.tsx` · `trip-topbar.tsx` · `trip-side-nav.tsx` · `trip-day-strip.tsx` · `trip-fields.tsx` | khung ba cột · tên + hàng thuộc tính (`MonthGrid`) · menu chuyến · thanh ngày · menu Hiển thị |
| Kéo–thả | `trip-dnd.ts` | bàn id theo vùng + `applyMove` (§6c) |
| Mục của chuyến | `src/lib/trip-sections.ts` · `trip-notes/packing/money.tsx` | Bản đồ · Ghi chú · Đồ mang theo · Chi phí |
| UI đọc · bản đồ · chia sẻ | `trip-view.tsx` · `trip-map{,-inner}.tsx` · `trip-share.tsx` | chỉ đọc · pin số + tuyến một ngày · QR |
| Ngăn nổi | `trip-dock.tsx` · `trip-bag-events.ts` | §6f; dữ liệu `getTripBag()`, dựng ở `(site)/layout.tsx` |
| Nút ngoài | `src/components/site/plan-trip-button.tsx` · `add-to-trip-button.tsx` | "Lên lịch trình đi X" (§6b) · "Thêm vào lịch trình" (hero địa điểm, trang hoạt động/lưu trú, popup quán/lưu trú) |
| CMS | `src/app/cms/lich-trinh/**` | danh sách + form xuất bản mẫu + ảnh bìa |
| Kiểm | `scripts/check-trip-dnd.ts` · `check-trip-money.ts` · `check-trip-collab.ts` | `pnpm check:trip-dnd` (40) · `check:trip-money` · `check:trip-collab` |
| Script | `scripts/backfill-place-coords.ts` · `migrate-trip-doings-to-tags.ts` | toạ độ điểm đến · chuyển mục con thành thẻ (§3 DEPLOY) |

Sửa kèm ở nơi khác: `Place.lat/lng` (schema + CMS) · `Image.tripId` + `lib/owner.ts` + route uploadthing · `RESERVED_SLUGS`
có `lich-trinh` · `sw.js` (`NEVER_CACHE`, nhớ tăng `VERSION`) · `sitemap.ts` · token `--kind-*` + `.dl-trip-pin` /
`.dl-trip-ghost` trong `globals.css` · `lib/site-chrome.ts` (header trang lịch trình là thanh trắng dính, §6).

## 13. Còn thiếu / cố ý chưa làm

| Việc | Ghi chú |
|---|---|
| **Lưu offline** | Cần nhất lúc mất sóng mà lại bắt đăng nhập + đọc DB. Hướng: "Lưu để dùng offline" ghi snapshot JSON vào IndexedDB. |
| **Geocode địa chỉ mục tự thêm** | `customAddress` chỉ là chữ ⇒ chặng tới nó "chưa ước tính". Hướng đã bàn: Goong (dữ liệu VN, có địa giới mới) hoặc Photon; chưa chốt. |
| Lịch lạc quan ở client | §5 — nếu kéo–thả vẫn thấy chậm. |
| `PostRef.tripId` | Blog chưa trỏ thẳng vào mẫu. |
| Toạ độ **tỉnh** | Gần hết tỉnh chưa có `lat/lng` (`backfill:place-coords` chỉ phủ điểm đến). |
| Ước tính chi phí | **Cố ý bỏ** (§9.3). |
| `TripDay.placeId` | Khi chuyến nhiều điểm đến cần link/đếm theo nơi (§6b). |
