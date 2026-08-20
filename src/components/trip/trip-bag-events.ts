"use client";

// Kênh báo "túi lịch trình vừa đổi" giữa các component KHÔNG có quan hệ cha–con:
// nút "Thêm vào lịch trình" nằm rải rác trong trang chi tiết và trong popup
// (Quán ăn, Lưu trú), còn cái túi (`TripDock`) nằm ở layout. Luồn state qua ba
// lớp component client để nối hai thứ đó là việc vô ích — một sự kiện DOM rẻ
// hơn hẳn, và cũng là cách `peer-bar.tsx` đã dùng cho nút ẩn/hiện của nó.
//
// Cố ý KHÔNG mang theo dữ liệu: người nhận (TripDock) tự gọi `getTripBag()` để
// lấy bản mới. Nhét dữ liệu vào sự kiện thì hai nơi cùng dựng hình dạng của túi,
// và cái nào cũng có thể lệch.

const EVT = "halivivu:trip-bag";

/** Gọi sau MỌI thao tác chạm nội dung chuyến ở ngoài trình soạn. */
export function tripBagChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
}

export function onTripBagChanged(cb: () => void): () => void {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}
