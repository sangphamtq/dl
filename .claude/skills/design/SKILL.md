---
name: design
description: Quy ước thiết kế của dự án Halivivu — hệ tối giản/biên tập, ảnh làm chủ. ĐỌC TRƯỚC khi dựng hay chỉnh bất kỳ giao diện nào.
---

# Quy ước thiết kế — Halivivu

Quy ước cắt ngang mọi trang. Bố cục từng trang nằm trong `CLAUDE.md`.

Dự án chạy ngôn ngữ hình khối **VUÔNG**, ảnh làm chủ.

## Bo góc

`globals.css` không khai thang bo góc, nên `rounded-*` là số mặc định của Tailwind
(`xs` 2 · `sm` 4 · `md` 6 · `lg` 8 · `xl` 12 · `2xl` 16 · `3xl` 24px). Đó là **trần
trên**, không phải mặc định nên dùng.

| Hằng | | Dùng cho |
|---|---|---|
| `R_CARD` | **10px** | thẻ ảnh, ô lớn, khối bao, hộp thoại |
| `R_CTRL` | **6px** | chip, ô nhập, nút, tab, mũi tên, khung bọc, dòng trong danh sách |
| `R_BADGE` | **4px** | huy hiệu, badge đếm, nút icon nhỏ (cao 18–24px), ảnh nhỏ trong dòng |

Thang **10 / 6 / 4** (nâng một nấc từ 6 / 4 / 3 ngày 2026-11-01 — biên tập chọn theo hộp tìm kiếm ⌘K). Chi tiết rất nhỏ
(ô màu, chấm trên trục) dùng **3px**. Số ghi thẳng (`rounded-[6px]`…) và `border-radius` trong `globals.css` theo cùng thang.

- **Phần tử càng nhỏ lấy bán kính càng nhỏ** — cùng một số trên chip 34px sẽ đọc ra
  tròn hơn hẳn trên thẻ ảnh 288px.
- **Đừng khai thang bo góc trong `globals.css`.** Cần số riêng thì ghi thẳng
  (`rounded-[10px]`).
- Hằng nằm ở **`src/lib/radius.ts`**, ghép bằng `cn()` — đừng rắc số cứng và đừng
  khai lại trong từng component. File đó không có `"use client"` nên Server
  Component lẫn Client Component đều import được.
- ⚠️ **Mọi hằng dùng chung giữa hai phía phải nằm trong `lib/`, không nằm trong
  module `"use client"`.** Nhìn từ Server Component, export của module client chỉ
  là *client reference* — `HANG.find(...)` ném "is not a function" lúc CHẠY,
  trong khi `tsc` và `lint` đều xanh. Không có gì bắt được lỗi này ngoài việc mở
  trang lên xem.
- Vật liệu dùng chung đã mang sẵn bo góc: `CtaButton`, `HeroLink`, `PlaceCard`,
  `SectionTabs`, mũi tên của `Rail`. **Đừng truyền `className` bo góc riêng cho
  chúng ở từng trang** — sẽ lệch giữa các trang.
- Ảnh lồng trong thẻ có padding lấy **`R_BADGE`**, không lấy `R_CARD`: bán kính
  trong phải nhỏ hơn bán kính ngoài trừ đi phần đệm.
- Component shadcn thêm mới mang sẵn `rounded-md`/`rounded-lg` (6/8px), lớn hơn bộ
  trên — chỉnh tay khi thêm.
- Nhiều nút nằm chung một khung có viền: **bo ở KHUNG + `overflow-hidden`**, phần tử
  con để vuông. Bo từng nút thì khung vẫn vuông và nền hover thành mảng lửng lơ bên
  trong nó. `Rail` có prop `arrowWrapClassName`.

## Chữ

Hai họ chữ (Gilroy cho chữ thân + tiêu đề, Mali cho nhãn viết tay), **khai ở `app/layout.tsx`** — đừng khai font riêng trong từng trang.
Font tự host (Gilroy) để ở `src/app/fonts/<tên>/`, đổi sang **WOFF2** và chỉ giữ độ đậm site dùng — KHÔNG để vào `public/`
(mất tải trước + font dự phòng cùng kích thước của `next/font`). ⚠️ Gilroy rộng hơn Cabin: chữ trong ô cao cố định (ô tìm,
chip) phải `truncate`, không thì xuống dòng.
Không dùng serif.

| Biến | Font | Dùng cho |
|---|---|---|
| `--font-sans` | **SVN-Gilroy** (tự host, `next/font/local`, `src/app/fonts/gilroy/*.woff2`, 400–700) | chữ thân, mặc định |
| `--font-display` | **SVN-Gilroy** (trỏ về `--font-sans` trong `globals.css`; Be Vietnam Pro đã bỏ) | tiêu đề, kể cả kiểu **in hoa giãn chữ** ở hero/section |
| `--font-rounded` | Mali | nhãn viết tay (tên tỉnh trên thẻ…) |

Thêm font mới thì phải có **subset `vietnamese`** — kiểm trước bằng cách gọi
`fonts.googleapis.com/css2?family=<Tên>` với User-Agent trình duyệt đầy đủ và tìm khối
`/* vietnamese */`. UA rút gọn sẽ khiến Google trả bản không có subset và báo nhầm là
"không hỗ trợ". Libre Baskerville và Instrument Serif **không** có tiếng Việt.

## Dải phân cách

Không dùng `·` `.` `•` `|` để ngăn các mẩu thông tin. Dùng khoảng trắng rộng
(`gap-x-5` trở lên); mốc bắt đầu mỗi mẩu là **con số/từ khoá in đậm**.

```
✅  8 địa điểm     15 quán ăn     12 chỗ ở     10 trải nghiệm
❌  8 địa điểm · 15 quán ăn · 12 chỗ ở · 10 trải nghiệm
```

## Khung và nét

- Không kẻ lưới bên trong một khối vốn đã là hình chữ nhật.
- Không vẽ `ring` quanh ảnh để "định nghĩa" thẻ.
- Mỗi khối chỉ khai độ nổi một lần — viền **hoặc** bóng, không cả hai.
- Chỉ thứ bấm được mới có viền; tin phụ dùng nền.

## Trước khi báo xong

Soi cận cảnh đúng phần vừa sửa, và kiểm cả **hover / focus / rỗng**. Chụp được
trạng thái hover bằng cách tạm đổi `hover:bg-*` thành `bg-*`, chụp, rồi trả lại.
