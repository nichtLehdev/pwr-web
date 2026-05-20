import {
  PaymentStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/client";

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function getCustomFieldValue(
  participant: { customFields?: unknown },
  fieldName: string,
): string {
  if (!participant.customFields) {
    return "–";
  }

  let fields: Record<string, unknown>;
  if (typeof participant.customFields === "string") {
    try {
      fields = JSON.parse(participant.customFields) as Record<string, unknown>;
    } catch {
      return "–";
    }
  } else if (typeof participant.customFields === "object") {
    fields = participant.customFields as Record<string, unknown>;
  } else {
    return "–";
  }

  const value = fields[fieldName];
  if (value === undefined || value === null || value === "") {
    return "–";
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  return String(value);
}

type ExportParticipant = {
  firstName: string;
  lastName: string;
  city: string | null;
  instrument: string | null;
  priceOption: string | null;
  customFields?: unknown;
};

type ExportRegistration = {
  registrationStatus: RegistrationStatus;
  registrantFirstName: string;
  registrantLastName: string;
  registrantEmail: string;
  registrantPhone: string | null;
  totalPrice: number;
  createdAt: Date;
  notes: string | null;
  participants: ExportParticipant[];
};

type ExportCourse = {
  title: string;
  customFields?: Array<{ fieldName: string }>;
  priceOptions?: Array<{ label: string; price: number }>;
};

export function buildCourseParticipantsExportRows(
  course: ExportCourse,
  registrations: ExportRegistration[],
  options?: { excludeCancelled?: boolean },
): Record<string, string>[] {
  const excludeCancelled = options?.excludeCancelled ?? true;
  const customFieldNames = course.customFields?.map((f) => f.fieldName) ?? [];

  const filtered = excludeCancelled
    ? registrations.filter(
        (r) => r.registrationStatus !== RegistrationStatus.CANCELLED,
      )
    : registrations;

  return filtered.flatMap((registration) =>
    registration.participants.map((participant) => {
      const customFieldValues: Record<string, string> = {};
      for (const fieldName of customFieldNames) {
        customFieldValues[fieldName] = getCustomFieldValue(
          participant,
          fieldName,
        );
      }

      const priceOption = course.priceOptions?.find(
        (p) => p.label === participant.priceOption,
      );
      const participantPrice = priceOption?.price ?? 0;

      return {
        vorname: participant.firstName,
        nachname: participant.lastName,
        ort: participant.city ?? "",
        instrument: participant.instrument ?? "",
        preiskategorie: participant.priceOption ?? "",
        preis: participantPrice.toFixed(2),
        ...customFieldValues,
        status: registrationStatusLabels[registration.registrationStatus],
        anmelder_vorname: registration.registrantFirstName,
        anmelder_nachname: registration.registrantLastName,
        anmelder_email: registration.registrantEmail,
        anmelder_telefon: registration.registrantPhone ?? "",
        gesamtpreis: registration.totalPrice.toFixed(2),
        anmeldedatum: new Date(registration.createdAt).toLocaleDateString(
          "de-DE",
        ),
        anmerkungen: registration.notes ?? "",
      };
    }),
  );
}

/** Semicolon-separated Excel-compatible file (UTF-8 BOM), same as dashboard export. */
export function buildCourseParticipantsExcelBuffer(
  rows: Record<string, string>[],
): Buffer {
  const headers = Object.keys(rows[0] ?? {
    vorname: "",
    nachname: "",
    status: "",
  });
  const csvContent = [
    headers.map(escapeCSVValue).join(";"),
    ...rows.map((row) =>
      headers
        .map((header) =>
          escapeCSVValue(String(row[header as keyof typeof row] ?? "")),
        )
        .join(";"),
    ),
  ].join("\r\n");

  const bom = "\uFEFF";
  return Buffer.from(bom + csvContent, "utf-8");
}

export function sanitizeCourseTitleForFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
}

export type CourseRegistrationStats = {
  confirmedParticipants: number;
  waitlistParticipants: number;
  cancelledParticipants: number;
  activeRegistrations: number;
  pendingDiscountRegistrations: number;
  totalRevenueConfirmed: number;
  paidRevenue: number;
};

export function computeCourseRegistrationStats(
  registrations: Array<{
    registrationStatus: RegistrationStatus;
    paymentStatus: PaymentStatus;
    siblingDiscountStatus: SiblingDiscountStatus;
    totalPrice: number;
    participants: unknown[];
  }>,
): CourseRegistrationStats {
  let confirmedParticipants = 0;
  let waitlistParticipants = 0;
  let cancelledParticipants = 0;
  let activeRegistrations = 0;
  let pendingDiscountRegistrations = 0;
  let totalRevenueConfirmed = 0;
  let paidRevenue = 0;

  for (const r of registrations) {
    const count = r.participants.length;
    if (r.registrationStatus === RegistrationStatus.CONFIRMED) {
      confirmedParticipants += count;
      activeRegistrations += 1;
      totalRevenueConfirmed += r.totalPrice;
      if (r.paymentStatus === PaymentStatus.PAID) {
        paidRevenue += r.totalPrice;
      }
    } else if (r.registrationStatus === RegistrationStatus.WAITLIST) {
      waitlistParticipants += count;
      activeRegistrations += 1;
    } else if (r.registrationStatus === RegistrationStatus.CANCELLED) {
      cancelledParticipants += count;
    }

    if (r.siblingDiscountStatus === SiblingDiscountStatus.PENDING) {
      pendingDiscountRegistrations += 1;
    }
  }

  return {
    confirmedParticipants,
    waitlistParticipants,
    cancelledParticipants,
    activeRegistrations,
    pendingDiscountRegistrations,
    totalRevenueConfirmed,
    paidRevenue,
  };
}
