-- AlterEnum: thay bộ giá trị ReviewStance (3 → 4 mức). An toàn vì chưa có dữ liệu.
ALTER TYPE "ReviewStance" RENAME TO "ReviewStance_old";
CREATE TYPE "ReviewStance" AS ENUM ('love', 'worthOnce', 'meh', 'bad');
ALTER TABLE "Review" ALTER COLUMN "stance" TYPE "ReviewStance" USING ("stance"::text::"ReviewStance");
DROP TYPE "ReviewStance_old";
