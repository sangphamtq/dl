-- AlterTable
ALTER TABLE "Spot" ADD COLUMN     "ticketFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticketTiers" JSONB;
