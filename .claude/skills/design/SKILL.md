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
| `R_CARD` | **6px** | thẻ ảnh, ô lớn, khối bao |
| `R_CTRL` | **4px** | chip, ô nhập, nút, tab, mũi tên, khung bọc |
| `R_BADGE` | **3px** | huy hiệu, badge đếm, nút icon nhỏ (cao 18–24px) |

- **Phần tử càng nhỏ lấy bán kính càng nhỏ** — cùng một số trên chip 34px sẽ đọc ra
  tròn hơn hẳn trên thẻ ảnh 288px.
- **Đừng khai thang bo góc trong `globals.css`.** Cần số riêng thì ghi thẳng
  (`rounded-[6px]`).
- Hằng nằm ở **`src/lib/radius.ts`**, ghép bằng `cn()` — đừng rắc số cứng và đừng
  khai lại trong từng component. File đó không có `"use client"` nên Server
  Component lẫn Client Component đều import được.
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
