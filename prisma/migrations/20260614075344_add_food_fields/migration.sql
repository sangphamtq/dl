-- CreateEnum
CREATE TYPE "SpecialtyKind" AS ENUM ('dish', 'product');

-- CreateEnum
CREATE TYPE "Meal" AS ENUM ('breakfast', 'lunch', 'dinner', 'cafe', 'snack');

-- AlterTable
ALTER TABLE "Eatery" ADD COLUMN     "meals" "Meal"[],
ADD COLUMN     "notice" TEXT;

-- AlterTable
ALTER TABLE "Specialty" ADD COLUMN     "kind" "SpecialtyKind" NOT NULL DEFAULT 'dish',
ADD COLUMN     "priceRange" "PriceRange",
ADD COLUMN     "whereToBuy" TEXT;
