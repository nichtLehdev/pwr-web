import "server-only";

import { db } from "@/server/db";
import { computeCourseRegistrationStats } from "@/lib/course-participants-export";
import { buildCourseParticipantsXlsx } from "@/server/utils/course-exports";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import {
  ContentStatus,
  CourseCollaboratorRole,
} from "~/generated/prisma/client";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Registration Closed");

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

  // Claim before sending: the conditional updateMany succeeds for one caller
  // only, so overlapping runs can't both mail. At-most-once beats duplicates.
  const claim = await db.course.updateMany({
    where: { id: course.id, registrationClosedNotifiedAt: null },
    data: { registrationClosedNotifiedAt: now },
  });
  if (claim.count === 0) {
    return "skipped";
  }

  const recipients = await resolveRecipientEmails(course);
  if (recipients.length === 0) {
    log.warn(
      `[registration-closed] No recipients for course ${course.id} (${course.title})`,
    );
    return "skipped";
  }

  const stats = computeCourseRegistrationStats(course.registrations);
  const { buffer: excelBuffer, filename } = await buildCourseParticipantsXlsx({
    course,
    registrations: course.registrations,
    now,
  });

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
    // Nobody reached yet: release the claim so the next run retries. After a
    // partial send the claim stays (at-most-once).
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
