-- AlterEnum
ALTER TYPE "Meal" ADD VALUE 'latenight';

-- AlterTable
ALTER TABLE "Eatery" ADD COLUMN     "priceRange" "PriceRange";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "foodIntro" TEXT;
