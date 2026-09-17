import { describe, expect, it } from "@jest/globals";
import {
  readCourseContent,
  readCourseCustomFields,
  readCourseDownPayment,
  readCourseGuestTeamMembers,
  readCoursePriceOptions,
} from "../course-import";

/**
 * Prüft die Abbildung Export → Import für Kurse: Was das ZIP schreibt, muss
 * auf der anderen Seite wieder ankommen — und was nicht zum Inhalt gehört,
 * darf nicht mitwandern.
 *
 * Die Beispielnutzlast ist nach dem echten `courses.json` gebaut: Der Export
 * schreibt die Kursfelder unverändert aus der Datenbank, Datumsangaben also
 * als ISO-Zeichenkette.
 */
const exportedCourse = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  slug: "blaeserfreizeit-2026",
  title: "Bläserfreizeit",
  motto: "Gemeinsam klingen",
  description: "Eine Woche mit **Noten**.",
  courseNumber: "99001",
  imageId: "media-1",
  startDate: "2026-07-01T09:00:00.000Z",
  endDate: "2026-07-05T16:00:00.000Z",
  locationId: "location-1",
  courseType: "FREIZEIT",
  targetAudience: "JUGEND",
  bezirkId: "bezirk-1",
  registrationOpen: true,
  registrationOpensAt: "2026-02-01T08:00:00.000Z",
  registrationDeadline: "2026-06-01T23:59:00.000Z",
  externalProviderName: null,
  externalRegistrationUrl: null,
  registrationClosedNotifiedAt: "2026-06-02T06:00:00.000Z",
  maxParticipants: 40,
  allowWaitingList: true,
  isFree: false,
  priceInfo: "Geschwisterkinder günstiger.",
  allowSiblingDiscount: true,
  paymentCashAllowed: true,
  paymentInvoiceAllowed: false,
  invoicingEnabled: true,
  downPaymentMode: "TICKET",
  downPaymentAmount: null,
  downPaymentRefundPolicy: "CUSTOM",
  downPaymentRefundText: "Erstattung bis vier Wochen vorher.",
  prerequisites: "Zwei Jahre Spielerfahrung.",
  whatToBring: "Instrument und Notenständer.",
  status: "DRAFT",
  reviewNotes: "Prüfvermerk",
  reviewDate: "2026-05-20T10:00:00.000Z",
  createdById: "user-1",
  reviewerId: "user-2",
  publishedAt: "2026-05-21T10:00:00.000Z",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z",
  ...overrides,
});

describe("readCourseContent", () => {
  it("übernimmt die Inhaltsfelder des Exports", () => {
    const content = readCourseContent(exportedCourse());

    expect(content).toMatchObject({
      title: "Bläserfreizeit",
      motto: "Gemeinsam klingen",
      description: "Eine Woche mit **Noten**.",
      courseType: "FREIZEIT",
      targetAudience: "JUGEND",
      registrationOpen: true,
      maxParticipants: 40,
      allowWaitingList: true,
      isFree: false,
      priceInfo: "Geschwisterkinder günstiger.",
      allowSiblingDiscount: true,
      paymentCashAllowed: true,
      paymentInvoiceAllowed: false,
      invoicingEnabled: true,
      prerequisites: "Zwei Jahre Spielerfahrung.",
      whatToBring: "Instrument und Notenständer.",
      status: "DRAFT",
    });
    expect(content.startDate.toISOString()).toBe("2026-07-01T09:00:00.000Z");
    expect(content.endDate.toISOString()).toBe("2026-07-05T16:00:00.000Z");
    expect(content.registrationOpensAt?.toISOString()).toBe(
      "2026-02-01T08:00:00.000Z",
    );
    expect(content.registrationDeadline?.toISOString()).toBe(
      "2026-06-01T23:59:00.000Z",
    );
  });

  it("lässt Prüfvermerke und Benachrichtigungszeitpunkte draußen", () => {
    const content = readCourseContent(exportedCourse()) as Record<
      string,
      unknown
    >;

    for (const field of [
      "id",
      "createdById",
      "reviewerId",
      "reviewNotes",
      "reviewDate",
      "registrationClosedNotifiedAt",
      "createdAt",
      "updatedAt",
    ]) {
      expect(content[field]).toBeUndefined();
    }
  });

  it("setzt den Veröffentlichungszeitpunkt nur bei freigegebenen Kursen", () => {
    expect(readCourseContent(exportedCourse()).publishedAt).toBeNull();

    const approved = readCourseContent(
      exportedCourse({ status: "APPROVED" }),
    ).publishedAt;
    expect(approved?.toISOString()).toBe("2026-05-21T10:00:00.000Z");
  });

  it("füllt einen freigegebenen Kurs ohne Datum mit der Gegenwart", () => {
    const before = Date.now();
    const publishedAt = readCourseContent(
      exportedCourse({ status: "APPROVED", publishedAt: null }),
    ).publishedAt;

    expect(publishedAt).not.toBeNull();
    expect(publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("liest ein ZIP aus dem alten Stand mit Standardwerten", () => {
    // Genau die Felder, die der bisherige Import geschrieben hat.
    const content = readCourseContent({
      title: "Alter Kurs",
      description: "Text",
      courseType: "WORKSHOP",
      startDate: "2026-03-01T09:00:00.000Z",
      status: "DRAFT",
    });

    expect(content).toMatchObject({
      title: "Alter Kurs",
      motto: null,
      targetAudience: null,
      registrationOpen: false,
      allowWaitingList: false,
      isFree: false,
      allowSiblingDiscount: false,
      paymentCashAllowed: true,
      paymentInvoiceAllowed: true,
      invoicingEnabled: false,
      publishedAt: null,
    });
    // Ohne Enddatum gilt der Starttag — wie schon vorher.
    expect(content.endDate.toISOString()).toBe("2026-03-01T09:00:00.000Z");
  });

  it("fällt bei unbekannten Aufzählungswerten auf den Standard zurück", () => {
    const content = readCourseContent(
      exportedCourse({ courseType: "GIBTESNICHT", status: "ERFUNDEN" }),
    );

    expect(content.courseType).toBe("OTHER");
    expect(content.status).toBe("DRAFT");
  });
});

describe("readCoursePriceOptions", () => {
  it("übernimmt Preis, Begrenzung, Altersgrenzen und Anzahlung", () => {
    expect(
      readCoursePriceOptions([
        {
          id: "po-1",
          courseId: "aaaa",
          label: "Jugendliche",
          price: 185.5,
          description: "Bis einschließlich 17 Jahre",
          maxParticipants: 12,
          minAge: null,
          maxAge: 17,
          downPaymentAmount: 40,
          createdAt: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "po-2",
          courseId: "aaaa",
          label: "Erwachsene",
          price: 245,
          description: null,
          maxParticipants: null,
          minAge: 18,
          maxAge: null,
          downPaymentAmount: 60,
        },
      ]),
    ).toEqual([
      {
        label: "Jugendliche",
        price: 185.5,
        description: "Bis einschließlich 17 Jahre",
        maxParticipants: 12,
        minAge: null,
        maxAge: 17,
        downPaymentAmount: 40,
      },
      {
        label: "Erwachsene",
        price: 245,
        description: null,
        maxParticipants: null,
        minAge: 18,
        maxAge: null,
        downPaymentAmount: 60,
      },
    ]);
  });

  it("nimmt einen kostenlosen Platz mit, überspringt aber Kategorien ohne Preis oder Bezeichnung", () => {
    expect(
      readCoursePriceOptions([
        { label: "Frei", price: 0 },
        { label: "Ohne Preis" },
        { price: 20 },
        "unsinn",
        null,
      ]).map((option) => option.label),
    ).toEqual(["Frei"]);
  });

  it("liefert für fehlende Kategorien eine leere Liste", () => {
    expect(readCoursePriceOptions(undefined)).toEqual([]);
    expect(readCoursePriceOptions({})).toEqual([]);
  });
});

describe("readCourseCustomFields", () => {
  it("übernimmt Anmeldefelder samt Auswahlliste", () => {
    expect(
      readCourseCustomFields([
        {
          id: "cf-1",
          courseId: "aaaa",
          fieldName: "Stimme",
          fieldType: "SELECT",
          options: ["Trompete", "Posaune"],
          isRequired: true,
          helpText: "Was spielst du?",
          sortOrder: 0,
        },
      ]),
    ).toEqual([
      {
        fieldName: "Stimme",
        fieldType: "SELECT",
        options: ["Trompete", "Posaune"],
        isRequired: true,
        helpText: "Was spielst du?",
        sortOrder: 0,
      },
    ]);
  });

  it("überspringt Felder mit unbekannter Art und zählt die Reihenfolge sonst durch", () => {
    const fields = readCourseCustomFields([
      { fieldName: "Kaputt", fieldType: "REGENBOGEN" },
      { fieldName: "Allergien", fieldType: "TEXTAREA" },
    ]);

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      fieldName: "Allergien",
      fieldType: "TEXTAREA",
      options: undefined,
      isRequired: false,
      sortOrder: 1,
    });
  });
});

describe("readCourseGuestTeamMembers", () => {
  it("übernimmt das öffentlich genannte Kursteam", () => {
    expect(
      readCourseGuestTeamMembers([
        { id: "g1", displayName: "Gastdozent", bio: "Leitet das Blech." },
        { displayName: "   " },
      ]),
    ).toEqual([
      { displayName: "Gastdozent", bio: "Leitet das Blech.", sortOrder: 0 },
    ]);
  });
});

describe("readCourseDownPayment", () => {
  const priceOptions = [
    {
      label: "Jugendliche",
      price: 185.5,
      description: null,
      maxParticipants: 12,
      minAge: null,
      maxAge: 17,
      downPaymentAmount: 40,
    },
    {
      label: "Erwachsene",
      price: 245,
      description: null,
      maxParticipants: null,
      minAge: 18,
      maxAge: null,
      downPaymentAmount: 60,
    },
  ];

  it("übernimmt die Anzahlung, wenn die Kursnummer mitkam", () => {
    const result = readCourseDownPayment({
      raw: exportedCourse(),
      courseNumber: "99001",
      isFree: false,
      isExternal: false,
      allowSiblingDiscount: true,
      priceOptions,
    });

    expect(result.droppedReason).toBeNull();
    expect(result.downPaymentMode).toBe("TICKET");
    expect(result.downPaymentRefundPolicy).toBe("CUSTOM");
    expect(result.downPaymentRefundText).toBe(
      "Erstattung bis vier Wochen vorher.",
    );
    expect(result.priceOptions.map((o) => o.downPaymentAmount)).toEqual([
      40, 60,
    ]);
  });

  it("lässt die Anzahlung weg, wenn die Kursnummer im Zielbestand vergeben war", () => {
    const result = readCourseDownPayment({
      raw: exportedCourse(),
      courseNumber: null,
      isFree: false,
      isExternal: false,
      allowSiblingDiscount: true,
      priceOptions,
    });

    expect(result.downPaymentMode).toBe("NONE");
    expect(result.downPaymentAmount).toBeNull();
    expect(result.downPaymentRefundText).toBeNull();
    expect(result.droppedReason).toContain("Kursnummer");
    // Die Preise bleiben, nur die Beträge der Anzahlung verschwinden.
    expect(result.priceOptions.map((o) => o.price)).toEqual([185.5, 245]);
    expect(result.priceOptions.map((o) => o.downPaymentAmount)).toEqual([
      null,
      null,
    ]);
  });

  it("räumt Kategoriebeträge weg, wenn die Anzahlung am Kurs hängt", () => {
    const result = readCourseDownPayment({
      raw: exportedCourse({
        downPaymentMode: "COURSE",
        downPaymentAmount: 50,
        downPaymentRefundPolicy: "REFUNDABLE",
        downPaymentRefundText: "wird ignoriert",
      }),
      courseNumber: "99001",
      isFree: false,
      isExternal: false,
      allowSiblingDiscount: false,
      priceOptions,
    });

    expect(result.droppedReason).toBeNull();
    expect(result.downPaymentMode).toBe("COURSE");
    expect(result.downPaymentAmount).toBe(50);
    // Nur bei CUSTOM steht ein eigener Hinweis.
    expect(result.downPaymentRefundText).toBeNull();
    expect(result.priceOptions.map((o) => o.downPaymentAmount)).toEqual([
      null,
      null,
    ]);
  });

  it("bleibt bei einem Kurs ohne Anzahlung still", () => {
    const result = readCourseDownPayment({
      raw: { downPaymentMode: "NONE" },
      courseNumber: null,
      isFree: true,
      isExternal: false,
      allowSiblingDiscount: false,
      priceOptions: [],
    });

    expect(result.downPaymentMode).toBe("NONE");
    expect(result.droppedReason).toBeNull();
  });
});
