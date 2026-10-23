# Lịch trình — nhiều người cùng chỉnh sửa

> **CHƯA TRIỂN KHAI.** Phân tích + quyết định đã chốt, viết ra để lần sau bám theo mà không
> phải khảo sát lại. Tính năng Lịch trình bản v1 xem [`docs/lich-trinh.md`](lich-trinh.md).
>
> Trạng thái: **ĐÃ DỰNG XONG** (bước 1–5). Migration `20260818180248_trip_collaboration`.
> Chưa bấm thử qua giao diện vì trang soạn cần đăng nhập — xem §10.
> Cập nhật: 2026-08-19.

## 1. Định vị — cộng tác kiểu nào?

| Kiểu | Là gì | Hiện trạng |
|---|---|---|
| Chia sẻ để **xem** | Gửi link, người kia đọc | ✅ đã có (`shareId` + `/lich-trinh/s/…`) |
| Cùng soạn **bất đồng bộ** | Nhiều người sửa, không cần thấy nhau ngay | ❌ |
| Cùng soạn **realtime** | Thấy thay đổi tức thì, thấy ai đang sửa gì | ❌ |

**Nhắm mức 2.** Nhóm bạn lên kế hoạch trong nhiều ngày, hiếm khi hai người sửa cùng một
phút. Mức 3 đắt gấp bội mà chỉ giải quyết một tình huống hiếm.

> ⚠️ **Cân nhắc trước khi làm gì cả:** hiện đã có một dạng cộng tác là **nhân bản** — gửi
> link, người kia bấm "Dùng lịch trình này" và có bản riêng. Đó là *rẽ nhánh*, không phải
> *cùng sửa*. Nếu nhóm chỉ cần "mỗi người tự chốt lịch của mình" thì cái đã có là đủ, và
> toàn bộ tài liệu này là thừa.

## 2. Mô hình dữ liệu

```prisma
enum TripRole { owner, editor }

model TripMember {
  id        String   @id @default(cuid())
  tripId    String
  userId    String
  role      TripRole @default(editor)
  addedById String?          // ai mời
  createdAt DateTime @default(now())

  @@unique([tripId, userId])
  @@index([userId])
}
```

- **Chỉ HAI vai, KHÔNG có `viewer`.** Ai chỉ cần xem thì đã có link chia sẻ. Thêm vai thứ ba
  là thêm một trục quyền mà không giải quyết vấn đề nào mới.
- **`Trip.ownerId` giữ nguyên** làm chủ chuyến. Đổi hết sang membership thuần thì phải
  migrate và mọi truy vấn "chuyến của tôi" đều phải join thêm.
- **Mời bằng EMAIL** (đã chốt — không dùng link). Site chỉ đăng nhập bằng OAuth nên không
  gửi được mail xác thực riêng, nên có thêm bảng **`TripInvite`**:
  - Email **đã có tài khoản** → thành `TripMember` ngay.
  - **Chưa có tài khoản** → lời mời nằm chờ ở `TripInvite`; lần ĐẦU người đó đăng nhập bằng
    đúng email ấy thì `claimTripInvites()` biến nó thành thành viên.
  - Móc vào `events.signIn` trong **`auth.ts`** (Node, có Prisma) — KHÔNG đặt ở
    `auth.config.ts` vì file đó phải giữ edge-safe cho `proxy.ts`. Hàm **tự nuốt mọi lỗi**:
    hỏng ở đây tuyệt đối không được chặn đăng nhập, và lời mời vẫn còn nên lần sau nhận lại được.

## 3. ✅ Chống đụng độ — ĐÃ CHỐT: `Trip.version`

**Vấn đề cụ thể.** `moveItem` đánh số lại **cả một vùng chứa** trong một transaction. Hai
người cùng kéo trong một ngày:

1. A và B cùng thấy `[a, b, c]`
2. A kéo `c` lên đầu → server thành `[c, a, b]`
3. B (bàn cục bộ vẫn `[a, b, c]`) kéo `b` xuống cuối → gửi "đặt `b` ở chỉ số 2"
4. Kết quả `[c, a, b]` — B tưởng vừa dời `b`, thực ra không đổi gì

Im lặng, không lỗi, và **bàn cục bộ của B tiếp tục sai** cho mọi thao tác sau. Đây là hệ quả
trực tiếp của việc giữ bàn kéo–thả cục bộ (`trip-dnd.ts`) để tránh giật.

**Cách làm (sửa 2026-10-23 — bản đầu từ chối thao tác, người dùng phải kéo lại).**
- **Kéo–thả gửi Ý ĐỊNH, không gửi chỉ số**: `moveItem(itemId, dayId, at)` với
  `at = "start" | "end" | { afterId, beforeId }` — hai mục lân cận người kéo đang thấy
  (`lib/trip-drop.ts`). Server đặt lại trên danh sách MỚI NHẤT: `beforeId = null` ⇒ cuối ·
  `afterId = null` ⇒ đầu · còn lại ngay sau `afterId`, mất thì ngay trước `beforeId`, mất cả
  hai thì xuống cuối. Ví dụ trên ra đúng `[c, a, b]` như B muốn. **Không còn từ chối vì lệch
  version** — lỗi duy nhất còn lại là mục/ngày vừa bị người khác xoá (báo đúng câu đó).
  Kiểm: `pnpm check:trip-dnd`.
- `Trip.version` vẫn giữ, nhưng giờ là **tín hiệu "có gì đổi chưa"** cho §5: MỌI thao tác ghi
  đều tăng nó (kể cả ghi chú · đồ mang theo · chi phí · thêm mục), **trừ tick đồ CÁ NHÂN**
  (`setMyPackCheck`) — không đổi gì trên màn hình người khác.
- `editableTrip(tripId, expectedVersion)` vẫn nhận tham số nhưng hiện không action nào truyền.

## 4. Chỗ vỡ trong mã hiện tại — đã đếm, không phải ước lượng

**a) `ownedTrip()` được gọi ở 14 chỗ** trong `app/(site)/lich-trinh/actions.ts`, mỗi chỗ
khẳng định `trip.ownerId === userId`. Tất cả phải thành `canEdit()`.
⚠️ **KHÔNG hạ hết xuống cho editor** — ba cái phải giữ owner-only:
`deleteTrip` · `setSharing` · quản lý thành viên. Trộn lẫn là editor xoá được chuyến của
người khác.

**b) Bảy truy vấn `where: { ownerId: userId }`** ở `resolveTargetTrip`, `listMyTrips`,
`getPlanOptions`, trang `/lich-trinh`. Sót một chỗ là thành viên "không thấy" chuyến được mời.

**c) Trang soạn** chặn bằng `if (trip.ownerId !== session.user.id) notFound()` → đổi sang
kiểm membership.

**d) Cookie "chuyến đang lên lịch trình"** — `resolveTargetTrip` lọc theo `ownerId`. Thành
viên đặt chuyến của người khác làm chuyến đang lên lịch thì hệ thống **lặng lẽ bỏ qua** và
nhảy sang chuyến khác ⇒ nút "Thêm vào lịch trình" ở trang quán ăn rơi sai chuyến. Phải sửa
cùng lúc với (b).

**e) `moveItemToTrip`** dời mục giữa hai chuyến → kiểm quyền trên **cả hai**.

**f) `cloneTrip`** đang kiểm đọc bằng `isTemplate || unlisted || ownerId === userId` → thêm
membership.

**g) Lịch trình mẫu dùng hệ quyền KHÁC.** Template gate theo `User.role` (staff), chuyến cá
nhân theo `TripMember`. Hai hệ song song — chỗ nào dùng cái nào phải ghi rõ, đừng để lẫn.

## 5. ✅ Tự cập nhật — hỏi `version`, KHÔNG dùng Ably

> Bản đầu cố ý không làm gì (người B chỉ thấy bản mới sau khi chính B thao tác hoặc F5).
> Thực tế dùng ra: B kéo trên bản cũ ⇒ bị từ chối ⇒ phải tải lại. Đổi lại 2026-10-23.

`useTripLiveSync` (`components/trip/trip-live-sync.ts`) gọi `GET /api/trips/[id]/version` mỗi
**15 giây** + ngay khi quay lại tab / có mạng lại; `version` tăng ⇒ `router.refresh()` (cập
nhật tại chỗ, không tải lại trang) + toast nhẹ. Ba lý do cũ khiến realtime bị gỡ đều đã chặn:
- **Đi một mình thì không hỏi gì** — chỉ bật khi `people.length > 1`; tab ẩn cũng không hỏi.
- **Không giật bàn khỏi tay**: bỏ qua lượt hỏi khi đang có action chờ, đang kéo, đang gõ
  (focus trong input/textarea) hoặc đang mở menu/popover/dialog. Lần hỏi sau bắt lại.
- **Không dội lại thao tác của chính mình**: action thành công đã trả về props với `version`
  mới, nên lượt hỏi kế thấy bằng nhau.
- ⚠️ **Route GET, KHÔNG phải server action** — Next chạy server action nối tiếp theo từng
  client, lượt hỏi định kỳ sẽ bắt thao tác thật đứng chờ.
- **Nút "Cập nhật"** (`trip-refresh-button.tsx`, thanh đầu trang soạn, chỉ khi chuyến có ≥2
  người): `router.refresh()` tại chỗ. Lượt hỏi thấy bản mới mà đang phải hoãn (đang gõ, mở
  menu…) thì nút đổi thành **"Có thay đổi mới"** (dưới `sm` chỉ còn icon + chấm) — hook trả
  `behind`/`refreshing`/`refreshNow`.
  · ⚠️ **Ô nhập chỉ đọc giá trị lúc dựng phải có `key` theo GIÁ TRỊ** (tên chuyến, ngày khởi
    hành, số người, giờ bắt đầu ngày, tên đồ mang theo): không có thì người khác đổi rồi
    refresh xong vẫn hiện chữ cũ. An toàn vì refresh không chạy khi đang gõ.
- Vẫn **không** dùng Ably: một số nguyên mỗi 15 giây là đủ cho nhóm bạn lên kế hoạch nhiều
  ngày, khỏi phải lo khoá/kết nối.

## 6. Giao diện cần thêm

- **Gộp vào popover "Chia sẻ" đã có**, đừng thêm nút thứ hai: một popover, hai mức — *ai có
  link thì xem được* / *người được mời cùng sửa*. Hai nút cạnh nhau làm cùng một chuyện là rối.
- ✅ Danh sách thành viên + gỡ, **và một cụm AVATAR CHỒNG cạnh nút Chia sẻ** (`AvatarGroup`,
  cùng primitive `CheckInFaces` dùng) mở chính popover đó — kiểu Docs/Figma. Ai đang cùng sửa
  phải **thấy được mà không cần bấm gì**; danh sách nằm sau một cú bấm thì coi như không có.
  - Dữ liệu đi thẳng từ `getTripById().people` (chủ chuyến đứng đầu) → hiện ngay, và danh
    sách trong popover cũng **dựng sẵn từ đó** thay vì hiện "Đang tải…" cho đúng thứ trang
    vừa vẽ xong. `listTripMembers` vẫn chạy khi mở, nhưng chỉ để thêm email + **lời mời còn
    treo** (người chưa đăng nhập lần nào thì chưa phải member nên không có trong `people`).
  - **Ẩn khi đi một mình**: một avatar của chính mình không nói lên điều gì.
- Thẻ ở `/lich-trinh` phải **phân biệt chuyến của mình và chuyến được mời** — không thì danh
  sách trộn lẫn mà không biết cái nào của ai.
- `TripItem.addedById` để hiện "Minh thêm" — rẻ, và trong nhóm bạn thì biết ai bỏ cái gì vào
  là hữu ích thật.

## 7. Bốn câu phải chốt

| # | Câu hỏi | Trạng thái |
|---|---|---|
| 1 | Nhóm bạn thực sự cần cùng sửa? | ✅ **có** |
| 2 | Mời bằng gì? | ✅ **EMAIL** (không phải link) |
| 2b | Người được mời biết bằng cách nào? | ✅ **chuông thông báo** (`trip_invite`) — site chỉ đăng nhập OAuth nên KHÔNG gửi mail được |
| 3 | Chống đụng độ | ✅ **`Trip.version`** |
| 4 | Có cần nhật ký ai đổi gì? | ✅ **không** — chỉ `TripMember.addedById` |

## 8. Phân kỳ

1. ✅ `TripMember` · `TripInvite` · `Trip.version` · tách `editableTrip` / `ownedTrip`
2. ✅ Truy vấn danh sách dùng `myTripsWhere()` · trang soạn kiểm membership · nhận lời mời
   lúc đăng nhập · nhãn "Chuyến của X" ở `/lich-trinh`
3. ✅ Giao diện mời + danh sách thành viên — **gộp vào popover "Chia sẻ"**, không thêm nút
   thứ hai. Hai mục: *Cùng chỉnh sửa* (mời bằng email) trước, *Ai có link* (chỉ đọc) sau.
   Người ĐƯỢC MỜI chỉ thấy danh sách, không mời/gỡ được.
4. ✅ Nút "Rời khỏi lịch trình này" (chỉ hiện với người được mời).
4b. ✅ Thông báo `trip_invite` → `/lich-trinh/<id>`, `excerpt` = tên chuyến. Bắn ở **HAI** chỗ,
   thiếu một là có người không bao giờ biết mình được mời:
   - `inviteToTrip` — khi email đã có tài khoản (thành member ngay).
   - `claimTripInvites` — khi lời mời treo được nhận lúc **đăng nhập lần đầu**. Lúc đó người
     dùng đang ở một trang khác hẳn, không có gì trên màn hình nói cho họ biết.
5. ✅ Tự cập nhật bằng hỏi `version` (không Ably) — xem §5.

## 9. Kiểm

`scripts/check-trip-collab.ts` (`pnpm check:trip-collab`) — 5 trường hợp: chưa mời thì không
thấy chuyến; mời rồi thì thấy; lời mời treo thành thành viên sau khi đăng nhập; lời mời đã
dùng bị dọn; `version` tăng sau mutation. Tự dọn dữ liệu test.

## 10. Chưa kiểm được bằng mắt

Trang soạn cần đăng nhập nên **chưa bấm thử luồng mời qua giao diện**. Phần logic đã kiểm
bằng dữ liệu thật (`pnpm check:trip-collab`), nhưng ba thứ này nên thử tay:

1. Mời một email **đã có tài khoản** → người đó thấy chuyến ở `/lich-trinh` với nhãn
   "Chuyến của {tên}".
2. Mời một email **chưa có tài khoản** → đăng nhập lần đầu bằng email đó, kiểm xem có tự
   vào chuyến không (`events.signIn` → `claimTripInvites`).
3. Mở chuyến ở hai trình duyệt, sửa ở một bên → bên kia tự làm mới. Và **kéo một mục ở bên
   này trong lúc bên kia sửa** — bàn không được giật.
