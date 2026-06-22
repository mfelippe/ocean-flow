-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "events" TEXT[] DEFAULT ARRAY[]::TEXT[];
