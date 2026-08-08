-- CreateTable
CREATE TABLE "course_mail" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "replyToEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientFilter" JSONB NOT NULL,
    "attachments" JSONB,
    "recipientCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_mail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_mail_courseId_createdAt_idx" ON "course_mail"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "course_mail_senderId_idx" ON "course_mail"("senderId");

-- AddForeignKey
ALTER TABLE "course_mail" ADD CONSTRAINT "course_mail_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mail" ADD CONSTRAINT "course_mail_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
