import { describe, expect, it } from "@jest/globals";
import {
  readEventContent,
  readEventDownloadRefs,
  readEventPerformerRefs,
  readEventPriceOptions,
} from "../event-import";

/**
 * Abbildung Export → Import für Termine. Die Beispielnutzlast ist nach dem
 * echten `events.json` gebaut.
 */
const exportedEvent = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "bbbbbbbb-0000-4000-8000-000000000001",
  slug: "adventskonzert-2026",
  title: "Adventskonzert",
  motto: "Macht hoch die Tür",
  description: "Ein Abend mit Blechbläsern.",
  coverImageId: "media-2",
  eventDate: "2026-11-14T19:00:00.000Z",
  duration: 90,
  cancelled: false,
  locationId: "location-2",
  category: "KONZERT",
  bezirkId: "bezirk-1",
  districtName: "Bezirksname aus dem Freitext",
  performingEnsembleType: "ENSEMBLE",
  ensembleId: "ensemble-1",
  auswahlChorId: null,
  performingEnsembleName: "Auftretendes Ensemble",
  leitung: "Musterperson",
  openToParticipants: true,
  participationInfo: "Mitspielen ab 14 Jahren.",
  isFree: false,
  priceInfo: "Kollekte erbeten.",
  status: "DRAFT",
  reviewNotes: "Prüfvermerk",
  reviewDate: "2026-09-01T10:00:00.000Z",
  createdById: "user-1",
  reviewerId: "user-2",
  publishedAt: "2026-09-02T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
  ...overrides,
});

describe("readEventContent", () => {
  it("übernimmt die Inhaltsfelder des Exports", () => {
    const content = readEventContent(exportedEvent());

    expect(content).toMatchObject({
      title: "Adventskonzert",
      motto: "Macht hoch die Tür",
      description: "Ein Abend mit Blechbläsern.",
      duration: 90,
      cancelled: false,
      category: "KONZERT",
      districtName: "Bezirksname aus dem Freitext",
      leitung: "Musterperson",
      openToParticipants: true,
      participationInfo: "Mitspielen ab 14 Jahren.",
      isFree: false,
      priceInfo: "Kollekte erbeten.",
      status: "DRAFT",
    });
    expect(content.eventDate.toISOString()).toBe("2026-11-14T19:00:00.000Z");
  });

  it("lässt Prüfvermerke und Herkunftsfelder draußen", () => {
    const content = readEventContent(exportedEvent()) as Record<
      string,
      unknown
    >;

    for (const field of [
      "id",
      "createdById",
      "reviewerId",
      "reviewNotes",
      "reviewDate",
      "createdAt",
      "updatedAt",
    ]) {
      expect(content[field]).toBeUndefined();
    }
  });

  it("setzt den Veröffentlichungszeitpunkt nur bei freigegebenen Terminen", () => {
    expect(readEventContent(exportedEvent()).publishedAt).toBeNull();
    expect(
      readEventContent(
        exportedEvent({ status: "APPROVED" }),
      ).publishedAt?.toISOString(),
    ).toBe("2026-09-02T10:00:00.000Z");
  });

  it("liest ein ZIP aus dem alten Stand mit Standardwerten", () => {
    const content = readEventContent({
      title: "Alter Termin",
      eventDate: "2026-04-01T18:00:00.000Z",
      category: "GOTTESDIENST",
      status: "DRAFT",
    });

    expect(content).toMatchObject({
      title: "Alter Termin",
      motto: null,
      description: null,
      duration: null,
      cancelled: false,
      districtName: null,
      leitung: null,
      openToParticipants: false,
      // Termine sind im Zweifel kostenlos — so steht es auch im Schema.
      isFree: true,
      publishedAt: null,
    });
  });

  it("fällt bei unbekannter Art auf „ANDERE“ zurück", () => {
    expect(
      readEventContent(exportedEvent({ category: "PARTY" })).category,
    ).toBe("ANDERE");
  });
});

describe("readEventPriceOptions", () => {
  it("übernimmt die Eintrittspreise", () => {
    expect(
      readEventPriceOptions([
        {
          id: "epo-1",
          eventId: "bbbb",
          label: "Abendkasse",
          price: 12,
          description: "An der Abendkasse",
        },
        { id: "epo-2", eventId: "bbbb", label: "Ermäßigt", price: 8 },
      ]),
    ).toEqual([
      { label: "Abendkasse", price: 12, description: "An der Abendkasse" },
      { label: "Ermäßigt", price: 8, description: null },
    ]);
  });

  it("liefert für ein ZIP ohne Preisblock eine leere Liste", () => {
    expect(readEventPriceOptions(undefined)).toEqual([]);
  });
});

describe("readEventDownloadRefs", () => {
  it("liest die flache Form, die der Export schreibt", () => {
    expect(
      readEventDownloadRefs([
        {
          downloadId: "download-1",
          title: "Satzung",
          fileUrl: "/downloads/satzung.pdf",
        },
      ]),
    ).toEqual([
      {
        downloadId: "download-1",
        title: "Satzung",
        fileUrl: "/downloads/satzung.pdf",
      },
    ]);
  });

  it("versteht auch die verschachtelte Form einer selbst gebauten Datei", () => {
    expect(
      readEventDownloadRefs([
        { download: { id: "download-2", title: "Noten", fileUrl: null } },
      ]),
    ).toEqual([{ downloadId: "download-2", title: "Noten", fileUrl: null }]);
  });

  it("überspringt Verweise ohne jedes Merkmal", () => {
    expect(readEventDownloadRefs([{}, null, "unsinn"])).toEqual([]);
    expect(readEventDownloadRefs(undefined)).toEqual([]);
  });
});

describe("readEventPerformerRefs", () => {
  it("liest die Liste, die der Export schreibt, in ihrer Reihenfolge", () => {
    expect(
      readEventPerformerRefs({
        performers: [
          {
            type: "CUSTOM",
            name: "Gastchor",
            sortOrder: 1,
            ensembleId: null,
            auswahlChorId: null,
          },
          {
            type: "AUSWAHLCHOR",
            name: "Con Spirito",
            sortOrder: 0,
            auswahlChorId: "chor-1",
            auswahlChor: { slug: "con-spirito", name: "Con Spirito" },
          },
        ],
      }),
    ).toEqual([
      {
        type: "AUSWAHLCHOR",
        name: "Con Spirito",
        ensembleId: null,
        ensemble: null,
        auswahlChorId: "chor-1",
        auswahlChor: { slug: "con-spirito", name: "Con Spirito" },
      },
      {
        type: "CUSTOM",
        name: "Gastchor",
        ensembleId: null,
        ensemble: null,
        auswahlChorId: null,
        auswahlChor: null,
      },
    ]);
  });

  it("überspringt Einträge ohne gültige Art", () => {
    expect(
      readEventPerformerRefs({
        performers: [{ type: "BAND", name: "x" }, null, "unsinn"],
      }),
    ).toEqual([]);
  });

  // ZIPs von vor den mehreren Mitwirkenden: Einzelfelder am Termin.
  it("macht aus den alten Einzelfeldern einen Eintrag", () => {
    expect(
      readEventPerformerRefs(
        exportedEvent({
          ensemble: { name: "Posaunenchor Mettmann", internalId: "13-01" },
        }),
      ),
    ).toEqual([
      {
        type: "ENSEMBLE",
        name: "Posaunenchor Mettmann",
        ensembleId: "ensemble-1",
        ensemble: { name: "Posaunenchor Mettmann", internalId: "13-01" },
        auswahlChorId: null,
        auswahlChor: null,
      },
    ]);
  });

  it("übernimmt den freien Namen nur bei eigener Besetzung", () => {
    expect(
      readEventPerformerRefs(
        exportedEvent({ performingEnsembleType: "CUSTOM", ensembleId: null }),
      ),
    ).toEqual([
      {
        type: "CUSTOM",
        name: "Auftretendes Ensemble",
        ensembleId: null,
        ensemble: null,
        auswahlChorId: null,
        auswahlChor: null,
      },
    ]);
  });

  it("liest den alten Namen der Art weiter, damit von Hand gebaute Dateien gehen", () => {
    const refs = readEventPerformerRefs(
      exportedEvent({
        performingEnsembleType: undefined,
        ensembleType: "AUSWAHLCHOR",
        auswahlChorId: "chor-1",
        auswahlChorName: "Con Spirito",
      }),
    );

    expect(refs).toEqual([
      expect.objectContaining({
        type: "AUSWAHLCHOR",
        name: "Con Spirito",
        auswahlChorId: "chor-1",
        ensembleId: null,
      }),
    ]);
  });

  it("liefert ohne Mitwirkende eine leere Liste", () => {
    expect(
      readEventPerformerRefs({ title: "Alter Termin", category: "PROBE" }),
    ).toEqual([]);
  });
});
