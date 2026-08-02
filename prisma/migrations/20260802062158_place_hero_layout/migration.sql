-- CreateEnum
CREATE TYPE "HeroLayout" AS ENUM ('classic', 'center');

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "heroLayout" "HeroLayout" NOT NULL DEFAULT 'center';
