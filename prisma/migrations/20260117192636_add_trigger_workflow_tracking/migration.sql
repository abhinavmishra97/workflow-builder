/*
  Warnings:

  - You are about to drop the column `isFolder` on the `WorkflowFile` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `WorkflowFile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WorkflowFile" DROP CONSTRAINT "WorkflowFile_parentId_fkey";

-- DropIndex
DROP INDEX "WorkflowFile_parentId_idx";

-- AlterTable
ALTER TABLE "WorkflowFile" DROP COLUMN "isFolder",
DROP COLUMN "parentId";

-- AlterTable
ALTER TABLE "WorkflowRun" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "failedNodes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successfulNodes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalNodes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "triggerRunId" TEXT;

-- CreateTable
CREATE TABLE "NodeExecution" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "NodeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NodeExecution_runId_idx" ON "NodeExecution"("runId");

-- CreateIndex
CREATE INDEX "NodeExecution_nodeId_idx" ON "NodeExecution"("nodeId");

-- CreateIndex
CREATE INDEX "NodeExecution_status_idx" ON "NodeExecution"("status");

-- CreateIndex
CREATE INDEX "WorkflowRun_triggerRunId_idx" ON "WorkflowRun"("triggerRunId");

-- AddForeignKey
ALTER TABLE "NodeExecution" ADD CONSTRAINT "NodeExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
