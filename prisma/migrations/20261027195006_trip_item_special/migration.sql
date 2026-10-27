-- CreateEnum
CREATE TYPE "TripItemSpecial" AS ENUM ('transport', 'checkin', 'checkout', 'meal', 'rest');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('plane', 'train', 'bus', 'car', 'motorbike', 'boat');

-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN     "bookingCode" TEXT,
ADD COLUMN     "special" "TripItemSpecial",
ADD COLUMN     "travelFrom" TEXT,
ADD COLUMN     "travelMode" "TravelMode",
ADD COLUMN     "travelTo" TEXT;
