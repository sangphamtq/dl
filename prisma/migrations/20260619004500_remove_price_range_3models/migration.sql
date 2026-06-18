-- Bỏ mức giá (priceRange) ở Đặc sản, Quán ăn, Lưu trú.
ALTER TABLE "Specialty" DROP COLUMN "priceRange";
ALTER TABLE "Eatery" DROP COLUMN "priceRange";
ALTER TABLE "Accommodation" DROP COLUMN "priceRange";
