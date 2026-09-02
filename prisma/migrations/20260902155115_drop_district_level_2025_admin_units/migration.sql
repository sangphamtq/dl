/*
  Warnings:

  - You are about to drop the column `districtCode` on the `Eatery` table. All the data in the column will be lost.
  - You are about to drop the column `districtName` on the `Eatery` table. All the data in the column will be lost.
  - You are about to drop the column `districtCode` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `districtName` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `districtCode` on the `Spot` table. All the data in the column will be lost.
  - You are about to drop the column `districtName` on the `Spot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Eatery" DROP COLUMN "districtCode",
DROP COLUMN "districtName";

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "districtCode",
DROP COLUMN "districtName";

-- AlterTable
ALTER TABLE "Spot" DROP COLUMN "districtCode",
DROP COLUMN "districtName";
