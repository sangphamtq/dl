-- CreateTable
CREATE TABLE "TripNote" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripNote_tripId_isPinned_createdAt_idx" ON "TripNote"("tripId", "isPinned", "createdAt");

-- AddForeignKey
ALTER TABLE "TripNote" ADD CONSTRAINT "TripNote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripNote" ADD CONSTRAINT "TripNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
