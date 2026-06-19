-- CreateTable
CREATE TABLE "PlaceVideo" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaceVideo_placeId_idx" ON "PlaceVideo"("placeId");

-- AddForeignKey
ALTER TABLE "PlaceVideo" ADD CONSTRAINT "PlaceVideo_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
