-- AlterTable
ALTER TABLE "WorkflowFile" ADD COLUMN     "isFolder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "WorkflowFile_parentId_idx" ON "WorkflowFile"("parentId");

-- AddForeignKey
ALTER TABLE "WorkflowFile" ADD CONSTRAINT "WorkflowFile_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkflowFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
