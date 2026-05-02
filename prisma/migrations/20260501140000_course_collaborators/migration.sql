-- CreateEnum
CREATE TYPE "CourseCollaboratorRole" AS ENUM ('ORGANIZER', 'STAFF');

-- CreateTable
CREATE TABLE "course_collaborator" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CourseCollaboratorRole" NOT NULL,

    CONSTRAINT "course_collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_collaborator_courseId_userId_key" ON "course_collaborator"("courseId", "userId");

CREATE INDEX "course_collaborator_userId_idx" ON "course_collaborator"("userId");

CREATE INDEX "course_collaborator_courseId_idx" ON "course_collaborator"("courseId");

-- AddForeignKey
ALTER TABLE "course_collaborator" ADD CONSTRAINT "course_collaborator_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_collaborator" ADD CONSTRAINT "course_collaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
