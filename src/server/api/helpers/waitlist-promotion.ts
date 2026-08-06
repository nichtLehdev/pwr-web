import { RegistrationStatus } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import {
  computeCourseCapacity,
  countConfirmedParticipants,
  runSerializable,
} from "./course-capacity";

type Db = typeof database;

type PromotedRegistration = {
  id: string;
  registrantEmail: string;
  registrantFirstName: string;
  registrantLastName: string;
  totalPrice: number;
  participantsCount: number;
  courseTitle: string;
  courseStartDate: Date;
  courseEndDate: Date;
};

/**
 * Promote waitlisted registrations after seats were freed (cancellation,
 * deletion, status change). Strictly FIFO by registration time: promotion
 * stops at the first registration that doesn't fit, so a large family isn't
 * starved by smaller groups that registered later.
 *
 * Runs in its own SERIALIZABLE transaction; confirmation e-mails go out
 * after the transaction commits. Call `sendPromotionEmails` with the result.
 */
export async function promoteFromWaitlist(
  db: Db,
  courseId: string,
): Promise<PromotedRegistration[]> {
  return runSerializable(db, async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        startDate: true,
        endDate: true,
        allowWaitingList: true,
        maxParticipants: true,
        priceOptions: { select: { label: true, maxParticipants: true } },
      },
    });
    if (!course || !course.allowWaitingList) return [];
    // No point confirming people into a course that already started.
    if (course.startDate <= new Date()) return [];

    // Note: for unlimited courses capacity is Infinity and every waitlisted
    // registration fits.
    const capacity = computeCourseCapacity(course);

    let confirmedCount = await countConfirmedParticipants(tx, courseId);

    const waitlist = await tx.courseRegistration.findMany({
      where: {
        courseId,
        registrationStatus: RegistrationStatus.WAITLIST,
      },
      orderBy: { createdAt: "asc" },
      include: {
        participants: { select: { priceOption: true } },
      },
    });
    if (waitlist.length === 0) return [];

    // Current per-tier usage, so tier limits are respected during promotion.
    const limitedTiers = new Map(
      course.priceOptions
        .filter((p) => p.maxParticipants != null)
        .map((p) => [p.label, p.maxParticipants!]),
    );
    const tierUsage = new Map<string, number>();
    if (limitedTiers.size > 0) {
      const usage = await tx.participant.groupBy({
        by: ["priceOption"],
        where: {
          registration: {
            courseId,
            registrationStatus: RegistrationStatus.CONFIRMED,
          },
        },
        _count: { _all: true },
      });
      for (const row of usage) {
        if (row.priceOption) tierUsage.set(row.priceOption, row._count._all);
      }
    }

    const promoted: PromotedRegistration[] = [];

    for (const registration of waitlist) {
      const groupSize = registration.participants.length;
      if (confirmedCount + groupSize > capacity) break;

      let tierFits = true;
      const groupTierCounts = new Map<string, number>();
      for (const participant of registration.participants) {
        if (
          participant.priceOption &&
          limitedTiers.has(participant.priceOption)
        ) {
          groupTierCounts.set(
            participant.priceOption,
            (groupTierCounts.get(participant.priceOption) ?? 0) + 1,
          );
        }
      }
      for (const [label, addition] of groupTierCounts) {
        const limit = limitedTiers.get(label)!;
        if ((tierUsage.get(label) ?? 0) + addition > limit) {
          tierFits = false;
          break;
        }
      }
      if (!tierFits) break;

      await tx.courseRegistration.update({
        where: { id: registration.id },
        data: { registrationStatus: RegistrationStatus.CONFIRMED },
      });

      confirmedCount += groupSize;
      for (const [label, addition] of groupTierCounts) {
        tierUsage.set(label, (tierUsage.get(label) ?? 0) + addition);
      }

      promoted.push({
        id: registration.id,
        registrantEmail: registration.registrantEmail,
        registrantFirstName: registration.registrantFirstName,
        registrantLastName: registration.registrantLastName,
        totalPrice: registration.totalPrice,
        participantsCount: groupSize,
        courseTitle: course.title,
        courseStartDate: course.startDate,
        courseEndDate: course.endDate,
      });
    }

    return promoted;
  });
}

/** Send confirmation e-mails for promoted registrations (fire-and-forget). */
export async function sendPromotionEmails(
  promoted: PromotedRegistration[],
): Promise<void> {
  if (promoted.length === 0) return;
  try {
    const emailService = await import("@/server/email");
    if (!emailService.isEmailConfigured()) return;

    for (const registration of promoted) {
      try {
        await emailService.sendCourseRegistrationConfirmedEmail(
          registration.registrantEmail,
          registration.registrantFirstName,
          registration.registrantLastName,
          registration.courseTitle,
          registration.courseStartDate,
          registration.courseEndDate,
          registration.totalPrice,
          registration.participantsCount,
          registration.id,
        );
      } catch (error) {
        console.error(
          `Failed to send waitlist promotion email for ${registration.id}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("Failed to send waitlist promotion emails:", error);
  }
}
