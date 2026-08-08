-- Bỏ bốn trường hướng dẫn viết tay trên Place: `foodIntro`, `foodTips`,
-- `getToIntro`, `getAroundIntro`.
--
-- Lý do: CMS không có ô nhập cho chúng (chỉ seed ghi được), nên nội dung đóng
-- băng theo lần seed và chỉ một điểm đến có dữ liệu — các nơi khác rơi về câu
-- mặc định. Thông tin thực địa thuộc loại đổi liên tục này sống đúng chỗ hơn ở
-- các trường có cấu trúc đã có (`Eatery.bestTime`, `Eatery.notice`,
-- `Transport.description`/`notice`) hoặc ở blog.
--
-- Nội dung cũ nằm trong lịch sử git (prisma/seed-phan-thiet.ts,
-- prisma/seed-ta-xua.ts) nếu cần lấy lại.
ALTER TABLE "Place"
  DROP COLUMN "foodIntro",
  DROP COLUMN "foodTips",
  DROP COLUMN "getToIntro",
  DROP COLUMN "getAroundIntro";
