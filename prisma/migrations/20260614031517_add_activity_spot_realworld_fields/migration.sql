-- CreateEnum
CREATE TYPE "ActivityDifficulty" AS ENUM ('easy', 'moderate', 'hard');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "difficulty" "ActivityDifficulty",
ADD COLUMN     "durationText" TEXT,
ADD COLUMN     "seasonText" TEXT;

-- AlterTable
ALTER TABLE "Spot" ADD COLUMN     "bestTime" TEXT,
ADD COLUMN     "notice" TEXT,
ADD COLUMN     "ticketInfo" TEXT;
