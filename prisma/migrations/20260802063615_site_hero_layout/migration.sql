-- Kiểu hero chuyển từ per-place sang CÀI ĐẶT CHUNG toàn site.
-- Enum "HeroLayout" đã tạo ở migration trước; ở đây chỉ đổi chỗ đặt cột.

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN "heroLayout" "HeroLayout" NOT NULL DEFAULT 'center';

-- AlterTable: bỏ cột per-place (chỉ chứa giá trị mặc định, chưa dùng ở đâu)
ALTER TABLE "Place" DROP COLUMN "heroLayout";
