import {
  ContentStatus,
  EventCategory,
  EventEnsembleType,
} from "~/generated/prisma/enums";
import {
  readBoolean,
  readDate,
  readEnum,
  readInteger,
  readNumber,
  readPublishedAt,
  readText,
} from "./import-values";

/** Leseregeln für einen Termin aus einem Export-ZIP; Datenbankbezüge setzt die Route. */

export type EventPriceOptionImport = {
  label: string;
  price: number;
  description: string | null;
};

/** Wie bei Kursen: ohne Bezeichnung und Preis ist eine Kategorie nichts wert. */
export function readEventPriceOptions(raw: unknown): EventPriceOptionImport[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const option = entry as Record<string, unknown>;

    const label = readText(option.label);
    const price = readNumber(option.price);
    if (!label || price === null) return [];

    return [{ label, price, description: readText(option.description) }];
  });
}

/**
 * Dateien haben einen eigenen Export und reisen nicht mit; nur Merkmale, um die
 * vorhandene Datei im Ziel wiederzufinden.
 */
export type EventDownloadRef = {
  downloadId: string | null;
  title: string | null;
  fileUrl: string | null;
};

export function readEventDownloadRefs(raw: unknown): EventDownloadRef[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const link = entry as Record<string, unknown>;

    // Exporte schreiben die flache Form; `download: { … }` kann aus Handarbeit stammen.
    const nested = (
      typeof link.download === "object" && link.download !== null
        ? link.download
        : {}
    ) as Record<string, unknown>;

    const downloadId = readText(link.downloadId) ?? readText(nested.id);
    const title = readText(link.title) ?? readText(nested.title);
    const fileUrl = readText(link.fileUrl) ?? readText(nested.fileUrl);
    if (!downloadId && !title && !fileUrl) return [];

    return [{ downloadId, title, fileUrl }];
  });
}

export type EventContentImport = {
  title: string;
  motto: string | null;
  description: string | null;
  eventDate: Date;
  duration: number | null;
  cancelled: boolean;
  category: EventCategory;
  districtName: string | null;
  leitung: string | null;
  openToParticipants: boolean;
  participationInfo: string | null;
  isFree: boolean;
  priceInfo: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
};

/** Bewusst nicht übernommen: Prüfvermerke, Zeitstempel und IDs. */
export function readEventContent(
  raw: Record<string, unknown>,
): EventContentImport {
  const status = readEnum(raw.status, ContentStatus, ContentStatus.DRAFT);

  return {
    title: readText(raw.title) ?? "unbenannt",
    motto: readText(raw.motto),
    description: readText(raw.description),
    eventDate: readDate(raw.eventDate) ?? new Date(),
    duration: readInteger(raw.duration),
    cancelled: readBoolean(raw.cancelled, false),
    category: readEnum(raw.category, EventCategory, EventCategory.ANDERE),
    districtName: readText(raw.districtName),
    leitung: readText(raw.leitung),
    openToParticipants: readBoolean(raw.openToParticipants, false),
    participationInfo: readText(raw.participationInfo),
    isFree: readBoolean(raw.isFree, true),
    priceInfo: readText(raw.priceInfo),
    status,
    publishedAt: readPublishedAt(
      raw.publishedAt,
      status === ContentStatus.APPROVED,
    ),
  };
}

/**
 * Ein Mitwirkender aus dem Export. IDs stammen aus der Quell-Datenbank; die
 * Route löst sie über `createReferenceResolver` auf (`ensemble`/`auswahlChor`
 * tragen die Merkmale dafür). Ohne Treffer bleibt der Name als freier Eintrag.
 */
export type EventPerformerRef = {
  type: EventEnsembleType;
  name: string | null;
  ensembleId: string | null;
  ensemble: unknown;
  auswahlChorId: string | null;
  auswahlChor: unknown;
};

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Neue Exporte schreiben `performers: [...]`. Ältere (vor mehreren Mitwirkenden
 * pro Termin) hatten Einzelfelder am Termin; die werden zu genau einem Eintrag.
 */
export function readEventPerformerRefs(
  raw: Record<string, unknown>,
): EventPerformerRef[] {
  if (Array.isArray(raw.performers)) {
    return [...raw.performers]
      .flatMap((entry, index) => {
        const performer = objectOrNull(entry);
        if (!performer) return [];
        const type = readEnum(performer.type, EventEnsembleType, null);
        if (!type) return [];
        const ensemble = objectOrNull(performer.ensemble);
        const auswahlChor = objectOrNull(performer.auswahlChor);
        return [
          {
            order: readInteger(performer.sortOrder) ?? index,
            ref: {
              type,
              name:
                readText(performer.name) ??
                readText(ensemble?.name) ??
                readText(auswahlChor?.name),
              ensembleId: readText(performer.ensembleId),
              ensemble,
              auswahlChorId: readText(performer.auswahlChorId),
              auswahlChor,
            },
          },
        ];
      })
      .sort((a, b) => a.order - b.order)
      .map(({ ref }) => ref);
  }

  /** `ensembleType` weiter lesen: von Hand geschriebene Dateien nutzen den alten Namen. */
  const type = readEnum(
    raw.performingEnsembleType ?? raw.ensembleType,
    EventEnsembleType,
    null,
  );
  if (!type) return [];

  const ensemble = objectOrNull(raw.ensemble);
  const auswahlChor = objectOrNull(raw.auswahlChor);
  const name =
    type === "CUSTOM"
      ? readText(raw.performingEnsembleName)
      : type === "ENSEMBLE"
        ? (readText(ensemble?.name) ?? readText(raw.ensembleName))
        : (readText(auswahlChor?.name) ?? readText(raw.auswahlChorName));

  return [
    {
      type,
      name,
      ensembleId: type === "ENSEMBLE" ? readText(raw.ensembleId) : null,
      ensemble,
      auswahlChorId:
        type === "AUSWAHLCHOR" ? readText(raw.auswahlChorId) : null,
      auswahlChor,
    },
  ];
}
