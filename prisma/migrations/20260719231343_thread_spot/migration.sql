-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "spotId" TEXT;

-- CreateIndex
CREATE INDEX "Thread_spotId_idx" ON "Thread"("spotId");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
