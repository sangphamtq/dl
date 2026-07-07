-- CreateEnum
CREATE TYPE "ContentReportReason" AS ENUM ('spam', 'scam', 'offensive', 'offtopic', 'wrong_info', 'other');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('pending', 'actioned', 'dismissed');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'thread_moderated';

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "departDate" TIMESTAMP(3),
ADD COLUMN     "slots" INTEGER;

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reason" "ContentReportReason" NOT NULL,
    "note" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'pending',
    "reporterId" TEXT NOT NULL,
    "threadId" TEXT,
    "replyId" TEXT,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentReport_status_idx" ON "ContentReport"("status");

-- CreateIndex
CREATE INDEX "ContentReport_threadId_idx" ON "ContentReport"("threadId");

-- CreateIndex
CREATE INDEX "ContentReport_replyId_idx" ON "ContentReport"("replyId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReport_threadId_reporterId_key" ON "ContentReport"("threadId", "reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReport_replyId_reporterId_key" ON "ContentReport"("replyId", "reporterId");

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ThreadReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
