-- Bỏ phân biệt món ăn / sản vật ở Đặc sản: drop cột kind, whereToBuy và enum SpecialtyKind.
ALTER TABLE "Specialty" DROP COLUMN "kind";
ALTER TABLE "Specialty" DROP COLUMN "whereToBuy";
DROP TYPE "SpecialtyKind";
