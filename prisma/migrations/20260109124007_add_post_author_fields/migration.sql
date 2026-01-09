-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "authorName" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
