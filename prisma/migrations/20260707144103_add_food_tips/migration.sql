-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "foodTips" TEXT[] DEFAULT ARRAY[]::TEXT[];
