-- AlterTable
ALTER TABLE "Accommodation" ADD COLUMN     "depositPolicy" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notice" TEXT,
ADD COLUMN     "priceRange" "PriceRange",
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedNote" TEXT,
ADD COLUMN     "zalo" TEXT;

-- CreateIndex
CREATE INDEX "Accommodation_isVerified_idx" ON "Accommodation"("isVerified");
