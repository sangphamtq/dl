-- CheckIn & Review: exclusive arc thêm spot (placeId thành nullable + spotId).
ALTER TABLE "CheckIn" ALTER COLUMN "placeId" DROP NOT NULL;
ALTER TABLE "CheckIn" ADD COLUMN "spotId" TEXT;

ALTER TABLE "Review" ALTER COLUMN "placeId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN "spotId" TEXT;

CREATE UNIQUE INDEX "CheckIn_userId_spotId_key" ON "CheckIn"("userId", "spotId");
CREATE INDEX "CheckIn_spotId_idx" ON "CheckIn"("spotId");
CREATE UNIQUE INDEX "Review_spotId_authorId_key" ON "Review"("spotId", "authorId");
CREATE INDEX "Review_spotId_idx" ON "Review"("spotId");

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
