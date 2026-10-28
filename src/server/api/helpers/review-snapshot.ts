import { ContentStatus, type Prisma } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import { formatBerlin } from "@/lib/berlin-time";
import { parseCustomFieldCondition } from "@/lib/course-custom-fields";
import { courseTypeLabel, eventCategoryLabel } from "@/lib/termine-labels";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Review Snapshot");

type Db = typeof database;

export type ReviewContentType = "post" | "event" | "course";

/** Display value of one field; lists are compared and shown item by item. */
export type ReviewFieldValue = string | string[] | null;
export type ReviewFields = Record<string, ReviewFieldValue>;

export type ReviewFieldChange = {
  key: string;
  label: string;
  before: ReviewFieldValue;
  after: ReviewFieldValue;
};

/**
 * Reihenfolge und Beschriftung der Felder in der Änderungsansicht. Felder, die
 * hier fehlen (z. B. eine neue Spalte), erscheinen trotzdem — am Ende und mit
 * ihrem Spaltennamen —, damit eine Änderung nie unbemerkt durchrutscht.
 */
const FIELD_LABELS: Record<ReviewContentType, Record<string, string>> = {
  post: {
    title: "Titel",
    slug: "URL-Kürzel",
    excerpt: "Kurzbeschreibung",
    category: "Kategorie",
    bezirk: "Bezirk",
    author: "Autor",
    pinned: "Gepinnt",
    coverImage: "Titelbild",
    coverImagePositionX: "Bildausschnitt X",
    coverImagePositionY: "Bildausschnitt Y",
    content: "Inhalt",
  },
  event: {
    title: "Titel",
    slug: "URL-Kürzel",
    motto: "Motto",
    category: "Kategorie",
    eventDate: "Datum und Uhrzeit",
    duration: "Dauer (Minuten)",
    cancelled: "Abgesagt",
    location: "Ort",
    bezirk: "Bezirk",
    districtName: "Bezirksname",
    performingEnsembleType: "Mitwirkende (Art)",
    ensemble: "Posaunenchor",
    auswahlChor: "Auswahlchor",
    performingEnsembleName: "Mitwirkende",
    leitung: "Leitung",
    coverImage: "Titelbild",
    description: "Beschreibung",
    openToParticipants: "Offen zum Mitspielen",
    participationInfo: "Infos zum Mitspielen",
    isFree: "Eintritt frei",
    priceInfo: "Preisinfo",
    priceOptions: "Preise",
    downloads: "Downloads",
  },
  course: {
    title: "Titel",
    slug: "URL-Kürzel",
    motto: "Motto",
    courseNumber: "Kursnummer",
    courseType: "Kursart",
    targetAudience: "Zielgruppe",
    startDate: "Beginn",
    endDate: "Ende",
    location: "Ort",
    bezirk: "Bezirk",
    image: "Bild",
    description: "Beschreibung",
    prerequisites: "Voraussetzungen",
    whatToBring: "Mitzubringen",
    collaborators: "Kursteam",
    guestTeamMembers: "Weitere Mitwirkende",
    registrationOpen: "Anmeldung geöffnet",
    registrationOpensAt: "Anmeldung ab",
    registrationDeadline: "Anmeldeschluss",
    externalProviderName: "Externer Anbieter",
    externalRegistrationUrl: "Externe Anmeldung",
    maxParticipants: "Max. Teilnehmer",
    allowWaitingList: "Warteliste",
    instrumentRequired: "Instrument verpflichtend",
    isFree: "Kostenlos",
    priceInfo: "Preisinfo",
    priceOptions: "Preiskategorien",
    allowSiblingDiscount: "Geschwisterrabatt",
    paymentCashAllowed: "Barzahlung",
    paymentInvoiceAllowed: "Überweisung",
    invoicingEnabled: "Rechnungen",
    downPaymentMode: "Anzahlung",
    downPaymentAmount: "Anzahlungsbetrag",
    downPaymentRefundPolicy: "Erstattung der Anzahlung",
    downPaymentRefundText: "Erstattungshinweis",
    customFields: "Anmeldefelder",
  },
};

/**
 * Review bookkeeping, timestamps and foreign keys (shown via their relation
 * instead). Everything else on the row is part of what a reviewer signs off.
 */
const OMITTED_COLUMNS = new Set([
  "id",
  "status",
  "reviewNotes",
  "reviewDate",
  "reviewerId",
  "createdById",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "registrationClosedNotifiedAt",
  "coverImageId",
  "imageId",
  "bezirkId",
  "locationId",
  "ensembleId",
  "auswahlChorId",
  "authorId",
]);

const ENUM_LABELS: Record<string, Record<string, string>> = {
  postCategory: {
    MAGAZIN: "Magazin",
    EVENT: "Event",
    AUSBILDUNG: "Ausbildung",
    BEZIRKE: "Bezirke",
    ANDERE: "Andere",
  },
  targetAudience: {
    ANFAENGER: "Anfänger",
    FORTGESCHRITTENE: "Fortgeschrittene",
    DIRIGENTEN: "Dirigenten",
    JUGEND: "Jugend",
    ALLE: "Alle",
  },
  performingEnsembleType: {
    AUSWAHLCHOR: "Auswahlchor",
    ENSEMBLE: "Posaunenchor",
    CUSTOM: "Eigene Angabe",
  },
  downPaymentMode: {
    NONE: "Keine",
    COURSE: "Pro Teilnehmer",
    TICKET: "Je Preiskategorie",
  },
  downPaymentRefundPolicy: {
    NON_REFUNDABLE: "Nicht erstattbar",
    REFUNDABLE: "Erstattbar",
    CUSTOM: "Eigener Hinweis",
  },
  collaboratorRole: { ORGANIZER: "Leitung", STAFF: "Team" },
};

function enumLabel(map: keyof typeof ENUM_LABELS, value: string): string {
  return ENUM_LABELS[map]?.[value] ?? value;
}

function formatEuro(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

function formatScalar(value: unknown): ReviewFieldValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return formatBerlin(value, "datumLangUhrzeit");
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (typeof value === "number") return value.toLocaleString("de-DE");
  if (typeof value === "string") return value.trim() === "" ? null : value;
  return JSON.stringify(value);
}

/** All plain columns of a row, formatted; relations are added by the caller. */
function scalarFields(row: Record<string, unknown>): ReviewFields {
  const fields: ReviewFields = {};
  for (const [key, value] of Object.entries(row)) {
    if (OMITTED_COLUMNS.has(key)) continue;
    // Included relations: objects (but not Dates) and arrays.
    if (Array.isArray(value)) continue;
    if (value !== null && typeof value === "object" && !(value instanceof Date))
      continue;
    fields[key] = formatScalar(value);
  }
  return fields;
}

function formatBezirk(
  bezirk: { number: number; shortName: string } | null,
): string {
  return bezirk
    ? `Bezirk ${bezirk.number} – ${bezirk.shortName}`
    : "Übergreifend";
}

function formatLocation(
  location: {
    name: string | null;
    street: string | null;
    zipCode: string | null;
    city: string;
    additionalInfo: string | null;
  } | null,
): string | null {
  if (!location) return null;
  return [
    location.name,
    location.street,
    [location.zipCode, location.city].filter(Boolean).join(" "),
    location.additionalInfo,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatOptions(options: Prisma.JsonValue | null): string | null {
  if (options === null || options === undefined) return null;
  if (typeof options === "string") return options.trim() || null;
  if (Array.isArray(options)) {
    return options
      .map((option) => {
        if (typeof option === "string") return option;
        if (option && typeof option === "object" && !Array.isArray(option)) {
          const labelled = option.label ?? option.value;
          if (typeof labelled === "string") return labelled;
        }
        return JSON.stringify(option);
      })
      .join(", ");
  }
  return JSON.stringify(options);
}

const bezirkSelect = { select: { number: true, shortName: true } } as const;

async function loadPostFields(
  db: Db,
  id: string,
): Promise<ReviewFields | null> {
  const post = await db.post.findUnique({
    where: { id },
    include: {
      bezirk: bezirkSelect,
      coverImage: { select: { name: true } },
      author: { select: { displayName: true } },
    },
  });
  if (!post) return null;

  // authorName is folded into "author": readers see one byline.
  const { authorName, ...columns } = post;
  return {
    ...scalarFields(columns),
    category: enumLabel("postCategory", post.category),
    bezirk: formatBezirk(post.bezirk),
    author: post.author?.displayName ?? authorName ?? null,
    coverImage: post.coverImage?.name ?? null,
  };
}

async function loadEventFields(
  db: Db,
  id: string,
): Promise<ReviewFields | null> {
  const event = await db.event.findUnique({
    where: { id },
    include: {
      bezirk: bezirkSelect,
      location: true,
      coverImage: { select: { name: true } },
      ensemble: { select: { name: true } },
      auswahlChor: { select: { name: true } },
      priceOptions: true,
      downloads: { include: { download: { select: { title: true } } } },
    },
  });
  if (!event) return null;

  return {
    ...scalarFields(event),
    category: eventCategoryLabel(event.category),
    performingEnsembleType: event.performingEnsembleType
      ? enumLabel("performingEnsembleType", event.performingEnsembleType)
      : null,
    bezirk: formatBezirk(event.bezirk),
    location: formatLocation(event.location),
    coverImage: event.coverImage?.name ?? null,
    ensemble: event.ensemble?.name ?? null,
    auswahlChor: event.auswahlChor?.name ?? null,
    priceOptions: event.priceOptions
      .map((option) =>
        [`${option.label}: ${formatEuro(option.price)}`, option.description]
          .filter(Boolean)
          .join(" – "),
      )
      .sort(),
    downloads: event.downloads.map((d) => d.download.title).sort(),
  };
}

async function loadCourseFields(
  db: Db,
  id: string,
): Promise<ReviewFields | null> {
  const course = await db.course.findUnique({
    where: { id },
    include: {
      bezirk: bezirkSelect,
      location: true,
      image: { select: { name: true } },
      priceOptions: true,
      customFields: { orderBy: { sortOrder: "asc" } },
      guestTeamMembers: { orderBy: { sortOrder: "asc" } },
      collaborators: { include: { user: { select: { displayName: true } } } },
    },
  });
  if (!course) return null;

  return {
    ...scalarFields(course),
    courseType: courseTypeLabel(course.courseType),
    targetAudience: course.targetAudience
      ? enumLabel("targetAudience", course.targetAudience)
      : null,
    downPaymentMode: enumLabel("downPaymentMode", course.downPaymentMode),
    downPaymentRefundPolicy: enumLabel(
      "downPaymentRefundPolicy",
      course.downPaymentRefundPolicy,
    ),
    downPaymentAmount:
      course.downPaymentAmount === null
        ? null
        : formatEuro(course.downPaymentAmount),
    bezirk: formatBezirk(course.bezirk),
    location: formatLocation(course.location),
    image: course.image?.name ?? null,
    priceOptions: course.priceOptions
      .map((option) => {
        const age =
          option.minAge !== null && option.maxAge !== null
            ? `${option.minAge}–${option.maxAge} Jahre`
            : option.minAge !== null
              ? `ab ${option.minAge} Jahren`
              : option.maxAge !== null
                ? `bis ${option.maxAge} Jahre`
                : null;
        return [
          `${option.label}: ${formatEuro(option.price)}`,
          option.maxParticipants !== null
            ? `max. ${option.maxParticipants} Plätze`
            : null,
          age,
          option.downPaymentAmount !== null
            ? `Anzahlung ${formatEuro(option.downPaymentAmount)}`
            : null,
          option.description,
        ]
          .filter(Boolean)
          .join(" · ");
      })
      .sort(),
    // Order is what registrants see, so it stays as sorted in the form.
    customFields: course.customFields.map((field) => {
      const options = formatOptions(field.options);
      const condition = parseCustomFieldCondition(field.showIf);
      return [
        `${field.fieldName} (${field.fieldType}${field.isRequired ? ", Pflicht" : ""})`,
        options ? `Optionen: ${options}` : null,
        field.helpText ? `Hilfe: ${field.helpText}` : null,
        condition
          ? `Nur wenn ${condition.fieldName}: ${condition.values.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }),
    guestTeamMembers: course.guestTeamMembers.map((member) =>
      [member.displayName, member.bio].filter(Boolean).join(" – "),
    ),
    collaborators: course.collaborators
      .map(
        (c) =>
          `${c.user.displayName ?? "Unbekannt"} (${enumLabel("collaboratorRole", c.role)})`,
      )
      .sort(),
  };
}

/** Current state of a content item in the same shape as a stored snapshot. */
export async function loadReviewFields(
  db: Db,
  contentType: ReviewContentType,
  contentId: string,
): Promise<ReviewFields | null> {
  if (contentType === "post") return loadPostFields(db, contentId);
  if (contentType === "event") return loadEventFields(db, contentId);
  return loadCourseFields(db, contentId);
}

function sameValue(a: ReviewFieldValue, b: ReviewFieldValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : a === null ? [] : [a];
    const right = Array.isArray(b) ? b : b === null ? [] : [b];
    return (
      left.length === right.length && left.every((item, i) => item === right[i])
    );
  }
  return a === b;
}

/**
 * Fields that differ between the reviewed and the current state, in the order
 * of FIELD_LABELS; unknown keys follow in their own order.
 */
export function diffReviewFields(
  contentType: ReviewContentType,
  before: ReviewFields,
  after: ReviewFields,
): ReviewFieldChange[] {
  const labels = FIELD_LABELS[contentType];
  const keys = [
    ...new Set([
      ...Object.keys(labels),
      ...Object.keys(before),
      ...Object.keys(after),
    ]),
  ];

  const changes: ReviewFieldChange[] = [];
  for (const key of keys) {
    if (!(key in before) && !(key in after)) continue;
    const previous = before[key] ?? null;
    const current = after[key] ?? null;
    if (sameValue(previous, current)) continue;
    changes.push({
      key,
      label: labels[key] ?? key,
      before: previous,
      after: current,
    });
  }
  return changes;
}

/**
 * Remembers what the reviewer just approved or rejected. Never fails the
 * review: without a snapshot the next review simply shows no change list.
 * Any other status is not a review and leaves the last snapshot in place.
 */
export async function recordReviewSnapshot(
  db: Db,
  params: {
    contentType: ReviewContentType;
    contentId: string;
    status: ContentStatus;
    reviewerId: string;
  },
): Promise<void> {
  const { contentType, contentId, status, reviewerId } = params;
  if (status !== ContentStatus.APPROVED && status !== ContentStatus.REJECTED) {
    return;
  }
  try {
    const fields = await loadReviewFields(db, contentType, contentId);
    if (!fields) return;
    const data = {
      status,
      fields,
      reviewerId,
      reviewedAt: new Date(),
    };
    await db.contentReviewSnapshot.upsert({
      where: { contentType_contentId: { contentType, contentId } },
      create: { contentType, contentId, ...data },
      update: data,
    });
  } catch (error) {
    log.error(
      `Failed to record review snapshot (${contentType} ${contentId}):`,
      error,
    );
  }
}

/** For bulk status changes; see recordReviewSnapshot. */
export async function recordReviewSnapshots(
  db: Db,
  params: {
    contentType: ReviewContentType;
    contentIds: string[];
    status: ContentStatus;
    reviewerId: string;
  },
): Promise<void> {
  const { contentIds, ...rest } = params;
  for (const contentId of contentIds) {
    await recordReviewSnapshot(db, { ...rest, contentId });
  }
}

/** Snapshots belong to their content; call alongside deleting it. */
export async function deleteReviewSnapshots(
  db: Db,
  contentType: ReviewContentType,
  contentIds: string[],
): Promise<void> {
  if (contentIds.length === 0) return;
  try {
    await db.contentReviewSnapshot.deleteMany({
      where: { contentType, contentId: { in: contentIds } },
    });
  } catch (error) {
    log.error(`Failed to delete review snapshots (${contentType}):`, error);
  }
}
