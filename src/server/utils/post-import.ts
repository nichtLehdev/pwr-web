import { ContentStatus, PostCategory } from "~/generated/prisma/enums";
import {
  readBoolean,
  readEnum,
  readNumber,
  readPublishedAt,
  readText,
} from "./import-values";

/** Leseregeln für einen Beitrag aus einem Export-ZIP; Datenbankbezüge setzt die Route. */

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

/** Bewusst nicht übernommen: Prüfvermerke, Zeitstempel und IDs. */
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
    /** Fokuspunkt in Prozent; außerhalb 0–100 rahmt die Anzeige mittig. */
    coverImagePositionX: readPercent(raw.coverImagePositionX),
    coverImagePositionY: readPercent(raw.coverImagePositionY),
    status,
    publishedAt: readPublishedAt(raw.publishedAt, status === "APPROVED"),
  };
}

function readPercent(value: unknown): number | null {
  const zahl = readNumber(value);
  if (zahl === null || zahl < 0 || zahl > 100) return null;
  return zahl;
}
