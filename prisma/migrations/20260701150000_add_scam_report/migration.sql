-- Báo cáo lừa đảo (blacklist) cho công cụ kiểm tra uy tín.

CREATE TYPE "ScamChannel" AS ENUM ('phone', 'facebook', 'website', 'bank_account');
CREATE TYPE "ScamReportStatus" AS ENUM ('pending', 'confirmed', 'rejected');

CREATE TABLE "ScamReport" (
    "id" TEXT NOT NULL,
    "channel" "ScamChannel" NOT NULL,
    "valueNorm" TEXT NOT NULL,
    "valueRaw" TEXT NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reporterId" TEXT,
    "reporterContact" TEXT,
    "status" "ScamReportStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScamReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScamReport_channel_valueNorm_idx" ON "ScamReport"("channel", "valueNorm");
CREATE INDEX "ScamReport_status_idx" ON "ScamReport"("status");
