import { ContentStatus, PostCategory } from "~/generated/prisma/enums";
import {
  readBoolean,
  readEnum,
  readNumber,
  readPublishedAt,
  readText,
} from "./import-values";

/**
 * Reine Leseregeln für einen Beitrag aus einem Export-ZIP — das Gegenstück zu
 * `course-import.ts` und `event-import.ts`. Was die Datenbank braucht (Bezirk,
 * Titelbild, Slug, verfasste Person), setzt die Route davor.
 */

export type PostContentImport = {
  title: string;
  excerpt: string | null;
  content: string;
  category: PostCategory;
  pinned: boolean;
  authorName: string | null;
  coverImagePositionX: number | null;
  coverImagePositionY: number | null;
  status: ContentStatus;
  publishedAt: Date | null;
};

/**
 * Die Beitragsfelder, die ohne Datenbank aus dem Export zu lesen sind.
 *
 * Bisher schrieb der Import nur Titel, Auszug, Inhalt, Rubrik, Bezirk,
 * Anheftung, Status und Titelbild zurück. Verloren gingen der frei
 * geschriebene Name der verfassenden Person und der Bildausschnitt — ein
 * Titelbild landete nach dem Wiedereinspielen also anders im Rahmen als
 * vorher.
 *
 * Nicht übernommen werden — wie bei Kurs und Termin — `reviewNotes`,
 * `reviewDate` und `reviewerId` (Prüfvermerke einer Freigabe, die hier nicht
 * stattgefunden hat) sowie `id`, `createdById`, `createdAt` und `updatedAt`.
 */
export function readPostContent(
  raw: Record<string, unknown>,
): PostContentImport {
  const status = readEnum(raw.status, ContentStatus, ContentStatus.DRAFT);

  return {
    title: readText(raw.title) ?? "unbenannt",
    excerpt: readText(raw.excerpt),
    content: readText(raw.content) ?? "",
    category: readEnum(raw.category, PostCategory, PostCategory.ANDERE),
    pinned: readBoolean(raw.pinned, false),
    authorName: readText(raw.authorName),
    /**
     * Fokuspunkt des Titelbilds in Prozent. Außerhalb von 0–100 ist er
     * sinnlos, dann rahmt die Anzeige lieber mittig wie ohne Angabe.
     */
    coverImagePositionX: readPercent(raw.coverImagePositionX),
    coverImagePositionY: readPercent(raw.coverImagePositionY),
    status,
    /**
     * Wie bei Kurs und Termin: Das Veröffentlichungsdatum folgt dem Status,
     * statt blind kopiert zu werden — sonst entstünde ein Entwurf mit
     * Veröffentlichungsdatum oder ein freigegebener Beitrag ohne.
     */
    publishedAt: readPublishedAt(raw.publishedAt, status === "APPROVED"),
  };
}

function readPercent(value: unknown): number | null {
  const zahl = readNumber(value);
  if (zahl === null || zahl < 0 || zahl > 100) return null;
  return zahl;
}
