# Công cụ nhóm cho lịch trình — Ghi chú · Đồ mang theo · Phân công · Chi phí

> **Bước 1 ĐÃ DỰNG** (sidebar + định tuyến; bốn mục là trang "Sắp ra mắt") — xem §10.
> Phần tính năng vẫn chưa code. Đọc cùng [`lich-trinh.md`](lich-trinh.md) (bản v1 đã dựng) và
> [`lich-trinh-cong-tac.md`](lich-trinh-cong-tac.md) (cùng sửa, `TripMember`).
> Còn **4 câu phải chốt** ở §8 — chốt xong mới dựng được.

## 1. Đây là mở rộng ĐỊNH VỊ, không phải thêm bốn màn hình

`lich-trinh.md` §1 chốt: *sổ tay chuyến đi* — gom → xếp ngày → cảnh báo khả thi → chia sẻ.
Bốn mục này biến nó thành **chỗ làm việc chung của cả nhóm cho một chuyến**.

Điều đó **hợp lý đúng lúc**, vì phần cộng tác vừa xong: `TripMember` đã có, mời bằng email
đã có, thông báo đã có. Ba trong bốn mục chỉ có nghĩa khi có nhiều người:

| Mục | Đi một mình | Đi nhóm |
|---|---|---|
| Ghi chú | có nghĩa | có nghĩa |
| Đồ mang theo | có nghĩa | **rất** có nghĩa (ai mang cái gì) |
| Phân công | gần như vô nghĩa | lý do tồn tại |
| Chi phí | ghi cho nhớ | lý do tồn tại (chia tiền) |

⇒ Sidebar phải **co theo bối cảnh**: chuyến một mình mà bày đủ 5 mục trong đó 2 mục rỗng
vĩnh viễn thì đó là menu của một sản phẩm khác. Xem §3.

## 2. Sidebar đặt ở đâu — VA CHẠM với cột "Chưa xếp ngày"

Đây là câu khó nhất, không phải phần dữ liệu.

Cột trái **đã có người ở**: "Chưa xếp ngày" (14rem, thu gọn được 2.75rem). `lich-trinh.md` §6
ghi rõ nó đã qua **bốn phương án bị loại**, và nó **là vùng thả của kéo–thả** — mọi phương
án làm nó biến mất khỏi màn hình lúc đang xếp ngày đều đã bị loại một lần rồi.

Ba cách xếp:

### A. Một cột trái duy nhất: menu ở trên, nội dung theo ngữ cảnh ở dưới  ← **đề xuất**

```
┌ 14rem ─────────────┐
│ ▤ Lịch trình       │ ← đang mở
│ ✎ Ghi chú       3  │
│ ⛰ Đồ mang theo 12  │
│ ✓ Phân công   2/5  │
│ ₫ Chi phí          │
│ ──────────────     │
│ CHƯA XẾP NGÀY   4  │ ← CHỈ hiện khi đang ở mục Lịch trình
│ ▢ Hòn Rơm          │
│ ▢ Làng chài        │
└────────────────────┘
```

- **Không tốn thêm một milimet bề ngang** — điều này quan trọng: phương án bị loại số 2 ở
  §6 chính là "cột rộng 19rem ăn bề ngang của cả hai cột kia". Dự án này nhạy với ngân sách
  bề ngang.
- Kéo–thả **không đụng gì**: khi ở mục Lịch trình, danh sách vẫn nằm đúng chỗ cũ.
- Thu gọn (2.75rem) vẫn còn tác dụng, thậm chí đúng hơn: thu gọn = rail icon, đúng khuôn
  sidebar quen thuộc.
- ⚠️ **Điểm yếu thật:** ở bốn mục kia, cột trái chỉ còn 5 dòng menu → một dải 14rem gần như
  rỗng cạnh vùng nội dung rộng. Xử lý: **bề ngang bám nội dung** — 14rem khi có danh sách
  bên dưới, co về rail icon ở bốn mục còn lại (vẫn tôn trọng nút thu gọn thủ công).
  Đổi bề ngang lúc chuyển mục hơi "nhảy"; chấp nhận, vì đổi lại cột không bao giờ rỗng.

### B. Rail icon 3rem riêng, đứng NGOÀI ba cột

```
[rail 3rem][Chưa xếp 14rem][ dòng thời gian ][ bản đồ 24–32rem ]
```
- Sạch về ý nghĩa: rail = điều hướng cấp CHUYẾN, cột kia = nội dung cấp LỊCH TRÌNH. Hai
  cấp khác nhau thì để hai chỗ khác nhau.
- Rail luôn thấy kể cả khi cột "Chưa xếp ngày" bị thu gọn.
- ⚠️ Tốn 3rem của cột dòng thời gian, và ở khổ `lg` nhỏ (1024px) thì **bốn** dải dọc cạnh
  nhau là chật.

### C. Tab ngang dưới header (kiểu `PlaceTabs`)
Rẻ nhất, đúng thành ngữ sẵn có của site. **Nhưng người dùng đã nói rõ muốn sidebar bên
trái**, và tab ngang thì số đếm (12 món đồ, 2/5 việc) chen chúc hơn hẳn. Ghi lại để không
ai đề xuất lại như một "ý mới".

> **ĐÃ DỰNG THEO A** — không đụng vào ngân sách bề ngang và không đụng vào kéo–thả, hai thứ
> đã trả giá nhiều nhất ở v1.
>
> Một điều chỉnh so với phác thảo: **bề ngang cột trái GIỮ NGUYÊN 14rem ở mọi mục**, không co
> giãn theo nội dung. Đổi bề ngang mỗi lần chuyển mục làm cả trang giật một nhịp, đắt hơn cái
> được (một dải hơi rỗng ở bốn mục chưa có nội dung). Nút thu gọn thủ công vẫn còn — người
> cần bề ngang thì tự thu.

## 3. Mục nào hiện, ở trang nào

| | Soạn (`/lich-trinh/[id]`) | Chia sẻ (`/s/[shareId]`) | Mẫu (`/mau/[slug]`) |
|---|---|---|---|
| Lịch trình | ✅ sửa | ✅ đọc | ✅ đọc |
| Ghi chú | ✅ **đã dựng** | ❌ **không** — xem §11.5 | dữ liệu có, trang công khai chưa hiện (§11.10) |
| Đồ mang theo | ✅ **đã dựng** | ❌ chưa | dữ liệu có, trang công khai chưa hiện (§12.8) |
| Phân công | ✅ *(ẩn khi chuyến chỉ có 1 người)* | ❌ | ❌ |
| Chi phí | ✅ | ❌ | ❌ |

- **Mẫu CÓ "Đồ mang theo"** và đó là chỗ hay nhất của tính năng này: mẫu Tà Xùa ghi "áo ấm,
  giày bám, sạc dự phòng — đêm 5°C" chính là **tri thức thực địa**, đúng thứ site bán. Khi
  nhân bản mẫu (`duplicate`), ghi chú + danh sách đồ phải **đi theo** — đây là yêu cầu cụ
  thể cho action `duplicate` đang có.
- **Mẫu KHÔNG có Chi phí.** Một bảng giá do biên tập gõ tay sẽ cũ đi lặng lẽ — đúng kiểu
  hỏng mà §9.3 đã chỉ mặt.
- **Chia sẻ không có Chi phí / Phân công**: link chỉ-đọc là để khoe lịch trình, không phải
  để người lạ đọc ai nợ ai bao nhiêu.

## 4. "Chi phí" — KHÔNG mâu thuẫn với §9.3, nhưng phải nói rõ ranh giới

`lich-trinh.md` §9.3 chốt **bỏ "ước tính chi phí"** vì `Eatery`/`Accommodation` cố ý không
có `priceRange` → mọi con số suy ra sẽ **sai một cách vô hình**.

Cái đang bàn ở đây khác hẳn: **số do người dùng tự gõ**. Nó luôn đúng vì nó là dữ liệu của
chính họ, không suy diễn từ danh mục.

> **BẤT BIẾN cần giữ:** không bao giờ tự điền / tự cộng chi phí từ dữ liệu `Eatery`,
> `Accommodation`, `Activity`, `Transport`. Không có dòng "chuyến này ước tính ~2.400.000đ"
> tính từ danh mục. §9.3 vẫn nguyên giá trị; chỗ này chỉ mở đúng một cửa: **ô nhập tay**.

Và ngay trong "nhập tay" vẫn còn hai sản phẩm rất khác nhau — xem câu hỏi 3 ở §8.

## 5. Phác dữ liệu

Bốn bảng, đều `onDelete: Cascade` từ `Trip`; FK người → **`SetNull`** (gỡ một người khỏi
chuyến không được xoá món đồ họ từng nhận hay khoản họ từng trả).

```prisma
model TripNote     { id  tripId  body @db.Text  authorId?  createdAt updatedAt }
model TripPackItem { id  tripId  name  qty Int?  note?  category?  assigneeId?  isDone  order }
model TripTask     { id  tripId  title  note?  assigneeId?  dueDate?  isDone  order }
model TripExpense  { id  tripId  title  amount Int  category?  paidById?  dayId?  itemId?  createdById?  createdAt }
```

- `amount Int` = **đồng VND, không phần thập phân**. Không có trường `currency`: dự án chỉ
  phục vụ du lịch trong nước, thêm FX là mở một cái hố không ai xin.
- **KHÔNG dùng `AdminFields`** — đây là dữ liệu của người dùng, không phải nội dung biên
  tập. Không `status`/`publishedAt`/`isFeatured`.
- `TripExpense.dayId`/`itemId` là tuỳ chọn, để sau này gắn khoản chi vào đúng chặng.

### Hai chỗ dễ đụng nhau, phải phân tuyến từ đầu
1. **Ghi chú** vs `TripItem.note` vs `TripDay.note` (mẫu). Quy ước: note của mục nói về
   **mục đó**; ghi chú chuyến nói về **cả chuyến**. Nếu không viết ra thì sẽ có người gõ
   "nhớ mang kem chống nắng" vào ghi chú chuyến — thứ thuộc về danh sách đồ.
2. **Đồ mang theo có `assigneeId`** thì nó *đã là* một dạng phân công. Ranh giới:
   **Đồ = VẬT mang theo · Phân công = VIỆC phải làm** (đặt vé, gọi homestay xác nhận).
   Không vạch được ranh giới này thì sẽ có hai danh sách trông y hệt nhau.

## 6. Ràng buộc kỹ thuật đã biết

- **Quyền.** Mọi mutation mới phải đi qua `editableTrip()` (chủ **hoặc** thành viên) — xem
  bảng 14 chỗ trong `lich-trinh-cong-tac.md` §4. Bốn bảng × CRUD ≈ **16 action mới**, mỗi
  cái một lần kiểm. Nên có **một helper dùng chung** thay vì chép 16 lần, và thêm ca vào
  `pnpm check:trip-collab` — sót một chỗ là lộ dữ liệu chuyến người khác.
- **ĐỪNG `bump()` version ở các mục mới.** `Trip.version` sinh ra để chặn đụng độ **theo vị
  trí** khi kéo–thả. Hiện `bump()` chỉ được gọi ở 6 chỗ, đều là thêm/xoá/sửa ngày & mục.
  Tích một ô "đã chuẩn bị" mà cũng tăng version thì mỗi cú tích lại kéo theo revalidate cả
  trang lịch trình. Mục mới → `revalidatePath` **đúng đường dẫn của nó**, không đụng version.
- **URL.** `/lich-trinh/[id]/[muc]` với token `ghi-chu` · `do-mang-theo` · `phan-cong` ·
  `chi-phi`; lịch trình giữ nguyên `/lich-trinh/[id]` (không có token). Một route động, rẽ
  nhánh theo token — đúng khuôn `[loai]` của trang Place. Không kẹt với `s/` và `mau/`: hai
  cái đó là segment tĩnh ở cấp trên.
- **Ảnh.** `Image` đã có `tripId`. Ghi chú có ảnh không? Nếu có thì phải thêm nhánh mới vào
  exclusive arc — **để sau**, v1 chỉ chữ.

## 7. ✅ Điện thoại — ĐÃ CHỐT: tấm trượt ở thanh tiêu đề

Dưới `lg` đã có sẵn **một dải chọn 3 khung nhìn** (Lịch trình · Chưa xếp · Bản đồ). Thêm 5
mục nữa là **8 đích đến** trên một màn hẹp.

- ❌ Hai dải chồng nhau (mục ở trên, khung nhìn ở dưới) → đúng thứ `CLAUDE.md` đã chê ở màn
  hình Ẩm thực: *"~15 mục không đáng ba tầng điều khiển"*.
- ✅ **Menu các mục là một NÚT trong thanh tiêu đề** (`TripSectionSheet`), mở tấm trượt từ
  đáy. Nút hiện tên mục đang mở nên nó tự nói "bạn đang ở đây, chạm để đổi". Nhờ vậy dưới
  `lg` vẫn chỉ có **một** dải luôn hiện.
- Kèm theo: khối tên chuyến phải có `min-w-[13rem]` để cụm nút xuống dòng thay vì bóp tên.
  Tên chuyến là một `<input>` — bị bóp thì nó cắt cụt giữa chữ, không có dấu ba chấm.
- Ở các mục chưa có nội dung ngữ cảnh, dải 3 khung nhìn **biến mất hẳn** (chỉ còn một khung)
  và cột trái ẩn — menu đã nằm ở tấm trượt rồi.

## 8. Bốn câu phải chốt trước khi code

| # | Câu hỏi | Vì sao đổi hẳn thiết kế |
|---|---|---|
| 1 | ~~**Ghi chú**: một tài liệu chung hay nhiều mẩu?~~ | ✅ **đã phân tích ở §11** — đề xuất **nhiều mẩu** (`TripNote`), chữ thuần, không lên link chia sẻ |
| 2 | ~~**Đồ mang theo**: chung hay riêng từng người?~~ | ✅ **đã chốt ở §12.2** — MỘT danh sách chung + `assigneeId` |
| 3 | ~~**Chi phí**: dự trù ngân sách hay chia tiền?~~ | ✅ **CHIA TIỀN** — xem §13 |
| 4 | ~~**Phân công**~~ | ✅ **KHÔNG LÀM** — `TripPackItem.assigneeId` + `TripItem.note` đã phủ hết; xem §9 bước 5 |

## 9. Phân kỳ đề xuất — và một cảnh báo về quy mô

Bốn bảng, ~16 action, 5 màn hình, sửa điều hướng cả desktop lẫn mobile, sửa `duplicate`,
thêm ca kiểm quyền. **Xấp xỉ bằng toàn bộ lịch trình v1.** Đừng làm một lượt.

1. ✅ **Rail + định tuyến, chưa có tính năng nào** — đã dựng, xem §10.
2. **Ghi chú** — 1 bảng, 2 action. Rẻ nhất, dùng được ngay.
3. ✅ **Đồ mang theo — đã dựng** (§12). Kèm `assigneeId` ⇒ đã trả lời được một nửa "phân công".
4. ✅ **Chi phí — đã dựng** (§13).
5. ❌ **Phân công — BỎ HẲN, đã gỡ khỏi sidebar.** Dự đoán ở bước này thành sự thật: sau khi
   `TripPackItem.assigneeId` ra đời (ai mang món gì) cộng với `TripItem.note` của từng điểm
   dừng, một danh sách việc riêng chỉ còn là **danh sách thứ tư không ai điền**. Để nó làm
   cuối cùng chính là cách rẻ nhất để biết điều đó — và câu trả lời là đừng làm.


## 10. Bước 1 đã dựng — bản đồ mã nguồn

| File | Vai trò |
|---|---|
| `src/lib/trip-sections.ts` | **Nguồn chân lý** của 5 mục: token URL, nhãn, icon, cờ `soon`, câu mô tả. Thêm mục mới chỉ sửa ở đây |
| `src/components/trip/trip-side-nav.tsx` | `TripSideNav` (cột dọc, có bản thu gọn) + `TripSectionSheet` (nút + tấm trượt, chỉ dưới `lg`) |
| `src/components/trip/trip-topbar.tsx` | Thanh tiêu đề tách khỏi `trip-editor` — mọi mục dùng chung (kèm `TitleField`) |
| `src/components/trip/trip-soon.tsx` | Khối "Sắp ra mắt" trong khung, **không** dùng `site/coming-soon.tsx` |
| `src/components/trip/trip-shell.tsx` | Thêm `navTripId`; `aside` và `map` thành tuỳ chọn ⇒ bố cục tự rút còn 2 cột |
| `src/app/(site)/lich-trinh/[id]/[muc]/page.tsx` | Một route động cho cả bốn mục |
| `src/lib/trip.ts` → `getTripChrome()` | Nạp NHẸ phần khung (không kéo cây ngày → mục → 5 entity) cho các mục không đụng lịch trình |

Hai điểm hoàn thiện sau khi xem bằng mắt:

- **Đóng/mở cột trái có chuyển động**: `grid-template-columns` nội suy được vì cả hai giá trị
  đều là `<length>` (14rem ↔ 2.75rem) và hai track kia không đổi ⇒
  `lg:transition-[grid-template-columns] lg:duration-300`. Kèm `lg:overflow-x-hidden` (nội
  dung bị cắt chứ không đẩy ra thanh cuộn ngang) và `lg:w-56` khoá bề ngang bản mở rộng để
  chữ không xuống dòng loạn trong lúc cột co. Có `motion-reduce:transition-none`.
- **Ba chỗ cam trên cùng một màn hình** (dải chọn ngày · dấu ngày đang xem · mục đang mở ở
  sidebar) ⇒ dấu ngày phải nhẹ đi: xem `lich-trinh.md` §6.

Ba chỗ vấp, ghi lại:

- **`TripShell` nhận `navTripId` chứ KHÔNG nhận `nav={(collapsed) => …}`.** Menu phải đổi
  hình theo trạng thái thu gọn, mà trạng thái đó là `useState` của chính `TripShell`. Truyền
  một hàm dựng thì trang `[muc]` (Server Component) không gửi qua ranh giới client được:
  *"Functions cannot be passed directly to Client Components"*. **Typecheck không bắt được
  lỗi này** — chỉ mở trang mới thấy.
- **Đừng nối `· Halivivu` trong `generateMetadata`** — root layout đã có template
  `%s · <tên site>`, nối tay là ra hai lần.
- **`components/site/coming-soon.tsx` KHÔNG dùng lại được ở đây**: nó là một trang trọn vẹn
  (hero gradient chiếm hết khung nhìn + hai nút dẫn ra "danh sách điểm đến" và "trang chủ").
  Người dùng đang đứng trong chuyến của họ; ném hero ra giữa là làm gãy chỗ đang đứng, còn
  hai nút kia thì mời họ rời khỏi đúng thứ vừa mở.

## 10b. TripWorkspace — bốn mục render SẴN, chuyển mục không vòng server

Người dùng yêu cầu chuyển mục phải TỨC THÌ. Kiến trúc cũ (mỗi mục một route, mỗi cú bấm một
vòng server-render) bị thay bằng:

- **Cả hai route (`[id]` và `[id]/[muc]`) render CÙNG một `TripWorkspace`** với đủ dữ liệu
  của bốn mục — deep-link/F5 vào mục nào cũng ra đúng trang.
- **Sidebar đổi URL bằng `history.pushState`** (Next hỗ trợ shallow routing — `usePathname`
  cập nhật theo, Back/Forward chạy đúng), KHÔNG điều hướng. Giữ `<Link>` để cmd-click còn mở
  tab mới; `prefetch={false}` vì không bao giờ điều hướng qua chúng.
- **Mục đang mở chọn bằng CSS `hidden`**, không unmount — trạng thái dở tay (ô soạn đang mở,
  nhóm gợi ý đang bung) sống qua các lần đảo mục. Riêng cột phụ (bản đồ, Chưa xếp ngày, gợi ý
  đồ) mount theo mục — chúng thuộc về khung, không giữ trạng thái đáng tiếc.
- **Mọi mutation revalidate đủ bốn đường dẫn** (`refreshTripPaths`) — người dùng có thể đã
  deep-load bất kỳ mục nào rồi chuyển qua lại bằng pushState, mounted route là route nào
  không đoán được.
- `TripShell` rơi pane mobile về "days" khi cột của pane đang chọn biến mất (đang xem Bản đồ
  ở mục Lịch trình rồi nhảy sang Ghi chú — không được ra màn hình trắng).

Đổi lại: trang đầu nạp dữ liệu cả bốn mục một lượt — ba mục kia nhẹ (vài chục dòng DB), phần
nặng duy nhất (ORS) vốn đã phải trả cho mục Lịch trình. Đo thật: 4 lần chuyển mục ≈ 200ms
tổng, **0 request nội dung** tới server.

`TripSoon`, `getTripChrome`, cờ `soon`/`blurb` trên `TRIP_SECTIONS` chết theo kiến trúc cũ —
đã xoá.

## 11. Ghi chú — ✅ ĐÃ DỰNG

> Phân tích dưới đây là bản đã thi công. Mã nguồn: `TripNote` (schema) ·
> `getTripNotes()` (`lib/trip.ts`) · `addNote`/`updateNote`/`deleteNote`/`setNotePinned`
> (`lich-trinh/actions.ts`) · `components/trip/trip-notes.tsx` ·
> `pnpm check:trip-collab` (4 ca).

### 11.1 Nó giải quyết cái gì

Những thứ người ta thực sự gõ vào ghi chú của một chuyến:

| Loại | Ví dụ | Sau này có mục riêng không? |
|---|---|---|
| Mã & số | mã đặt phòng, số hiệu chuyến bay, biển số xe thuê | ❌ không — đây là ĐÚNG chỗ của nó |
| Liên hệ | số chủ homestay, số tài xế | ❌ không |
| Dặn dò cả nhóm | "6h sáng có mặt ở sảnh", "ai say xe nhớ uống thuốc trước" | một phần → Phân công |
| Ý chưa thành điểm dừng | "còn sức thì ghé chợ đêm" | một phần → mục Lịch trình |
| Tiền nong | "Minh ứng trước 2tr tiền phòng" | → Chi phí |
| Đồ đạc | "nhớ mang kem chống nắng" | → Đồ mang theo |

⇒ **Ghi chú sẽ là cái sọt** cho tới khi ba mục kia ra đời. Đó là **lý do nên làm nó
trước**: cái gì đọng lại trong sọt chính là bằng chứng ba mục kia cần gì. Nhưng cũng là lý
do phải giữ nó **cố tình vô cấu trúc** — đừng thêm trường `category` cho ghi chú, vì phân
loại ở đây là việc của bốn mục, không phải của một cái nhãn.

### 11.2 Không đụng ba chỗ ghi chú đã có

| Đã có | Ở đâu | Nói về cái gì |
|---|---|---|
| `TripItem.note` | ô sửa ngay dưới mỗi mục | **một điểm dừng** ("Nhận phòng, cất đồ") |
| `TripDay.note` | chỉ lịch trình mẫu | **một ngày**, giọng biên tập |
| `Trip.summary` | **chỉ CMS**, cho mẫu | mô tả của MẪU, hiện ở trang công khai + `<meta description>` |

`Trip.summary` **không phải** chỗ để nhét ghi chú người dùng, dù nghe giống: nó là nội dung
biên tập, có mặt trong SEO, và trình soạn công khai chưa từng có ô nhập cho nó.

Quy ước một dòng cần viết vào UI: **note của mục nói về mục đó; ghi chú chuyến nói về cả
chuyến.** Không viết ra thì sẽ có người gõ "nhớ mang kem chống nắng" vào cả hai chỗ.

### 11.3 ⭐ Câu chốt: MỘT tài liệu chung hay NHIỀU mẩu ghi chú

Đây là câu quyết định toàn bộ phần còn lại.

**Phương án 1 — một tài liệu chung** (`Trip.notes String? @db.Text`, không bảng mới)
- Rẻ nhất, và giống "sổ tay" nhất: có tiêu đề, có thứ tự do người viết đặt.
- ⚠️ **Hỏng đúng ở chỗ dự án này đã chọn không có realtime** (§5). Hai người cùng mở, cùng
  gõ, người lưu sau **ghi đè sạch** đoạn của người kia — im lặng, không báo gì.
- `Trip.version` **không cứu được**: nó phát hiện lệch, nhưng phát hiện xong thì làm gì?
  Từ chối lưu ⇒ người dùng mất đoạn vừa gõ trừ khi ta giữ lại trong ô rồi bắt họ tự trộn tay.
- Còn một câu khó nữa: **lưu lúc nào?** Tự lưu mỗi 2 giây thì ghi DB liên tục; lưu lúc rời ô
  thì đóng tab là mất. Không có mốc "xong" rõ ràng.

**Phương án 2 — nhiều mẩu ghi chú** (`TripNote`, mỗi mẩu một bản ghi)  ← **đề xuất**
- Xung đột **teo lại về gần bằng không**: hai người hiếm khi sửa cùng MỘT mẩu; thường là mỗi
  người thêm mẩu của mình.
- Điểm mấu chốt không phải xác suất mà là **bán kính thiệt hại**: một lần ghi đè ở phương án
  1 xoá **mọi thứ cả nhóm đã viết**; ở phương án 2 nó xoá **một mẩu**. Đã chọn không có
  realtime thì phải chọn cấu trúc có bán kính nhỏ — đó là cách xử lý bằng THIẾT KẾ, không
  phải bằng miếng vá.
- Có **mốc "xong" rõ ràng**: bấm "Thêm". Không phải nghĩ chuyện tự lưu.
- Có sẵn **tác giả + thời gian** → trong nhóm, "ai ghi cái này" là thông tin thật; và
  `TripMember` đã có avatar để hiện.
- ⚠️ Đổi lại: 20 mẩu vụn không đọc ra như một tài liệu. Trị bằng **ghim** (một boolean), chứ
  đừng vội thêm sắp xếp tay.

> **Chốt đề xuất: phương án 2.** Nếu sau này thật sự cần một tài liệu dài liền mạch, đó là
> một bài blog gắn vào chuyến, không phải một ô textarea không có khoá.

### 11.4 Chữ thuần, KHÔNG rich text

TipTap + `cleanHtml()` đã có sẵn (dùng cho blog) nên rất dễ với tay lấy. Đừng.

- Thứ ghi chú thật sự cần chỉ có **xuống dòng** và **link bấm được** (link đặt phòng, Google
  Maps). Không ai cần in đậm mã đặt phòng.
- Rich text kéo theo cả bundle TipTap vào một trang vốn phải mở nhanh, cộng thêm một mặt
  phẳng XSS phải nhớ `cleanHtml` ở mọi chỗ đọc.
- ⇒ **`String` thuần**, render giữ xuống dòng (`whitespace-pre-wrap`), tự nhận link khi
  hiển thị. Bắt buộc **escape trước rồi mới nối `<a>`**, hoặc dựng bằng JSX thay vì
  `dangerouslySetInnerHTML` — sai thứ tự là mở lại đúng lỗ vừa tránh.
- Giới hạn: `MAX_NOTE` hiện là **500** (dùng cho note của mục). Ghi chú chuyến cần dài hơn —
  đề xuất **2000/mẩu**, hằng riêng, đừng nới cái cũ.

### 11.5 ⚠️ Sửa lại §3: ghi chú KHÔNG lên link chia sẻ

Bảng §3 trước đó ghi "Chia sẻ: ✅ đọc". **Sai, phải bỏ.**

`/lich-trinh/s/[shareId]` **không gọi `auth()`** — ai có link đều xem được. Mà ghi chú lại
đúng là mục **dễ chứa dữ liệu riêng tư nhất** trong cả bốn: mã đặt phòng, số điện thoại chủ
nhà, chuyện tiền nong. Bật mặc định là biến "gửi link cho bạn xem lịch trình" thành rò rỉ.

| | Soạn | Chia sẻ (link công khai) | Mẫu (biên tập viết) |
|---|---|---|---|
| Ghi chú | ✅ | ❌ **không hiện** | ✅ đọc |

Mẫu thì ngược lại — ghi chú do biên tập viết là **tri thức thực địa**, không có dữ liệu
riêng tư, và nhân bản mẫu phải mang ghi chú đi theo (yêu cầu cho action `duplicate`).

Nếu sau này thật sự cần khoe ghi chú qua link, làm bằng cờ **từng mẩu** (`isShared`) với mặc
định `false` — không bao giờ bằng một công tắc chung cho cả mục.

### 11.6 Quyền

**Ai trong chuyến cũng sửa/xoá được mọi mẩu** — kể cả mẩu người khác viết.

Lý do là tính nhất quán, không phải sự dễ dãi: thành viên **đã** xoá được điểm dừng của
người khác trong lịch trình. Dựng riêng một luật chặt hơn cho ghi chú thì hai mục cạnh nhau
hành xử khác nhau mà không ai giải thích được vì sao. `TripMember` chính là ranh giới tin
cậy — đã mời vào thì đã tin.

- Mọi action qua `editableTrip()` (chủ **hoặc** thành viên), thêm ca vào `check:trip-collab`.
- **KHÔNG `bump()` `Trip.version`** — version là để chặn đụng độ **theo vị trí** khi kéo–thả.
- Giữ `authorId` để hiện "ai viết", `onDelete: SetNull` (gỡ người khỏi chuyến không được xoá
  ghi chú họ để lại).

### 11.7 Dữ liệu & action

```prisma
model TripNote {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  body      String                       // chữ thuần, ≤ 2000
  authorId  String?                      // SetNull khi người đó bị gỡ khỏi chuyến
  isPinned  Boolean  @default(false)     // ghim lên đầu — thay cho sắp xếp tay
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([tripId, createdAt])
}
```

Ba action: `addNote(tripId, body)` · `updateNote(noteId, body)` · `deleteNote(noteId)`
(+ `pinNote` nếu làm ghim ngay). Mỗi cái `revalidatePath` **đúng đường dẫn của mục**, không
đụng trang lịch trình.

### 11.8 Giao diện — bốn lỗi "AI slop" của bản đầu

Bản đầu chạy đúng nhưng nhìn như một khung bình luận. Đối chiếu `lich-trinh.md` §6a:

| Lỗi | Vì sao sai | Sửa thành |
|---|---|---|
| Meta ngăn bằng chuỗi `·`: `Sang · 5 phút trước · đã sửa` | Người dùng **đã bác** cách ngăn này ở mục lịch trình | **Không dấu ngăn nào**: tên trái, giờ phải, khác nhau bằng khoảng cách + sắc độ. Và "đã sửa" gộp vào chính con số → `đã sửa 5 phút trước` là MỘT dữ kiện thay vì hai |
| Thân ghi chú để `text-sm` xám như mọi meta khác | Nó là thứ **duy nhất** người ta mở mục này để đọc — đúng lỗi "giờ đặt `text-sm` xám" ở §6a | Thân là **cột sống typographic**: `text-base`, `leading-[1.7]`, màu foreground; meta co xuống `text-xs` |
| Ô soạn luôn mở (textarea cao 9rem) | Mở mục ra là thấy một cái form rỗng, trong khi phần lớn lượt người ta tới để **ĐỌC** lại | Lúc nghỉ là **một dòng**, chạm mới bung ra. Có `⌘/Ctrl+Enter` để gửi, `Esc` để đóng |
| Trạng thái rỗng = hộp viền đứt + icon tròn canh giữa | Khuôn mẫu dán vào sản phẩm nào cũng vừa | Canh trái, **không hộp**, nói thẳng **ba thứ cụ thể** nên ghi — vấn đề thật của người mới mở là "ghi cái gì vào đây" |

Thêm hai điều chỉnh:

- **Ghim là một NHÓM có nhãn** (`ĐÃ GHIM` / `GẦN ĐÂY`, dùng `MICRO`), không phải một icon
  nhỏ lẫn trong meta. Nhóm nói rõ vì sao mấy mẩu này nằm trên; icon thì bắt người ta tự đoán.
  Nhãn chỉ hiện khi **thật sự có hai nhóm** — một nhãn cho một danh sách duy nhất là chữ thừa.
- **Cột đọc canh giữa** (`mx-auto max-w-[44rem]`): mục này không có bản đồ như mục Lịch trình,
  nên một cột hẹp dán sát sidebar để lại mảng trống lớn bên phải — nhìn như bố cục chưa xong.
  `TripSoon` canh giữa theo cho khớp.

Hàng nút (ghim · sửa · xoá) nằm **cuối hàng meta**, hiện khi rê chuột / focus, luôn hiện trên
máy cảm ứng. Đặt ở đó vì giờ nằm bên trái cạnh tên ⇒ bật/tắt nút **không đẩy chữ chạy**.

### 11.9 Cố ý KHÔNG làm

- **Không thành khung chat** (trả lời, thread, cảm xúc). Thảo luận đã có phần Cộng đồng, mà
  chat thì cần realtime — thứ dự án này đã chủ động bỏ (§5).
- **Không thông báo** khi có mẩu mới, ở v1. `notify()` đã có nên thêm rất dễ, nhưng nhóm 4
  người mà mỗi mẩu bắn 3 thông báo thì chuông thành nhiễu. Ghi chú không gửi cho ai cả —
  người ta đọc nó khi mở chuyến. Xem lại sau nếu có người hỏi.
- **Không ảnh trong ghi chú** ở v1. `Image` đã có `tripId`, nhưng ảnh kéo theo exclusive arc,
  upload, và phần lớn thứ người ta muốn dán là **ảnh chụp màn hình mã đặt phòng** — thứ càng
  không nên nằm trên một link công khai.
- **Không gắn ghi chú vào một ngày/một mục.** Đã có `TripItem.note` và `TripDay.note`.

### 11.10 Còn treo

1. ✅ **Ghim — đã làm** (`isPinned`), thay cho sắp xếp tay.
2. **Ghi chú của MẪU chưa hiện ở trang công khai** `/lich-trinh/mau/[slug]`: trang chỉ-đọc
   chưa có sidebar mục nên chưa có chỗ đặt. Dữ liệu thì đã đủ — `cloneTrip` **đã chép ghi
   chú** sang bản sao, nên mẹo thực địa của mẫu vẫn đến được tay người dùng.
3. **Số điện thoại chưa bấm gọi được** — chỉ URL mới thành link. Bắt số điện thoại VN dễ ăn
   nhầm mã đặt phòng ("SH-4471"), nên để sau khi có ví dụ thật.
4. **Ghi chú có vào bản lưu offline không?** Đây đúng là thứ cần nhất lúc mất sóng (mã đặt
   phòng ở cửa homestay). Offline vẫn chưa làm (`lich-trinh.md` §13) — nhưng khi làm thì
   ghi chú phải nằm trong snapshot, đừng để sót.

## 12. Đồ mang theo — ✅ ĐÃ DỰNG

> Mã nguồn: `TripPackItem` (schema) · `getTripPackItems()` (`lib/trip.ts`) ·
> `addPackItem`/`updatePackItem`/`deletePackItem` (`lich-trinh/actions.ts`) ·
> `components/trip/trip-packing.tsx` · `pnpm check:trip-collab`.

### 12.1 Vấn đề thật KHÔNG phải "quên mang quần áo"

Ai cũng nhớ mang quần áo. Thứ hỏng trong chuyến nhóm là:

> **Ba người cùng mang sạc dự phòng, không ai mang lều.**

Đó là chuyện **phân công đồ chung**, không phải chuyện liệt kê đồ. Vì vậy trục chính của mỗi
hàng là **AI MANG**, và trạng thái đáng chú ý nhất của danh sách là **"chưa ai nhận"** — nó
hiện thành một nút nền cam nhạt chứ không phải một ô trống, vì ô trống thì không ai bấm.

### 12.2 HAI NHÓM ĐỒ — và vì sao đánh đổi ở bản đầu đã bị lật

Bản đầu chỉ có **một** danh sách chung + `assigneeId`, và tôi đã ghi rõ đánh đổi: ô tick của
một món cá nhân hơi mơ hồ, "bảng `TripPackCheck(itemId, userId)` mua độ chính xác ở đúng trục
ít quan trọng nhất". **Sai** — người dùng chỉ ra rằng đó chính là cách người ta chuẩn bị đồ
thật. Giờ có `TripPackItem.scope`:

| | Đồ chung (`group`) | Đồ riêng (`personal`) |
|---|---|---|
| Ví dụ | lều, loa, bộ sạc, túi rác | bàn chải, thuốc riêng, quần áo |
| Người nhận | ✅ `assigneeId` | ❌ — ai cũng phải mang một cái |
| Trạng thái | **CHUNG** — Minh xếp rồi là cả nhóm xong | **RIÊNG từng người**, lưu ở `TripPackCheck` |
| Thấy tick của người khác | có | **không** — "tự xem" đúng nghĩa |

`TripPackCheck` **chỉ tạo khi có người tick lần đầu** (upsert). Tạo sẵn cho mọi người × mọi
món thì chuyến 5 người × 30 món đã là 150 dòng rỗng.

`getTripPackItems(tripId, viewerId)` **quy cả hai về một hình dạng hàng** trước khi trả cho
UI — món chung lấy cờ trên bản ghi, món riêng lấy tick của người đang xem. Nhờ vậy giao diện
không phải rẽ nhánh ở mọi chỗ.

Đổi một món sang `personal` thì **bỏ luôn người nhận**: đồ ai cũng phải mang thì không có
chuyện "Minh mang hộ".

### 12.2b HAI BƯỚC CHUẨN BỊ — nằm trong CHÍNH Ô TICK

Hai bước bám sát đời thật, cách nhau vài ngày:

1. **"Đã có sẵn"** (`isReady`) — soát trong nhà xem CÓ chưa; thiếu thì còn kịp mua hoặc mượn.
2. **"Đã xếp vào túi"** (`isPacked`) — tối trước hôm đi, soát lần cuối.

Gộp hai bước vào một ô tick nhị phân là đánh mất **đúng chỗ hay hỏng**: có sẵn ở nhà không có
nghĩa là nó đã nằm trong túi.

Nhưng chúng là hai NẤC của cùng một món, nên chúng ở cùng một ô — **một dấu ba trạng thái,
bấm để đi tiếp**:

```
○ chưa có  →  ◍ đã có sẵn  →  ● đã xếp vào túi  →  ○ …
```

Cùng một hình tròn, **đầy dần** (viền mảnh → viền đậm + tick màu → tô đặc + tick trắng) nên
nhìn ra ngay là một tiến trình, không phải ba biểu tượng rời rạc. `StateMark` dùng chung cho ô
trên từng hàng **và** cho chú giải ở đầu trang, nên hai chỗ không thể trôi khác nhau — và chú
giải **vẽ ra** ba nấc chứ không tả bằng lời, vì một vòng bấm ba trạng thái phải nhìn mới hiểu.

> ⚠️ **Đã thử và BỎ: hai TAB "Đã có sẵn" / "Đã xếp vào túi".** Hỏng hai chỗ: mỗi lúc chỉ thấy
> được một nửa sự thật — muốn biết *"món này có rồi nhưng đã bỏ vào túi chưa"* phải nhảy qua
> nhảy lại; và cái tab ấy là thêm **một tầng điều khiển** cho một thông tin vốn thuộc về từng
> hàng. Đừng dựng lại.

Vì ô đi theo vòng, **`packed` luôn kéo theo `ready`** — nhờ vậy câu tóm tắt *"6/11 đã có sẵn,
trong đó 2 đã xếp vào túi"* luôn đúng, và không sinh ra trạng thái lạ kiểu "đã xếp mà chưa có".

> **Migration giữ dữ liệu:** cột `isDone` cũ mang đúng nghĩa lượt một nên migration
> `20260820140000_trip_packing_scope` **đổi tên** (`RENAME COLUMN`) thay vì drop-rồi-add —
> `prisma migrate dev` mặc định sinh drop+add và sẽ xoá sạch tick người dùng đã đánh.

### 12.3 Ba trường cố ý KHÔNG có

| Bỏ | Vì sao |
|---|---|
| `qty` | Tên món tự nói: người ta gõ "2 ổ cắm", không ai đi điền ô số lượng |
| `category` | Phân loại là việc của **bốn mục**, không phải của một cái nhãn — cùng lý do đã bỏ nó ở `TripNote` (§11.1). Và nhóm theo **người** hữu ích hơn nhóm theo loại |
| `order` | Đây là checklist, không phải lịch trình. Không ai xếp lại thứ tự đồ đạc |

**Mục ĐỒ RIÊNG chia nhóm theo danh mục** (Giấy tờ & tiền · Thuốc & y tế · Vệ sinh cá nhân…),
mục ĐỒ CHUNG để phẳng. Không phải cho đối xứng mà theo việc thật: đồ riêng là danh sách DÀI
nhất và người ta **soát theo từng cụm**, không đọc tuần tự; đồ chung vốn ngắn, chia nhóm thì
thành mấy tiêu đề cho mỗi một món. Mỗi cụm có số `xong/tổng` của lượt đang xem — đó chính là
thứ làm việc rà soát nhanh.

Nhóm **suy từ danh mục** (`groupOfItem()`), KHÔNG lưu trường `category` trên `TripPackItem`:
món thêm từ bảng gợi ý — phần lớn — tự vào đúng nhóm mà không ai phải điền gì, còn món tự gõ
rơi vào **"Khác"**. Thà một nhóm gom lại còn hơn bắt người dùng phân loại từng thứ họ gõ. Thứ
tự cụm theo danh mục (không theo thứ tự thêm vào): rà soát thì cần cùng một trình tự mỗi lần mở.

Ô **thêm món nằm TRONG từng mục** ("Thêm đồ chung…" / "Thêm đồ riêng…") chứ không phải một ô
chung ở đầu trang — nhờ vậy khỏi cần một công tắc "thêm vào đâu": gõ ở mục nào là vào mục đó.

### 12.4 Thứ tự CỐ ĐỊNH, không đẩy món đã xong xuống cuối

Sắp theo `createdAt`, y nguyên. Đẩy món vừa tick xuống đáy nghe thì gọn, nhưng tick ba món
liên tiếp mà danh sách nhảy loạn dưới tay thì không ai tick tiếp. Muốn chỉ thấy phần còn
thiếu thì có công tắc **"Ẩn món đã xong"** — chỉ hiện khi đã có món xong.

### 12.5 Giao diện

```
[ Thêm món đồ rồi bấm Enter…            ] [+ Thêm]
3/8 đã chuẩn bị │ 3 món chưa ai nhận        Ẩn món đã xong
───────────────────────────────────────────────────────
☑  L̶o̶a̶ ̶b̶l̶u̶e̶t̶o̶o̶t̶h̶                    (S) Sang Pham   🗑
☐  Ô / áo mưa                        [👤+ Chưa ai nhận]
```

- **Ô nhập luôn mở** — khác Ghi chú (một dòng, chạm mới bung). Đây là danh sách điền **thành
  tràng**: gõ tên, Enter, gõ tiếp. Ô xoá ngay khi gửi (không đợi server) và giữ con trỏ.
- **Số trần, `tabular-nums`** cho tiến độ — KHÔNG thanh tiến trình: thanh đó chỉ vẽ lại đúng
  con số bằng một mảng màu (`lich-trinh.md` §6a). Hai dữ kiện ngăn bằng **vạch dọc mảnh**,
  không phải dấu chấm.
- **Tên sửa tại chỗ** bằng ô nhập trong suốt, lưu khi rời ô — cùng cách tên chuyến ở thanh
  tiêu đề đang làm, nên không cần thêm nút bút.
- Nút xoá hiện khi rê chuột nhưng **luôn chiếm chỗ** (`opacity`, không phải `display`) ⇒ rê
  vào không làm cả hàng dịch.
- Trạng thái rỗng: canh trái, không hộp, ba ví dụ cụ thể — cùng khuôn với Ghi chú (§11.8).

### 12.6 Nhân bản mẫu: chép TÊN, không chép người & không chép trạng thái

`cloneTrip` mang danh sách đồ theo — mẫu Tà Xùa ghi "áo ấm, giày bám" là tri thức thực địa,
đúng thứ đáng thừa kế. Nhưng **không** chép `assigneeId` (người trong chuyến mới khác hẳn) và
**không** chép `isDone` (chuyến mới thì chưa xếp gì).

### 12.7 Quyền

Cùng luật với ghi chú: ai trong chuyến cũng thêm/sửa/gán/xoá được mọi món. Không `bump()`
version. Thêm một lớp kiểm ở server: **chỉ gán được cho người THỰC SỰ ở trong chuyến** — nếu
không, một id bất kỳ gửi lên sẽ hiện thành "ai đó" không rõ danh tính trên danh sách.

`assigneeId` dùng `SetNull`: gỡ một người khỏi chuyến thì món **quay về "chưa ai nhận"** chứ
không biến mất — đúng trạng thái thật lúc đó. Có ca kiểm cho việc này.

### 12.8 Bảng gợi ý — chọn nhanh từ danh mục có sẵn

`src/lib/packing-suggestions.ts`: **8 nhóm, ~45 món**, để thẳng trong mã nguồn chứ không
phải một bảng DB. Đây là nội dung gần như không đổi, dùng chung cho mọi chuyến, và không ai
cần một màn hình CMS để sửa — cùng cách dự án đang giữ `TRIP_SECTIONS`, `*_CATEGORY_LABELS`.
Khi nào biên tập thật sự cần tự thêm bớt thì mới tách bảng.

**BẤM LÀ SANG NGAY, bấm lần nữa là bỏ ra.** Bản trước bắt tick một loạt rồi bấm "Thêm N món" —
ít vòng máy chủ hơn, nhưng thêm một bước cho việc mà người dùng nghĩ là một bước, và cái nút ấy
còn kéo theo cả chuyện ghim chân cột. Đổi lại là mỗi cú bấm một vòng máy chủ; bù bằng
**`useOptimistic`** (dấu tick đổi ngay, React tự trả về sự thật của server khi xong).

> Dùng `useOptimistic` chứ không phải một `useState` tự quản: bản tự quản phải tự dọn ghi đè,
> mà dọn trong `useEffect` thì vướng luật *"không setState đồng bộ trong effect"* của React
> Compiler — còn không dọn thì nó âm thầm che sự thật khi người khác trong nhóm xoá đúng món
> mình vừa thêm.

**Điểm đến do một CÔNG TẮC HIỆN RÕ ở đầu bảng quyết định** (Đồ riêng / Đồ chung, dính trên đầu
vùng cuộn). Bản trước để mỗi nhóm trong danh mục tự khai `scope` — nghe gọn nhưng hỏng ở chỗ
**điểm đến trở nên vô hình**: bấm một loạt rồi mới phát hiện mọi thứ nằm ở mục đồ riêng, và
không có cách nào bảo nó vào mục chung. Người dùng báo đúng lỗi đó. Thà một dòng chữ còn hơn
một quy tắc ngầm mà chỉ tác giả biết.

**Nó là CỘT PHẢI THẬT của `TripShell`, đóng/mở như sidebar bên trái** — không phải một lớp nổi
đè lên trang. Đã thử hai bản trước và bỏ: (1) khối bung ra giữa trang đẩy chính danh sách xuống
dưới màn hình; (2) `Sheet` nổi lên che mất danh sách, nên không vừa chọn vừa thấy được nó lớn
dần. Cột thật giải quyết cả hai.

`TripShell` vì thế có thêm `right` / `rightTitle` / `rightIcon` — khác `map` ở chỗ **thu gọn
được** (mở sẵn, gấp lại thành một thanh dọc mang icon + nhãn xoay dọc). Dưới `lg` nó là một
khung nhìn trong dải ba viên có sẵn.

> ⚠️ **`rightIcon` nhận TÊN icon, không nhận component.** Component React là một HÀM, mà hàm
> không qua được ranh giới Server → Client. Đây là lần **thứ hai** giẫm phải (lần đầu ở prop
> `nav`, §10) và `tsc` không bắt được lần nào — chỉ mở trang mới thấy "Trang gặp trục trặc".

**Bên trong xếp DỌC**: mỗi món một hàng có ô tick, nhóm bởi tiêu đề micro, chân ngăn kéo
**ghim** nút "Thêm N món". Bản trước là một đám viên chữ xếp ngang — gói được nhiều món hơn
trên một màn, nhưng trong một cột hẹp thì chúng gãy dòng lung tung và mắt phải nhảy zigzag.

**Mỗi nhóm GẤP LẠI ĐƯỢC, mặc định gấp hết.** Không phải để cho gọn mắt mà vì một lý do đo
được — xem "ba thanh cuộn" ngay dưới. Mở/đóng bằng `grid-template-rows: 0fr ↔ 1fr` chứ không
phải `max-height` phỏng chừng: nội suy được nên mượt, mà khỏi đoán trước chiều cao (đoán hụt
thì cắt nội dung, đoán thừa thì giật một quãng trống). Cùng kỹ thuật với chiều ngang sidebar.
Nhóm gấp lại vẫn hiện **số món đã tick** để biết mình chọn gì ở đâu.

### 12.8b Ba thanh cuộn và cái nút bị khuất — bốn thuộc tính CSS phải đi cùng nhau

Bản đầu của cột phải có **ba thanh cuộn** trên một trang và nút "Thêm" nằm dưới nếp gấp. Bốn
sửa đổi, mỗi cái trị một nguyên nhân khác nhau — thiếu một là hỏng lại:

| Sửa | Vì sao |
|---|---|
| Cột phải **bỏ `overflow-y-auto`** | Nội dung cột tự lo cuộn (nó cần chân ghim). Để cả hai cùng cuộn được là **hai thanh cuộn lồng nhau** trong cùng một cột |
| ...nhưng cũng **không `overflow-hidden`** | `overflow` khác `visible` biến chính cột thành **khung neo của `position: sticky`** ⇒ chân ghim dính vào đáy CỘT (có thể dưới nếp gấp) thay vì đáy KHUNG NHÌN |
| `max-h-[100dvh]` thay cho `h-[100dvh]` | Cột dính `top-0` nhưng lúc chưa cuộn nó bắt đầu **bên dưới** thanh tiêu đề chuyến. Ép `h` = 100dvh thì đáy cột rơi khỏi màn hình đúng bằng chiều cao thanh đó |
| `self-start` | Ô lưới mặc định **giãn** cho bằng chiều cao hàng, nên chỉ `max-h` thôi thì cột vẫn bị cột giữa kéo dài ra |

Và bên trong dùng **`flex-auto` chứ không `flex-1`**: `flex-1` là `flex: 1 1 0%` — basis 0.
Trong một flex-column **chiều cao tự động** (`max-h`, không phải `h`) thì tổng basis = 0 nên cả
cột **sập xuống 0px**. `flex-auto` (`1 1 auto`) cao bằng nội dung khi còn chỗ, co lại khi chạm
trần.

Kết quả: gấp hết nhóm thì cột chỉ cao bằng nội dung và nút "Thêm" nằm ngay trong tầm mắt, KHÔNG
phải cuộn; bung nhóm ra thì cột chạm trần 100dvh, phần danh sách cuộn bên trong còn nút vẫn ghim
đáy. Trang còn **một** thanh cuộn.

Hai chi tiết còn giữ từ bản ngăn kéo:

- **Ô tick TRÒN**, khác hẳn ô vuông của danh sách chính: ở đây nó nói *"chọn để thêm"*, ngoài
  kia nó nói *"đã có sẵn"*. Cùng một hình vuông cho hai nghĩa là mời người ta hiểu nhầm.
- **Nút "Thêm N món" GHIM ở chân cột**: cuộn tới nhóm thứ tám rồi mà nút nằm tận đáy nội dung
  thì phải cuộn ngược lên mới thấy.

Ba chi tiết bắt buộc:

- **Món đã có trong danh sách thì viên bị KHOÁ** (mờ + dấu tick, không bấm được) — so khớp
  qua `packKey()` (bỏ dấu cách thừa, không phân biệt hoa/thường). Chặn ở **cả server**, vì
  bảng gợi ý và danh sách có thể lệch một nhịp khi hai người cùng thêm.
- **Mỗi món nằm ĐÚNG MỘT nhóm** (kính râm chỉ ở "Chống nắng", không lặp ở "Vệ sinh cá nhân")
  — trùng lặp làm người ta thêm hai lần cùng một thứ.
- **Món đã có bị gạch ngang + nhãn "đã có"**, không bấm được — nói thẳng vì sao nó khác, thay
  vì chỉ làm mờ đi rồi để người dùng đoán.

> ⚠️ **CỐ Ý chưa gợi ý theo điểm đến** (biển / núi / mùa lạnh). Suy khí hậu ra từ `Place` hay
> `Spot.category` là ĐOÁN, mà đoán sai ở đây thì sai **lặng lẽ** — đúng cái bẫy `lich-trinh.md`
> §9.3 đã chỉ ra với giá tiền. Muốn làm thì thêm một trường thật trên `Place` trước.

### 12.9 Còn treo

1. **Chưa có bộ lọc "của tôi"** — với ~20 món thì avatar trên từng hàng đã đủ để quét. Thêm
   khi danh sách thật sự dài.
2. **Ngăn kéo gợi ý chưa có ô tìm kiếm** — ~45 hàng chia 8 nhóm, cuộn hết mất 3–4 màn. Nếu
   danh mục dài thêm thì đây là thứ cần bổ sung trước tiên.
3. **Danh sách đồ của MẪU chưa hiện ở trang công khai** — cùng lý do với ghi chú (§11.10):
   trang chỉ-đọc chưa có sidebar mục. Dữ liệu thì đã đến tay người dùng qua `cloneTrip`.


## 13. Chi phí — ✅ ĐÃ DỰNG

> Mã nguồn: `TripExpense` + `TripExpenseShare` (schema) · **`lib/trip-money.ts`** (toán thuần) ·
> `getTripExpenses()` · `addExpense`/`deleteExpense` · `components/trip/trip-money.tsx` ·
> **`pnpm check:trip-money`** (20 ca, không cần DB).

### 13.1 ✅ Chốt câu 3 của §8: SỔ CHIA TIỀN, không phải bảng dự trù

Việc thật của nhóm bạn không phải *"chuyến này dự kiến hết bao nhiêu"* — gần như không ai lập
ngân sách cho ba ngày. Việc thật là **"ai ứng bao nhiêu, cuối chuyến ai trả ai"**, thứ mà bình
thường phải lục lại tin nhắn để cộng. Nên mục này ghi **khoản ĐÃ CHI**, không ghi dự trù.

> ⚠️ Đây KHÔNG mâu thuẫn `lich-trinh.md` §9.3. Chỗ đó bỏ việc **SUY RA** giá từ danh mục
> (`Eatery`, `Accommodation`…) vì mọi con số kiểu đó sai một cách vô hình. Ở đây số do người
> dùng **GÕ VÀO**. Bất biến giữ nguyên: **không bao giờ tự điền tiền từ dữ liệu danh mục.**

### 13.2 Mô hình

`amount` là **ĐỒNG, số nguyên**. Không `currency` (chỉ du lịch trong nước), không `category`
(cùng lý do đã bỏ ở `TripNote`/`TripPackItem`). Mỗi khoản có **người ứng tiền** và một danh
sách **chia ĐỀU** (`TripExpenseShare`) — cố ý không có số tiền trên từng phần: chia theo tỉ lệ
là bài toán khác hẳn, còn nhóm bạn đi chơi gần như luôn chia đều.

**Chia LÀM TRÒN LÊN NGHÌN, người ứng tiền chịu phần lẻ.** Không ai chuyển khoản 33.333đ. Mọi
người trừ một người *hứng phần lẻ* đều trả đúng một số tròn nghìn; người hứng lấy phần còn
lại — và người hứng mặc định là **người ứng tiền**, vì họ vốn không phải chuyển khoản cho ai
nên số lẻ nằm ở đó là chỗ vô hại nhất.

```
100.000 chia 3, A ứng tiền  →  B 34.000 · C 34.000 · A 32.000   (tổng vẫn 100.000)
```

Hai bất biến phải giữ, có ca kiểm riêng cho từng cái:

1. **Tổng các phần luôn đúng bằng số gốc.** Làm tròn lên rồi cộng lại thì 34.000×3 = 102.000 —
   tự nhiên đẻ ra 2.000đ không có thật, và sổ nợ lệch khỏi 0.
2. **Mọi lượt chuyển khoản đều là số tròn nghìn.** Vì phần của người-không-ứng-tiền luôn tròn,
   còn phần lẻ nằm ở người ứng tiền (người NHẬN), nên số dư của ai cũng là bội của 1.000.

Khoản quá nhỏ so với số người (1.000đ chia 3) thì làm tròn lên sẽ vượt quá số gốc → **quay về
chia đều chính xác**: thà số lẻ còn hơn bịa ra tiền không có.

Con số `…đ/người` ở dòng tóm tắt cũng làm tròn lên nghìn, nên nó có thể nhỉnh hơn tổng chia
đều đúng vài trăm đồng — cố ý, và dòng chú thích dưới "Ai trả ai" nói rõ quy tắc.

**"Ai trả ai"** ghép người nợ nhiều nhất với người được nợ nhiều nhất, lặp lại. Không phải lúc
nào cũng ít lượt nhất về mặt toán học, nhưng với nhóm 3–6 người thì tối ưu trong thực tế và
đọc được — điều cần ở đây là ít lượt chuyển khoản, không phải tối ưu tuyệt đối.

### 13.3 Giao diện

- Tóm tắt bằng **số trần**: `3.690.000đ đã chi │ 3 khoản │ 1.845.000đ/người`. KHÔNG biểu đồ
  tròn — một cái bánh chia màu chỉ vẽ lại đúng mấy con số này mà lại đòi thêm bảng chú giải.
- **Ô tiền tính bằng NGHÌN ĐỒNG** — gõ `350` là 350.000đ, đuôi `.000đ` in chết ngay trong
  khung nhập nên đơn vị không thể hiểu nhầm. Ba số 0 cuối không mang thông tin (không ai chi
  lẻ dưới nghìn) mà gõ thì dễ thừa thiếu một con số 0. Bản đầu có bộ đoán hậu tố `350k`/`2tr`
  (`parseVnd`) — đơn vị cố định rồi thì nó chỉ còn là chỗ để hiểu sai, **đã xoá**.
- **Chip mệnh giá tiền VN cộng dồn** (`+1k … +500k`, đủ chín mệnh giá): 370k = bấm 200 + 100 + 50 + 20 — nhanh
  hơn gõ khi đang cầm điện thoại, và khớp với cách người ta nhớ khoản chi (theo tờ tiền vừa
  đưa). Dòng `= 370.000đ` hiện lại tổng sau mỗi cú bấm; có nút ✕ xoá về không.
- **Popover "chia cho" có hai nút một-phát**: *Cả nhóm* / *Chỉ mình tôi* — hai đáp án chiếm
  gần hết trường hợp thật, bấm xong đóng luôn popover. Tick từng người chỉ dành cho ca lẻ
  "bữa này thiếu một đứa". Nhãn ngoài form cũng đọc ra "mình tôi" khi đúng ca đó.
- Người ứng tiền mặc định là **chính mình**, chia cho **cả nhóm** — hai thứ đúng trong đa số
  trường hợp, đổi được bằng hai popover ngay dưới ô nhập.
- **Chuyến đi một mình tự thoái hoá thành sổ chi tiêu**: không hỏi ai trả, không hỏi chia cho
  ai, không có khối "ai trả ai". Cùng một màn hình, ít câu hỏi hơn.

### 13.3b Xoá là XOÁ MỀM — sổ tiền chung không được phép quên

Ai trong chuyến cũng xoá được khoản chi (luật chung của mọi mục), nhưng với TIỀN thì xoá lặng
lẽ là một lỗ hổng: danh sách dài, một người "gian" rút một hoá đơn khỏi sổ và không ai nhận
ra. Vì vậy:

- `deleteExpense` chỉ đặt `deletedAt` + `deletedById` — **không có đường xoá thật nào từ giao
  diện** (xoá thật duy nhất là Cascade khi xoá cả chuyến).
- Khoản đã xoá nằm trong mục **"Đã xoá"** gấp được ở cuối trang, kèm **tên người xoá + lúc
  nào** — ai xoá là thông tin chính của mục, không phải chú thích — và **khôi phục một chạm**.
- Khoản đã xoá **không tính** vào tổng, số dư, "ai trả ai".

Tức là "xoá" ở đây nghĩa là *gạch khỏi sổ một cách công khai*, không phải *làm biến mất*.

### 13.4 Còn treo

1. **Chưa đánh dấu "đã trả"** — khối "ai trả ai" là một phép tính, chưa xoá nợ được. Hướng đã
   nghĩ sẵn: coi một lần trả nợ là **một khoản chi đặc biệt** (`kind: transfer`, người trả ứng
   tiền, chia cho đúng một người) — số dư tự triệt tiêu, không cần bảng thứ ba.
2. **Chưa sửa được khoản đã ghi**, chỉ xoá rồi thêm lại.
3. **Chỉ chia được cho người CÓ TÀI KHOẢN trong chuyến.** Nhóm 5 người mà chỉ 2 người dùng app
   thì phần của 3 người kia không vào được sổ. Đây là giới hạn thật, cần một mô hình "người
   không có tài khoản" trước khi gỡ.
