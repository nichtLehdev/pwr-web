import "server-only";

import { db } from "@/server/db";
import {
  buildCourseParticipantsExcelBuffer,
  buildCourseParticipantsExportRows,
  computeCourseRegistrationStats,
  sanitizeCourseTitleForFilename,
} from "@/lib/course-participants-export";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import {
  ContentStatus,
  CourseCollaboratorRole,
} from "~/generated/prisma/client";

export type RegistrationClosedNotificationResult = {
  processed: number;
  emailed: number;
  skipped: number;
  errors: Array<{ courseId: string; error: string }>;
};

async function resolveRecipientEmails(course: {
  createdBy: { email: string } | null;
  collaborators: Array<{
    role: CourseCollaboratorRole;
    user: { email: string };
  }>;
}): Promise<string[]> {
  const emails = new Set<string>();

  if (course.createdBy?.email) {
    emails.add(course.createdBy.email.trim().toLowerCase());
  }

  for (const collab of course.collaborators) {
    if (collab.role === CourseCollaboratorRole.ORGANIZER && collab.user.email) {
      emails.add(collab.user.email.trim().toLowerCase());
    }
  }

  return [...emails];
}

async function notifyCourse(courseId: string): Promise<"emailed" | "skipped"> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      location: { select: { name: true } },
      customFields: { orderBy: { sortOrder: "asc" } },
      priceOptions: true,
      createdBy: { select: { email: true, displayName: true } },
      collaborators: {
        where: { role: CourseCollaboratorRole.ORGANIZER },
        include: { user: { select: { email: true, displayName: true } } },
      },
      registrations: {
        include: {
          participants: true,
          invoices: {
            select: {
              status: true,
              totalAmount: true,
              paidAt: true,
              paidAmount: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (course.registrationClosedNotifiedAt) {
    return "skipped";
  }

  if (!course.registrationDeadline) {
    return "skipped";
  }

  const now = new Date();
  // Deadlines are inclusive of their whole day — only notify once the day
  // is fully over.
  if (!isRegistrationDeadlinePassed(course.registrationDeadline, now)) {
    return "skipped";
  }

  // Claim before sending: the conditional updateMany only succeeds for one
  // caller, so overlapping cron runs (or a manual trigger during a scheduled
  // run) cannot both mail the same course. If the process dies mid-send the
  // course stays claimed — at-most-once beats duplicate mails with
  // attachments to every organizer.
  const claim = await db.course.updateMany({
    where: { id: course.id, registrationClosedNotifiedAt: null },
    data: { registrationClosedNotifiedAt: now },
  });
  if (claim.count === 0) {
    return "skipped";
  }

  const recipients = await resolveRecipientEmails(course);
  if (recipients.length === 0) {
    console.warn(
      `[registration-closed] No recipients for course ${course.id} (${course.title})`,
    );
    return "skipped";
  }

  const stats = computeCourseRegistrationStats(course.registrations);
  const exportRows = buildCourseParticipantsExportRows(
    course,
    course.registrations,
  );
  const excelBuffer = buildCourseParticipantsExcelBuffer(exportRows);
  const dateStr = now.toISOString().split("T")[0];
  const filename = `${sanitizeCourseTitleForFilename(course.title)}_teilnehmer_${dateStr}.xls`;

  const baseUrl = getBaseUrl();
  const participantsUrl = `${baseUrl}/dashboard/courses/${course.id}/participants`;

  const { sendCourseRegistrationClosedOverviewEmail } =
    await import("@/server/email");

  let sentCount = 0;
  try {
    for (const email of recipients) {
      await sendCourseRegistrationClosedOverviewEmail({
        to: email,
        courseTitle: course.title,
        registrationDeadline: course.registrationDeadline,
        startDate: course.startDate,
        endDate: course.endDate,
        locationName: course.location?.name ?? null,
        maxParticipants: course.maxParticipants,
        allowWaitingList: course.allowWaitingList,
        stats,
        participantsUrl,
        attachment: {
          filename,
          content: excelBuffer,
        },
      });
      sentCount += 1;
    }
  } catch (error) {
    // If nobody was reached yet, retrying is safe — release the claim so the
    // next run picks the course up again. After a partial send, keep the
    // claim: at-most-once beats duplicate mails to the earlier recipients.
    if (sentCount === 0) {
      await db.course
        .update({
          where: { id: course.id },
          data: { registrationClosedNotifiedAt: null },
        })
        .catch(() => undefined);
    }
    throw error;
  }

  return "emailed";
}

/**
 * Find courses whose registration deadline has passed and send the overview
 * e-mail to the creator and ORGANIZER collaborators (once per course).
 */
export async function processRegistrationClosedNotifications(options?: {
  courseId?: string;
}): Promise<RegistrationClosedNotificationResult> {
  const now = new Date();
  const result: RegistrationClosedNotificationResult = {
    processed: 0,
    emailed: 0,
    skipped: 0,
    errors: [],
  };

  const courseIds = options?.courseId
    ? [options.courseId]
    : (
        await db.course.findMany({
          where: {
            registrationDeadline: { lte: now },
            registrationClosedNotifiedAt: null,
            status: ContentStatus.APPROVED,
          },
          select: { id: true },
        })
      ).map((c) => c.id);

  for (const courseId of courseIds) {
    result.processed += 1;
    try {
      const outcome = await notifyCourse(courseId);
      if (outcome === "emailed") {
        result.emailed += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.errors.push({
        courseId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
