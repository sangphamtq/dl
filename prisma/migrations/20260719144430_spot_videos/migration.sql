-- CreateTable
CREATE TABLE "SpotVideo" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpotVideo_spotId_idx" ON "SpotVideo"("spotId");

-- AddForeignKey
ALTER TABLE "SpotVideo" ADD CONSTRAINT "SpotVideo_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
