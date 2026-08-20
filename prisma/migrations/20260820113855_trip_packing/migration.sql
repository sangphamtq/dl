-- CreateTable
CREATE TABLE "TripPackItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assigneeId" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPackItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripPackItem_tripId_createdAt_idx" ON "TripPackItem"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "TripPackItem" ADD CONSTRAINT "TripPackItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPackItem" ADD CONSTRAINT "TripPackItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
