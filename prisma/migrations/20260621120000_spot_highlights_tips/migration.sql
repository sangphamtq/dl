-- DropColumn
ALTER TABLE "Spot" DROP COLUMN "content";

-- AlterTable
ALTER TABLE "Spot" ADD COLUMN     "gettingThere" TEXT,
ADD COLUMN     "tips" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SpotHighlight" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpotHighlight_spotId_idx" ON "SpotHighlight"("spotId");

-- AddForeignKey
ALTER TABLE "SpotHighlight" ADD CONSTRAINT "SpotHighlight_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
