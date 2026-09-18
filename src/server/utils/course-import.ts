import type { Prisma } from "~/generated/prisma/client";
import {
  ContentStatus,
  CourseType,
  CustomFieldType,
  DownPaymentMode,
  DownPaymentRefundPolicy,
  TargetAudience,
} from "~/generated/prisma/enums";
import {
  normalizeDownPaymentConfig,
  priceOptionDownPaymentAmount,
  validateDownPaymentSettings,
} from "@/lib/course-down-payment";
import {
  readBoolean,
  readDate,
  readEnum,
  readInteger,
  readNumber,
  readPublishedAt,
  readText,
} from "./import-values";

/**
 * Reine Leseregeln für einen Kurs aus einem Export-ZIP.
 *
 * Getrennt von der Route, weil hier die inhaltlichen Entscheidungen stecken:
 * was zum Kurs gehört und mitwandert, und was am Zielsystem neu entsteht.
 * Alles, was die Datenbank braucht (Bezirk, Standort, Bild, Slug, Kursnummer),
 * setzt die Route davor und reicht es hier hinein.
 *
 * Bewusst draußen bleiben Anmeldungen, Teilnehmende, Rechnungen, Wartelisten
 * und Nachrück-Angebote: Ein Kurs soll sich weitergeben lassen, ohne
 * personenbezogene Daten mitzunehmen.
 */

export type CoursePriceOptionImport = {
  label: string;
  price: number;
  description: string | null;
  maxParticipants: number | null;
  minAge: number | null;
  maxAge: number | null;
  downPaymentAmount: number | null;
};

export type CourseCustomFieldImport = {
  fieldName: string;
  fieldType: CustomFieldType;
  options: Prisma.InputJsonValue | undefined;
  isRequired: boolean;
  helpText: string | null;
  sortOrder: number;
};

export type CourseGuestTeamMemberImport = {
  displayName: string;
  bio: string | null;
  sortOrder: number;
};

/**
 * Preiskategorien eines Kurses.
 *
 * Eine Kategorie ohne Bezeichnung oder ohne lesbaren Preis wird übersprungen:
 * Sie ließe sich im Formular gar nicht anlegen, und im Kurs stünde danach eine
 * Zeile, die niemand zuordnen kann. Der Anzahlungsbetrag wandert mit, wird aber
 * erst in {@link readCourseDownPayment} gegen den Modus des Kurses geprüft.
 */
export function readCoursePriceOptions(
  raw: unknown,
): CoursePriceOptionImport[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const option = entry as Record<string, unknown>;

    const label = readText(option.label);
    const price = readNumber(option.price);
    if (!label || price === null) return [];

    return [
      {
        label,
        price,
        description: readText(option.description),
        maxParticipants: readInteger(option.maxParticipants),
        minAge: readInteger(option.minAge),
        maxAge: readInteger(option.maxAge),
        downPaymentAmount: readNumber(option.downPaymentAmount),
      },
    ];
  });
}

/**
 * Zusätzliche Anmeldefelder.
 *
 * Ein Feld mit unbekannter Art wird ausgelassen statt auf TEXT zurückgesetzt:
 * Die Art bestimmt, was das Anmeldeformular zeigt und was es annimmt — ein
 * geratenes Feld führte zu Antworten, die zur Auswertung nicht passen.
 */
export function readCourseCustomFields(
  raw: unknown,
): CourseCustomFieldImport[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index) => {
    if (typeof entry !== "object" || entry === null) return [];
    const field = entry as Record<string, unknown>;

    const fieldName = readText(field.fieldName);
    const fieldType = readEnum(field.fieldType, CustomFieldType, null);
    if (!fieldName || !fieldType) return [];

    // Auswahllisten stehen als JSON im Feld; alles andere hat keine Optionen.
    const options =
      Array.isArray(field.options) ||
      (typeof field.options === "object" && field.options !== null)
        ? (field.options as Prisma.InputJsonValue)
        : undefined;

    return [
      {
        fieldName,
        fieldType,
        options,
        isRequired: readBoolean(field.isRequired, false),
        helpText: readText(field.helpText),
        sortOrder: readInteger(field.sortOrder) ?? index,
      },
    ];
  });
}

/**
 * Das öffentlich genannte Kursteam ohne Zugang zum Dashboard — Teil der
 * Kursseite wie die Leitung eines Termins, deshalb Inhalt und kein Datensatz
 * über eine anmeldende Person.
 */
export function readCourseGuestTeamMembers(
  raw: unknown,
): CourseGuestTeamMemberImport[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index) => {
    if (typeof entry !== "object" || entry === null) return [];
    const member = entry as Record<string, unknown>;

    const displayName = readText(member.displayName);
    if (!displayName) return [];

    return [
      {
        displayName,
        bio: readText(member.bio),
        sortOrder: readInteger(member.sortOrder) ?? index,
      },
    ];
  });
}

export type CourseContentImport = {
  title: string;
  motto: string | null;
  description: string;
  courseType: CourseType;
  targetAudience: TargetAudience | null;
  startDate: Date;
  endDate: Date;
  registrationOpen: boolean;
  registrationOpensAt: Date | null;
  registrationDeadline: Date | null;
  externalProviderName: string | null;
  externalRegistrationUrl: string | null;
  maxParticipants: number | null;
  allowWaitingList: boolean;
  isFree: boolean;
  priceInfo: string | null;
  allowSiblingDiscount: boolean;
  paymentCashAllowed: boolean;
  paymentInvoiceAllowed: boolean;
  invoicingEnabled: boolean;
  prerequisites: string | null;
  whatToBring: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
};

/**
 * Die Kursfelder, die ohne Datenbank aus dem Export zu lesen sind.
 *
 * Nicht dabei und bewusst nicht übernommen:
 * - `registrationClosedNotifiedAt` — ein Vermerk, wann die Übersichtsmail nach
 *   Anmeldeschluss verschickt wurde. Mitkopiert hielte er die Mail im
 *   Zielsystem für erledigt, obwohl sie dort nie lief.
 * - `reviewNotes`, `reviewDate`, `reviewerId` — Prüfvermerke einer Freigabe,
 *   die in diesem Bestand nicht stattgefunden hat.
 * - `createdAt`, `updatedAt` — der Kurs entsteht hier gerade neu.
 * - `id`, `createdById` — gehören dem jeweiligen Bestand, nicht dem Inhalt.
 */
export function readCourseContent(
  raw: Record<string, unknown>,
): CourseContentImport {
  // Ohne Startdatum ließe sich der Kurs nirgends einordnen; das Enddatum darf
  // fehlen und ist dann der Starttag, wie schon vor dieser Änderung.
  const startDate = readDate(raw.startDate) ?? new Date();
  const status = readEnum(raw.status, ContentStatus, ContentStatus.DRAFT);

  return {
    title: readText(raw.title) ?? "ohne Titel",
    motto: readText(raw.motto),
    description: typeof raw.description === "string" ? raw.description : "",
    courseType: readEnum(raw.courseType, CourseType, CourseType.OTHER),
    targetAudience: readEnum(raw.targetAudience, TargetAudience, null),
    startDate,
    endDate: readDate(raw.endDate) ?? startDate,
    registrationOpen: readBoolean(raw.registrationOpen, false),
    registrationOpensAt: readDate(raw.registrationOpensAt),
    registrationDeadline: readDate(raw.registrationDeadline),
    externalProviderName: readText(raw.externalProviderName),
    externalRegistrationUrl: readText(raw.externalRegistrationUrl),
    maxParticipants: readInteger(raw.maxParticipants),
    allowWaitingList: readBoolean(raw.allowWaitingList, false),
    isFree: readBoolean(raw.isFree, false),
    priceInfo: readText(raw.priceInfo),
    allowSiblingDiscount: readBoolean(raw.allowSiblingDiscount, false),
    paymentCashAllowed: readBoolean(raw.paymentCashAllowed, true),
    paymentInvoiceAllowed: readBoolean(raw.paymentInvoiceAllowed, true),
    invoicingEnabled: readBoolean(raw.invoicingEnabled, false),
    prerequisites: readText(raw.prerequisites),
    whatToBring: readText(raw.whatToBring),
    status,
    publishedAt: readPublishedAt(
      raw.publishedAt,
      status === ContentStatus.APPROVED,
    ),
  };
}

export type CourseDownPaymentImport = {
  downPaymentMode: DownPaymentMode;
  downPaymentAmount: number | null;
  downPaymentRefundPolicy: DownPaymentRefundPolicy;
  downPaymentRefundText: string | null;
  /** Die Kategorien mit dem zum Modus passenden Anzahlungsbetrag. */
  priceOptions: CoursePriceOptionImport[];
  /** Warum die Anzahlung nicht übernommen wurde — `null`, wenn sie mitkam. */
  droppedReason: string | null;
};

/**
 * Anzahlung eines importierten Kurses.
 *
 * Die Anzahlung hängt an der Kursnummer: Sie steht im Verwendungszweck der
 * Überweisung. Kursnummern sind aber global eindeutig, und im Zielbestand kann
 * dieselbe Nummer schon vergeben sein — dann kommt der Kurs ohne Nummer an.
 * Statt eine Anzahlung anzulegen, deren Verwendungszweck ins Leere zeigt, wird
 * sie in diesem Fall weggelassen und die Preiskategorien behalten nur ihren
 * Preis. Geprüft wird mit denselben Hausregeln wie im Kursformular, damit aus
 * einem Import keine Einstellung entsteht, die das Formular später ablehnt.
 */
export function readCourseDownPayment(args: {
  raw: Record<string, unknown>;
  courseNumber: string | null;
  isFree: boolean;
  isExternal: boolean;
  allowSiblingDiscount: boolean;
  priceOptions: CoursePriceOptionImport[];
}): CourseDownPaymentImport {
  const { raw, courseNumber, isFree, isExternal, allowSiblingDiscount } = args;

  const config = normalizeDownPaymentConfig({
    downPaymentMode: readEnum(
      raw.downPaymentMode,
      DownPaymentMode,
      DownPaymentMode.NONE,
    ),
    downPaymentAmount: readNumber(raw.downPaymentAmount),
    downPaymentRefundPolicy: readEnum(
      raw.downPaymentRefundPolicy,
      DownPaymentRefundPolicy,
      DownPaymentRefundPolicy.NON_REFUNDABLE,
    ),
    downPaymentRefundText: readText(raw.downPaymentRefundText),
  });

  const withAmounts = args.priceOptions.map((option) => ({
    ...option,
    downPaymentAmount: priceOptionDownPaymentAmount(
      config.downPaymentMode,
      option.downPaymentAmount,
    ),
  }));

  const problem = validateDownPaymentSettings({
    ...config,
    isFree,
    isExternal,
    courseNumber,
    allowSiblingDiscount,
    priceOptions: withAmounts,
  });

  if (problem) {
    return {
      ...normalizeDownPaymentConfig({
        downPaymentMode: DownPaymentMode.NONE,
        downPaymentAmount: null,
        downPaymentRefundPolicy: DownPaymentRefundPolicy.NON_REFUNDABLE,
        downPaymentRefundText: null,
      }),
      priceOptions: args.priceOptions.map((option) => ({
        ...option,
        downPaymentAmount: null,
      })),
      droppedReason: problem,
    };
  }

  return { ...config, priceOptions: withAmounts, droppedReason: null };
}
