-- Bỏ `priceRange` khỏi phần ẩm thực: thang $/$$/$$$ tương đối không nói được gì
-- hữu ích cho quán ăn/món ăn. `priceRange` của Spot & Accommodation giữ nguyên.
ALTER TABLE "Eatery" DROP COLUMN "priceRange";
ALTER TABLE "Specialty" DROP COLUMN "priceRange";
