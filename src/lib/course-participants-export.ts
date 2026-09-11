import {
  InvoiceStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/client";
import { formatCustomFieldValueForDisplay } from "@/lib/course-custom-fields";
import { invoicePaidAmount } from "@/lib/invoice-payment";
import {
  participantPriceOptionLabel,
  resolveParticipantPriceOption,
} from "@/lib/course-price-options";
import type { XlsxColumn, XlsxRow } from "@/server/utils/xlsx";

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

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

  return formatCustomFieldValueForDisplay(fields[fieldName]);
}

type ExportParticipant = {
  firstName: string;
  lastName: string;
  birthDate?: Date | string | null;
  city: string | null;
  instrument: string | null;
  /** Führend für die Preiszuordnung; siehe resolveParticipantPriceOption. */
  priceOptionId?: string | null;
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
  priceOptions?: Array<{
    id: string;
    label: string;
    description: string | null;
    price: number;
  }>;
};

/**
 * Spaltenschlüssel eines Zusatzfelds. Der Präfix trennt es von den festen
 * Spalten — ein Zusatzfeld namens "status" überschrieb sonst den Anmeldestatus.
 */
function customFieldKey(fieldName: string): string {
  return `zusatz:${fieldName}`;
}

export type CourseParticipantsExportOptions = {
  excludeCancelled?: boolean;
  /**
   * Geburtsdatum mitexportieren. Aus: der Kurs-E-Mail an die Organisation
   * liegt keine Geburtsdatenliste bei, die dort niemand angefordert hat.
   */
  includeBirthDate?: boolean;
};

export function courseParticipantsColumns(
  course: Pick<ExportCourse, "customFields">,
  options?: CourseParticipantsExportOptions,
): XlsxColumn[] {
  const customFieldColumns: XlsxColumn[] = (course.customFields ?? []).map(
    (field) => ({
      header: field.fieldName,
      key: customFieldKey(field.fieldName),
    }),
  );

  return [
    { header: "Vorname", key: "vorname" },
    { header: "Nachname", key: "nachname" },
    ...(options?.includeBirthDate
      ? [
          {
            header: "Geburtsdatum",
            key: "geburtsdatum",
            format: "date" as const,
          },
        ]
      : []),
    { header: "Ort", key: "ort" },
    { header: "Instrument", key: "instrument" },
    { header: "Preiskategorie", key: "preiskategorie" },
    { header: "Preis", key: "preis", format: "currency", total: true },
    ...customFieldColumns,
    { header: "Status", key: "status" },
    { header: "Anmelder:in Vorname", key: "anmelder_vorname" },
    { header: "Anmelder:in Nachname", key: "anmelder_nachname" },
    { header: "Anmelder:in E-Mail", key: "anmelder_email" },
    { header: "Anmelder:in Telefon", key: "anmelder_telefon" },
    // Bewusst ohne Summe: eine Anmeldung mit drei Teilnehmenden steht in drei
    // Zeilen, ihr Gesamtpreis würde dreifach gezählt.
    { header: "Gesamtpreis Anmeldung", key: "gesamtpreis", format: "currency" },
    { header: "Anmeldedatum", key: "anmeldedatum", format: "date" },
    { header: "Anmerkungen", key: "anmerkungen", wrap: true },
  ];
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildCourseParticipantsExportRows(
  course: ExportCourse,
  registrations: ExportRegistration[],
  options?: CourseParticipantsExportOptions,
): XlsxRow[] {
  const excludeCancelled = options?.excludeCancelled ?? true;
  const customFieldNames = course.customFields?.map((f) => f.fieldName) ?? [];

  const filtered = excludeCancelled
    ? registrations.filter(
        (r) => r.registrationStatus !== RegistrationStatus.CANCELLED,
      )
    : registrations;

  return filtered.flatMap((registration) =>
    registration.participants.map((participant) => {
      const customFieldValues: XlsxRow = {};
      for (const fieldName of customFieldNames) {
        customFieldValues[customFieldKey(fieldName)] = getCustomFieldValue(
          participant,
          fieldName,
        );
      }

      const priceOption = resolveParticipantPriceOption(
        participant,
        course.priceOptions,
      );

      return {
        vorname: participant.firstName,
        nachname: participant.lastName,
        ...(options?.includeBirthDate
          ? { geburtsdatum: toDateOrNull(participant.birthDate) }
          : {}),
        ort: participant.city ?? "",
        instrument: participant.instrument ?? "",
        preiskategorie: participantPriceOptionLabel(
          participant,
          course.priceOptions,
        ),
        preis: priceOption?.price ?? 0,
        ...customFieldValues,
        status: registrationStatusLabels[registration.registrationStatus],
        anmelder_vorname: registration.registrantFirstName,
        anmelder_nachname: registration.registrantLastName,
        anmelder_email: registration.registrantEmail,
        anmelder_telefon: registration.registrantPhone ?? "",
        gesamtpreis: registration.totalPrice,
        anmeldedatum: toDateOrNull(registration.createdAt),
        anmerkungen: registration.notes ?? "",
      } satisfies XlsxRow;
    }),
  );
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

/**
 * Zahlungsdaten einer Anmeldung — seit dem Umzug des Zahlungsstatus an die
 * Rechnung ist das kein Feld der Anmeldung mehr, sondern die Summe ihrer
 * ausgestellten Rechnungen.
 */
type ExportInvoice = {
  status: InvoiceStatus;
  totalAmount: number;
  paidAt: Date | string | null;
  paidAmount: number | null;
};

export function computeCourseRegistrationStats(
  registrations: Array<{
    registrationStatus: RegistrationStatus;
    siblingDiscountStatus: SiblingDiscountStatus;
    totalPrice: number;
    participants: unknown[];
    invoices: ExportInvoice[];
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
      // Verbucht wird, was tatsächlich eingegangen ist — bei Teilzahlung also
      // der Teilbetrag, nicht der volle Anmeldepreis.
      paidRevenue += r.invoices.reduce(
        (sum, invoice) => sum + invoicePaidAmount(invoice),
        0,
      );
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
