-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "TripItem_parentId_idx" ON "TripItem"("parentId");

-- AddForeignKey
ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TripItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
