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

**Cách làm.**
- `Trip.version Int @default(0)` — mọi mutation tăng 1.
- Client gửi kèm `expectedVersion` nó đang thấy.
- Lệch ⇒ **từ chối**, trả `{ ok: false, stale: true }`, client `router.refresh()` rồi báo
  nhẹ "Có người vừa sửa, đã cập nhật lại".
- ⚠️ **Phải làm ở BƯỚC 1**, không để sau: nó đổi chữ ký của cả 14 action.

**Ghi chú cho lúc làm** — có một cách bổ trợ đáng cân nhắc cho *riêng phần sắp xếp*: thay
`moveItem(itemId, dayId, toIndex)` bằng **`moveItem(itemId, dayId, afterItemId | null)`**.
"Đặt sau mục X" giữ nguyên ý định kể cả khi người khác vừa chèn thêm, còn "chỉ số 2" thì
không. Version bắt được xung đột; "đặt sau X" thì tránh được phần lớn xung đột ngay từ đầu.
Hai thứ bổ sung nhau, không thay thế nhau.

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

## 5. ❌ Realtime — CỐ Ý KHÔNG LÀM

> **Đừng thêm lại.** Ably có sẵn trong dự án (`lib/ably.ts` + `RealtimeRefresher`, đang phục
> vụ phần Cộng đồng) nên nối vào trang soạn chỉ tốn ~30 dòng — và đúng vì rẻ nên dễ thêm mà
> không hỏi xem có cần không. Đã thêm một lần rồi gỡ bỏ hoàn toàn.

Lý do gỡ nằm ngay ở §3: hai lựa chọn chống đụng độ được đưa ra là **(a) `Trip.version`**
hoặc **(b) chấp nhận "ai ghi sau thắng" + đẩy realtime cho cửa sổ lệch ngắn lại**. Chốt là
(a). Realtime là cơ chế của **phương án bị loại** — thêm nó vào cạnh `version` không phải
"bổ sung", mà là làm cả hai phương án cùng lúc.

Cụ thể nó thừa ở chỗ:
- **`version` đã bắt được đụng độ ở đúng nơi cần** — lúc GHI, tại server, chắc chắn. Realtime
  chỉ rút ngắn thời gian người ta *nhìn thấy* bản cũ, không thêm một bảo đảm nào.
- **Phần lớn chuyến là đi một mình** → mở kết nối (hoặc tệ hơn: polling 25 giây khi thiếu
  key) chỉ để nghe chính mình.
- **Nó kéo theo cả một chuỗi phụ tùng**: `refresh()` phải thành `async` (15 chỗ `await`),
  `RealtimeRefresher` phải mọc thêm prop `canRefresh` để chặn lúc đang kéo — `router.refresh()`
  giữa cú kéo là giật bàn khỏi tay người dùng — rồi lại phải thêm mốc `lastLocalEdit` để
  client bỏ qua tín hiệu do chính nó phát. Ba miếng vá cho một thứ không được yêu cầu.

Cái nhóm bạn thực sự cần là **thấy được bản mới**, và điều đó xảy ra ở mỗi lần thao tác:
server action `revalidatePath` rồi, còn khi đụng độ thì §3 đã lo (dưới đây).

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
5. ❌ Realtime — **cố ý không làm**, xem §5.

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
