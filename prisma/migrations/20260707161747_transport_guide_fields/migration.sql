-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "getAroundIntro" TEXT,
ADD COLUMN     "getToIntro" TEXT;

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "isRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notice" TEXT,
ADD COLUMN     "phone" TEXT;
