-- CreateEnum
CREATE TYPE "TripExpenseKind" AS ENUM ('expense', 'contribution');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "fundKeeperId" TEXT;

-- AlterTable
ALTER TABLE "TripExpense" ADD COLUMN     "fromFund" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "TripExpenseKind" NOT NULL DEFAULT 'expense';

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_fundKeeperId_fkey" FOREIGN KEY ("fundKeeperId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
