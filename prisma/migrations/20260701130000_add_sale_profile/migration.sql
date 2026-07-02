-- Thêm CTV/người bán (SaleProfile) + loại thread 'sale'.

-- Enum mới
CREATE TYPE "SaleStatus" AS ENUM ('pending', 'approved', 'rejected');

-- Thêm 'sale' vào ThreadType
ALTER TYPE "ThreadType" ADD VALUE 'sale';

-- Bảng hồ sơ CTV
CREATE TABLE "SaleProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zalo" TEXT,
    "phone" TEXT,
    "facebookUrl" TEXT,
    "website" TEXT,
    "avatarUrl" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "reVerifyDueAt" TIMESTAMP(3),
    "verificationLevel" TEXT,
    "verifiedNote" TEXT,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "notice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaleProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaleProfile_slug_key" ON "SaleProfile"("slug");
CREATE UNIQUE INDEX "SaleProfile_userId_key" ON "SaleProfile"("userId");
CREATE INDEX "SaleProfile_status_idx" ON "SaleProfile"("status");

-- Bảng nối M:N SaleProfile <-> Place (khu vực phục vụ)
CREATE TABLE "_SaleAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SaleAreas_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX "_SaleAreas_B_index" ON "_SaleAreas"("B");

-- FK
ALTER TABLE "SaleProfile" ADD CONSTRAINT "SaleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleProfile" ADD CONSTRAINT "SaleProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_SaleAreas" ADD CONSTRAINT "_SaleAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_SaleAreas" ADD CONSTRAINT "_SaleAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "SaleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
