-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "threadId" TEXT;

-- AlterTable
ALTER TABLE "Thread" ALTER COLUMN "title" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Image_threadId_idx" ON "Image"("threadId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
