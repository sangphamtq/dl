-- CreateTable
CREATE TABLE "ViewStat" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ViewStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewStat_date_idx" ON "ViewStat"("date");

-- CreateIndex
CREATE INDEX "ViewStat_entityType_entityId_idx" ON "ViewStat"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewStat_entityType_entityId_date_key" ON "ViewStat"("entityType", "entityId", "date");

-- Backfill: chuyển dữ liệu PlaceViewStat cũ sang ViewStat (entityType='place')
INSERT INTO "ViewStat" ("id", "entityType", "entityId", "date", "count")
SELECT "id", 'place', "placeId", "date", "count" FROM "PlaceViewStat";

-- DropForeignKey
ALTER TABLE "PlaceViewStat" DROP CONSTRAINT "PlaceViewStat_placeId_fkey";

-- DropTable
DROP TABLE "PlaceViewStat";
