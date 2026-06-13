-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlaceViewStat" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlaceViewStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaceViewStat_date_idx" ON "PlaceViewStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceViewStat_placeId_date_key" ON "PlaceViewStat"("placeId", "date");

-- AddForeignKey
ALTER TABLE "PlaceViewStat" ADD CONSTRAINT "PlaceViewStat_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
