/*
  Warnings:

  - You are about to drop the column `placeId` on the `TripItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TripItem" DROP CONSTRAINT "TripItem_placeId_fkey";

-- AlterTable
ALTER TABLE "TripItem" DROP COLUMN "placeId";
