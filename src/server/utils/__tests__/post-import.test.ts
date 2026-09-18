import { describe, expect, it } from "@jest/globals";
import { readPostContent } from "../post-import";

/**
 * Der Beitrags-Import schrieb bisher nur einen Teil der Felder zurück. Diese
 * Tests halten fest, was aus einem Export übernommen wird — und was bewusst
 * im Zielbestand neu entsteht.
 */
describe("readPostContent", () => {
  const vollstaendig = {
    id: "alte-id",
    slug: "ein-beitrag",
    title: "Ein Beitrag",
    excerpt: "Kurzfassung",
    content: "# Überschrift\n\nText",
    category: "MAGAZIN",
    pinned: true,
    authorName: "A. Bläser",
    authorId: "fremde-id",
    coverImagePositionX: 25.5,
    coverImagePositionY: 80,
    status: "APPROVED",
    publishedAt: "2026-03-01T10:00:00.000Z",
    reviewNotes: "geprüft von X",
    reviewDate: "2026-02-28T10:00:00.000Z",
    reviewerId: "pruefer-id",
    createdById: "ersteller-id",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("übernimmt die Inhaltsfelder", () => {
    const gelesen = readPostContent(vollstaendig);

    expect(gelesen).toMatchObject({
      title: "Ein Beitrag",
      excerpt: "Kurzfassung",
      content: "# Überschrift\n\nText",
      category: "MAGAZIN",
      pinned: true,
      authorName: "A. Bläser",
      coverImagePositionX: 25.5,
      coverImagePositionY: 80,
      status: "APPROVED",
    });
    expect(gelesen.publishedAt).toEqual(new Date("2026-03-01T10:00:00.000Z"));
  });

  it("übernimmt keine Prüfvermerke und keine Identität", () => {
    const gelesen = readPostContent(vollstaendig) as Record<string, unknown>;

    for (const feld of [
      "id",
      "slug",
      "reviewNotes",
      "reviewDate",
      "reviewerId",
      "createdById",
      "createdAt",
      "authorId",
    ]) {
      expect(gelesen[feld]).toBeUndefined();
    }
  });

  it("lässt das Veröffentlichungsdatum dem Status folgen", () => {
    expect(
      readPostContent({ ...vollstaendig, status: "DRAFT" }).publishedAt,
    ).toBeNull();

    const ohneDatum = readPostContent({
      ...vollstaendig,
      publishedAt: undefined,
    });
    expect(ohneDatum.publishedAt).toBeInstanceOf(Date);
  });

  it("verwirft einen Bildausschnitt außerhalb von 0 bis 100", () => {
    const gelesen = readPostContent({
      ...vollstaendig,
      coverImagePositionX: 140,
      coverImagePositionY: -3,
    });

    expect(gelesen.coverImagePositionX).toBeNull();
    expect(gelesen.coverImagePositionY).toBeNull();
  });

  it("fällt bei unbekannten Werten auf Standardwerte zurück, statt zu scheitern", () => {
    const gelesen = readPostContent({
      title: "   ",
      category: "GIBT-ES-NICHT",
      status: "IRGENDWAS",
      pinned: "ja",
    });

    expect(gelesen).toMatchObject({
      title: "unbenannt",
      content: "",
      category: "ANDERE",
      status: "DRAFT",
      pinned: false,
      excerpt: null,
      authorName: null,
    });
    expect(gelesen.publishedAt).toBeNull();
  });
});
