-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "ticketFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticketTiers" JSONB;
