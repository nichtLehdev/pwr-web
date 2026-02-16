-- AlterTable
ALTER TABLE "role" ADD COLUMN     "parentRoleId" TEXT;

-- CreateIndex
CREATE INDEX "role_parentRoleId_idx" ON "role"("parentRoleId");

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
