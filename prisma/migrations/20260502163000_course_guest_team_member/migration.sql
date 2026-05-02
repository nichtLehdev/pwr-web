-- Names shown on public course pages for people without a Vereinskonto (no collaborator row)
CREATE TABLE "course_guest_team_member" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "course_guest_team_member_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_guest_team_member_courseId_idx" ON "course_guest_team_member"("courseId");

ALTER TABLE "course_guest_team_member" ADD CONSTRAINT "course_guest_team_member_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
