-- AlterEnum: ReviewStance 4 → 5 mức (mỗi mức = một số sao).
-- Đánh giá cũ đổi theo NGHĨA: worthOnce ("đáng đi một lần") → worth (4★),
-- meh ("không có gì đặc biệt") → okay (3★). love/bad giữ nguyên tên.
ALTER TYPE "ReviewStance" RENAME TO "ReviewStance_old";
CREATE TYPE "ReviewStance" AS ENUM ('love', 'worth', 'okay', 'letdown', 'bad');
ALTER TABLE "Review" ALTER COLUMN "stance" TYPE "ReviewStance" USING (
  CASE "stance"::text
    WHEN 'worthOnce' THEN 'worth'
    WHEN 'meh' THEN 'okay'
    ELSE "stance"::text
  END
)::"ReviewStance";
DROP TYPE "ReviewStance_old";
