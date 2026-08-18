import { RegistrationStatus } from "~/generated/prisma/client";

type CapacityPriceOption = {
  id: string;
  label: string;
  maxParticipants: number | null;
};

type CourseCapacityCourse = {
  maxParticipants: number | null;
  priceOptions: CapacityPriceOption[];
  registrations: Array<{
    registrationStatus: RegistrationStatus;
    // Beide Felder sind Pflicht in der Abfrage: fehlte `priceOptionId`, fiele
    // die Zählung stillschweigend auf den Label-Pfad zurück und die Duplikate
    // liefen wieder in einen Topf.
    participants: Array<{
      priceOptionId: string | null;
      priceOption: string | null;
    }>;
  }>;
};

/**
 * Belegte Plätze einer Kategorie.
 *
 * Führend ist `priceOptionId`. Teilnehmer ohne id — Altbestand, dessen Label
 * beim Backfill nicht eindeutig aufzulösen war — werden nur dann über das
 * Label mitgezählt, wenn dieses Label im Kurs **einmalig** ist. Bei doppelten
 * Labels zählen sie zu keiner der beiden Kategorien: welche gemeint war, ist
 * nicht mehr feststellbar, und sie beiden zuzuschlagen würde die Restplätze
 * doppelt kürzen. In der Kurs-Gesamtkapazität stecken sie weiterhin.
 */
function countParticipantsForPriceOption(
  course: CourseCapacityCourse,
  option: CapacityPriceOption,
) {
  const labelIsUnique =
    course.priceOptions.filter((po) => po.label === option.label).length === 1;

  return course.registrations.reduce(
    (sum, registration) =>
      sum +
      registration.participants.filter((p) => {
        if (p.priceOptionId) return p.priceOptionId === option.id;
        return labelIsUnique && p.priceOption === option.label;
      }).length,
    0,
  );
}

/**
 * Same capacity / free-slot rules as the former inline logic in
 * `courses.getAvailableSlots`.
 *
 * Free seats = sum of remaining capacity per price tier (limited tiers
 * individually; unlimited tiers share one pool), capped by course max minus
 * confirmed bookings.
 */
export function getCourseCapacitySummary(course: CourseCapacityCourse) {
  const confirmedParticipants = course.registrations.reduce(
    (sum, registration) => sum + registration.participants.length,
    0,
  );

  const priceOptionsWithLimits = course.priceOptions.filter(
    (po) => po.maxParticipants !== null,
  );
  const priceOptionsWithoutLimits = course.priceOptions.filter(
    (po) => po.maxParticipants === null,
  );

  /** Restplätze je Preiskategorie, **nach id** — Labels sind nicht eindeutig. */
  const capacityByPriceOption: Record<string, number> = {};
  let sumPerOptionRemaining = 0;

  const limitedCapacitySum = priceOptionsWithLimits.reduce(
    (sum, po) => sum + (po.maxParticipants || 0),
    0,
  );

  for (const priceOption of priceOptionsWithLimits) {
    const usedSlots = countParticipantsForPriceOption(course, priceOption);
    const remaining = Math.max(
      0,
      (priceOption.maxParticipants || 0) - usedSlots,
    );
    capacityByPriceOption[priceOption.id] = remaining;
    sumPerOptionRemaining += remaining;
  }

  if (priceOptionsWithoutLimits.length > 0 && course.maxParticipants != null) {
    const unlimitedPoolMax = Math.max(
      0,
      course.maxParticipants - limitedCapacitySum,
    );
    const usedOnUnlimited = priceOptionsWithoutLimits.reduce(
      (sum, priceOption) =>
        sum + countParticipantsForPriceOption(course, priceOption),
      0,
    );
    const unlimitedPoolRemaining = Math.max(
      0,
      unlimitedPoolMax - usedOnUnlimited,
    );
    sumPerOptionRemaining += unlimitedPoolRemaining;

    for (const priceOption of priceOptionsWithoutLimits) {
      capacityByPriceOption[priceOption.id] = unlimitedPoolRemaining;
    }
  }

  // No course-level limit and no fully-limited tier set means the course is
  // genuinely unlimited (previously this reported capacity 0 / "full").
  const isUnlimited =
    course.maxParticipants == null &&
    (priceOptionsWithoutLimits.length > 0 || course.priceOptions.length === 0);

  let totalCapacity: number;
  if (course.maxParticipants != null) {
    totalCapacity = course.maxParticipants;
  } else if (isUnlimited) {
    totalCapacity = Infinity;
  } else {
    totalCapacity = limitedCapacitySum;
  }

  const overallRemaining =
    course.maxParticipants != null
      ? Math.max(0, course.maxParticipants - confirmedParticipants)
      : isUnlimited
        ? Infinity
        : Math.max(0, sumPerOptionRemaining);

  const hasPerOptionBreakdown =
    priceOptionsWithLimits.length > 0 || priceOptionsWithoutLimits.length > 0;

  const availableSlots =
    course.maxParticipants != null && hasPerOptionBreakdown
      ? Math.max(0, Math.min(sumPerOptionRemaining, overallRemaining))
      : Math.max(0, overallRemaining);

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
