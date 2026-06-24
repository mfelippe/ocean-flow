-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: em instalações já existentes, promove o usuário mais antigo a
-- super admin da instância (para que sempre exista um admin após o upgrade).
UPDATE "User" SET "isSuperAdmin" = true
WHERE "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
