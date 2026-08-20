-- CreateEnum
CREATE TYPE "TripPackScope" AS ENUM ('group', 'personal');

-- AlterTable
-- ĐỔI TÊN cột, không drop-rồi-add: `isDone` cũ mang đúng nghĩa của lượt duyệt
-- thứ nhất ("đã có sẵn"), nên dữ liệu người dùng đã tick phải giữ nguyên.
ALTER TABLE "TripPackItem" RENAME COLUMN "isDone" TO "isReady";
ALTER TABLE "TripPackItem" ADD COLUMN "isPacked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripPackItem" ADD COLUMN "scope" "TripPackScope" NOT NULL DEFAULT 'group';

-- CreateTable
CREATE TABLE "TripPackCheck" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isPacked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TripPackCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripPackCheck_itemId_userId_key" ON "TripPackCheck"("itemId", "userId");

-- CreateIndex
CREATE INDEX "TripPackCheck_userId_idx" ON "TripPackCheck"("userId");

-- AddForeignKey
ALTER TABLE "TripPackCheck" ADD CONSTRAINT "TripPackCheck_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TripPackItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPackCheck" ADD CONSTRAINT "TripPackCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
