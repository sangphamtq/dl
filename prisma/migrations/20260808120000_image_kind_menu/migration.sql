-- Ảnh của Quán ăn có thể là ảnh trưng bày (gallery) hoặc ảnh TẤM THỰC ĐƠN (menu).
-- Mọi ảnh đang có đều là gallery → DEFAULT 'gallery' phủ hết dữ liệu cũ, không
-- cần backfill.
--
-- BẤT BIẾN kèm theo (giữ ở tầng app): ảnh kind='menu' không bao giờ isCover=true,
-- nhờ vậy các truy vấn ảnh bìa sẵn có tự loại nó ra.
CREATE TYPE "ImageKind" AS ENUM ('gallery', 'menu');

ALTER TABLE "Image" ADD COLUMN "kind" "ImageKind" NOT NULL DEFAULT 'gallery';

-- Lấy ảnh menu của một quán là truy vấn theo cặp (eateryId, kind).
CREATE INDEX "Image_eateryId_kind_idx" ON "Image"("eateryId", "kind");
