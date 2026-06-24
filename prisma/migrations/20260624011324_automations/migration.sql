-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('CARD_CREATED', 'CARD_MOVED_TO_COLUMN');

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" "AutomationTrigger" NOT NULL,
    "triggerColumnId" TEXT,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Automation_boardId_idx" ON "Automation"("boardId");

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_triggerColumnId_fkey" FOREIGN KEY ("triggerColumnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;
