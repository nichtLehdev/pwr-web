import { RegistrationStatus } from "~/generated/prisma/client";

type CourseCapacityCourse = {
  maxParticipants: number | null;
  priceOptions: Array<{ label: string; maxParticipants: number | null }>;
  registrations: Array<{
    registrationStatus: RegistrationStatus;
    participants: Array<{ priceOption: string | null }>;
  }>;
};

/**
 * Same capacity / free-slot rules as the former inline logic in
 * `courses.getAvailableSlots`.
 */
export function getCourseCapacitySummary(course: CourseCapacityCourse) {
  const confirmedParticipants = course.registrations.reduce(
    (sum, registration) => sum + registration.participants.length,
    0,
  );

  const priceOptionsWithLimits = course.priceOptions.filter(
    (po) => po.maxParticipants !== null,
  );

  let totalCapacity: number;
  const capacityByPriceOption: Record<string, number> = {};

  if (priceOptionsWithLimits.length > 0) {
    totalCapacity = priceOptionsWithLimits.reduce(
      (sum, po) => sum + (po.maxParticipants || 0),
      0,
    );

    for (const priceOption of priceOptionsWithLimits) {
      const usedSlots = course.registrations.reduce((sum, registration) => {
        const participantsForThisOption = registration.participants.filter(
          (p) => p.priceOption === priceOption.label,
        ).length;
        return sum + participantsForThisOption;
      }, 0);

      capacityByPriceOption[priceOption.label] =
        (priceOption.maxParticipants || 0) - usedSlots;
    }

    const priceOptionsWithoutLimits = course.priceOptions.filter(
      (po) => po.maxParticipants === null,
    );

    if (priceOptionsWithoutLimits.length > 0) {
      const remainingCourseCapacity = Math.max(
        0,
        (course.maxParticipants ?? 0) - totalCapacity,
      );

      for (const priceOption of priceOptionsWithoutLimits) {
        const usedSlots = course.registrations.reduce(
          (sum, registration) => {
            const participantsForThisOption =
              registration.participants.filter(
                (p) => p.priceOption === priceOption.label,
              ).length;
            return sum + participantsForThisOption;
          },
          0,
        );

        capacityByPriceOption[priceOption.label] = Math.max(
          0,
          remainingCourseCapacity - usedSlots,
        );
      }
    }

    totalCapacity = Math.min(totalCapacity, course.maxParticipants ?? 0);
  } else {
    totalCapacity = course.maxParticipants ?? 0;
  }

  const availableSlots = Math.max(0, totalCapacity - confirmedParticipants);
  const isFull = availableSlots === 0;
  const hasWaitingList = course.registrations.some(
    (r) => r.registrationStatus === RegistrationStatus.WAITLIST,
  );

  return {
    totalCapacity,
    confirmedParticipants,
    availableSlots,
    isFull,
    hasWaitingList,
    capacityByPriceOption:
      Object.keys(capacityByPriceOption).length > 0
        ? capacityByPriceOption
        : null,
  };
}
