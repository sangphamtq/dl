-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('experience', 'common', 'spot');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "kind" "ActivityKind" NOT NULL DEFAULT 'common';

-- CreateTable
CREATE TABLE "SpotActivity" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "blurb" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,

    CONSTRAINT "SpotActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpotActivity_spotId_idx" ON "SpotActivity"("spotId");

-- CreateIndex
CREATE INDEX "SpotActivity_activityId_idx" ON "SpotActivity"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "SpotActivity_spotId_activityId_key" ON "SpotActivity"("spotId", "activityId");

-- Migrate existing implicit M:N rows (_ActivitySpots: A=Activity, B=Spot)
INSERT INTO "SpotActivity" ("id", "spotId", "activityId", "order")
SELECT gen_random_uuid()::text, "B", "A", 0 FROM "_ActivitySpots";

-- AddForeignKey
ALTER TABLE "SpotActivity" ADD CONSTRAINT "SpotActivity_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotActivity" ADD CONSTRAINT "SpotActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (implicit join no longer used)
DROP TABLE "_ActivitySpots";
