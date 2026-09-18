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

/**
 * Reine Leseregeln für einen Termin aus einem Export-ZIP — das Gegenstück zu
 * `course-import.ts`. Was die Datenbank braucht (Bezirk, Standort, Chor,
 * Auswahlchor, Bild, Slug, verknüpfte Dateien), setzt die Route davor.
 */

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
 * Verweis auf eine Datei, die am Termin hängt.
 *
 * Dateien sind eigene Einträge mit eigenem Export (`downloads`) und werden hier
 * nicht mitgeliefert — ein Termin-ZIP soll nicht dieselbe Datei ein zweites Mal
 * in den Bestand legen. Mit ausgegeben werden nur die Merkmale, an denen sich
 * die vorhandene Datei im Zielbestand wiederfinden lässt.
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

    // Ältere Ausgaben kannten den Block nicht; neuere schreiben die flache
    // Form. Die verschachtelte Form (`download: { … }`) kann aus einer von Hand
    // zusammengestellten Datei kommen.
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
  performingEnsembleType: EventEnsembleType | null;
  performingEnsembleName: string | null;
  leitung: string | null;
  openToParticipants: boolean;
  participationInfo: string | null;
  isFree: boolean;
  priceInfo: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
};

/**
 * Die Terminfelder, die ohne Datenbank aus dem Export zu lesen sind.
 *
 * Nicht übernommen werden — wie beim Kurs — `reviewNotes`, `reviewDate` und
 * `reviewerId` (Prüfvermerke einer Freigabe, die hier nicht stattgefunden hat)
 * sowie `id`, `createdById`, `createdAt` und `updatedAt`.
 */
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
    /**
     * Der Export schreibt die Ensemble-Art seit jeher als
     * `performingEnsembleType`; der Import las `ensembleType` und bekam deshalb
     * nie einen Wert — die Art ging bei jedem Rundlauf verloren. Der alte Name
     * wird weiter gelesen, damit von Hand geschriebene Dateien, die sich am
     * bisherigen Importer orientiert haben, nicht plötzlich ausfallen.
     */
    performingEnsembleType: readEnum(
      raw.performingEnsembleType ?? raw.ensembleType,
      EventEnsembleType,
      null,
    ),
    performingEnsembleName: readText(raw.performingEnsembleName),
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
