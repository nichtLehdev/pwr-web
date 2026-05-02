-- Move legacy course instructors into course_collaborator as STAFF (skip duplicates)
INSERT INTO "course_collaborator" ("id", "courseId", "userId", "role")
SELECT gen_random_uuid(), j."A", j."B", 'STAFF'::"CourseCollaboratorRole"
FROM "_CourseInstructors" j
ON CONFLICT ("courseId", "userId") DO NOTHING;

-- Drop implicit many-to-many between Course and User (instructors)
DROP TABLE "_CourseInstructors";
