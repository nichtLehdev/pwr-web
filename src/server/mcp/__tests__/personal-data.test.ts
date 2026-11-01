import { describe, expect, it } from "@jest/globals";

import { stripPersonalData } from "../personal-data";

describe("stripPersonalData", () => {
  it("entfernt Kontaktdaten verschachtelter Personen, behält Namen", () => {
    const post = {
      id: "p1",
      title: "Bläsertag",
      author: {
        id: "u1",
        displayName: "Erika Muster",
        email: "erika@example.test",
        bio: "Bläserin",
      },
      createdBy: { id: "u2", displayName: "Max", phone: "0123" },
    };
    expect(stripPersonalData(post)).toEqual({
      id: "p1",
      title: "Bläsertag",
      author: { id: "u1", displayName: "Erika Muster" },
      createdBy: { id: "u2", displayName: "Max" },
    });
  });

  it("entfernt eigene Kontaktfelder von Ensembles und Anschriften von Personen", () => {
    const ensemble = {
      name: "Posaunenchor",
      contactWebsite: "https://chor.example",
      conductorName: "Max",
      conductorEmail: "max@example.test",
      conductorPhone: "0123",
      representativeEmail: "rep@example.test",
      conductorStreet: "Weg 1",
      conductorZipCode: "12345",
      conductorCity: "Stadt",
      representativeStreet: "Gasse 2",
      maxCapacity: 40,
      conductor: {
        displayName: "Max",
        street: "Weg 1",
        zipCode: "12345",
        city: "Stadt",
        birthDate: "1990-01-01",
        preferences: "{}",
      },
    };
    expect(stripPersonalData(ensemble)).toEqual({
      name: "Posaunenchor",
      contactWebsite: "https://chor.example",
      conductorName: "Max",
      maxCapacity: 40,
      conductor: { displayName: "Max" },
    });
  });

  it("lässt die Anschrift von Veranstaltungsorten stehen", () => {
    const event = {
      location: {
        name: "Ev. Kirche",
        street: "Ringstraße 12a",
        zipCode: "47647",
        city: "Aldekerk",
        latitude: 51.4,
        longitude: 6.4,
      },
    };
    expect(stripPersonalData(event)).toEqual(event);
  });

  it("geht durch Listen und lässt Datum und Decimal unangetastet", () => {
    class Decimal {
      constructor(readonly value: string) {}
      toJSON() {
        return this.value;
      }
    }
    const date = new Date("2026-12-05T17:00:00Z");
    const price = new Decimal("12.50");
    const result = stripPersonalData({
      obleute: [{ person: { email: "x@example.test", displayName: "A" } }],
      eventDate: date,
      price,
    }) as Record<string, unknown>;

    expect(result.obleute).toEqual([{ person: { displayName: "A" } }]);
    expect(result.eventDate).toBe(date);
    expect(result.price).toBe(price);
    expect(JSON.stringify(result)).toContain('"price":"12.50"');
  });

  describe("Teilnehmende und Anmeldungen", () => {
    const participant = {
      id: "t1",
      registrationId: "r1",
      firstName: "Kind",
      lastName: "Muster",
      birthDate: "2015-03-01",
      instrument: "Trompete",
      notes: "Allergie",
      customFields: { allergie: "Nüsse" },
    };
    const registration = {
      id: "r1",
      courseId: "c1",
      registrationStatus: "CONFIRMED",
      registrantFirstName: "Erika",
      registrantEmail: "erika@example.test",
      billingStreet: "Weg 1",
      participants: [participant],
    };

    it("entfernt Anmeldungen und Teilnehmende vollständig, Anzahlen bleiben", () => {
      const course = {
        id: "c1",
        title: "Bläserlehrgang",
        registrations: [registration],
        participants: [participant],
        invoices: [{ id: "i1", total: 10 }],
        _count: { participants: 12, registrations: 7 },
        registrationStats: {
          totalConfirmedParticipants: 12,
          byPriceOptionId: { p1: 12 },
        },
      };
      expect(stripPersonalData(course)).toEqual({
        id: "c1",
        title: "Bläserlehrgang",
        _count: { participants: 12, registrations: 7 },
        registrationStats: {
          totalConfirmedParticipants: 12,
          byPriceOptionId: { p1: 12 },
        },
      });
    });

    it("erkennt die Datensätze auch unter fremden Schlüsseln", () => {
      const result = stripPersonalData({
        latest: registration,
        people: [participant, { id: "x", displayName: "Max" }],
        saved: { id: "s1", instrument: "Horn", birthDate: "2010-01-01" },
      });
      expect(result).toEqual({ people: [{ id: "x", displayName: "Max" }] });

      const text = JSON.stringify(
        stripPersonalData([registration, participant]),
      );
      for (const secret of ["Erika", "Kind", "Allergie", "Nüsse", "Trompete"]) {
        expect(text).not.toContain(secret);
      }
    });

    it("liefert null, wenn das ganze Ergebnis eine Anmeldung ist", () => {
      expect(stripPersonalData(registration)).toBeNull();
    });
  });
});
