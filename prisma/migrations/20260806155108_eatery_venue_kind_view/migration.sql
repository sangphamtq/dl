-- CreateEnum
CREATE TYPE "VenueKind" AS ENUM ('eat', 'drink', 'both');

-- CreateEnum
CREATE TYPE "ViewType" AS ENUM ('sea', 'valley', 'cloud', 'mountain', 'lake', 'river', 'city', 'oldtown', 'rice', 'garden');

-- AlterTable
ALTER TABLE "Eatery" ADD COLUMN     "bestTime" TEXT,
ADD COLUMN     "priceRange" "PriceRange",
ADD COLUMN     "venueKind" "VenueKind" NOT NULL DEFAULT 'eat',
ADD COLUMN     "viewType" "ViewType";

-- AlterTable
ALTER TABLE "Specialty" ADD COLUMN     "priceRange" "PriceRange";

-- CreateIndex
CREATE INDEX "Eatery_venueKind_idx" ON "Eatery"("venueKind");
