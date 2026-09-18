import { execFileSync } from "child_process";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import {
  berlinDate,
  berlinDayKey,
  berlinFormatter,
  berlinParts,
  daysInMonth,
  formatBerlin,
  isSameBerlinDay,
  startOfBerlinDay,
  startOfNextBerlinDay,
  weekdayOf,
  ZEITZONE,
} from "../berlin-time";

// Sommerzeit: 17:30 UTC ist 19:30 in Berlin.
const SOMMER = new Date("2026-10-02T17:30:00Z");
// Winterzeit: 17:30 UTC ist 18:30 in Berlin.
const WINTER = new Date("2026-12-04T17:30:00Z");
// 22:30 UTC am 1.10. ist schon der 2.10. in Berlin (00:30).
const NACH_MITTERNACHT_SOMMER = new Date("2026-10-01T22:30:00Z");
// 23:15 UTC am 31.12. ist in Berlin schon Neujahr (00:15).
const NACH_MITTERNACHT_WINTER = new Date("2026-12-31T23:15:00Z");

describe("unabhängig von der Zeitzone der Maschine", () => {
  // `process.env.TZ` lässt sich im Jest-Lauf nicht umstellen, daher rechnet je Zone ein
  // eigener Prozess: UTC wie im Container, eine westlich und eine weit östlich von Berlin.
  const script = `
    import { formatBerlin, berlinParts, startOfBerlinDay, berlinDayKey } from ${JSON.stringify(
      path.join(__dirname, "..", "berlin-time.ts"),
    )};
    const d = new Date("2026-10-01T22:30:00Z");
    console.log(JSON.stringify({
      lokalerTag: d.getDate(),
      text: formatBerlin(d, "datumUhrzeit"),
      teile: berlinParts(d),
      tagesbeginn: startOfBerlinDay(d).toISOString(),
      schluessel: berlinDayKey(d),
    }));
  `;
  const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");

  it.each(["UTC", "America/Los_Angeles", "Pacific/Kiritimati"])(
    "rechnet unter TZ=%s in Berliner Zeit",
    (tz) => {
      const out = JSON.parse(
        execFileSync(tsx, ["-e", script], {
          env: { ...process.env, TZ: tz },
          encoding: "utf8",
        }),
      ) as Record<string, unknown>;
      // Die Maschine selbst sieht einen anderen Tag als Berlin (außer östlich) …
      if (tz !== "Pacific/Kiritimati") expect(out.lokalerTag).toBe(1);
      // … die Helfer nicht.
      expect(out).toMatchObject({
        text: "02.10.2026, 00:30",
        teile: { year: 2026, month: 10, day: 2, hour: 0, minute: 30 },
        tagesbeginn: "2026-10-01T22:00:00.000Z",
        schluessel: "2026-10-02",
      });
    },
    30_000,
  );
});

describe("formatBerlin", () => {
  it("zeigt die Berliner Uhrzeit in Sommer- und Winterzeit", () => {
    expect(formatBerlin(SOMMER, "uhrzeit")).toBe("19:30");
    expect(formatBerlin(WINTER, "uhrzeit")).toBe("18:30");
  });

  it("legt einen Termin kurz nach Mitternacht auf den deutschen Tag", () => {
    expect(formatBerlin(NACH_MITTERNACHT_SOMMER)).toBe("2.10.2026");
    expect(formatBerlin(NACH_MITTERNACHT_SOMMER, "datumUhrzeit")).toBe(
      "02.10.2026, 00:30",
    );
    expect(formatBerlin(NACH_MITTERNACHT_WINTER, "datumLang")).toBe(
      "1. Januar 2027",
    );
  });

  it("liefert die im Code gebrauchten Formate", () => {
    expect(formatBerlin(SOMMER, "datumZweistellig")).toBe("02.10.2026");
    expect(formatBerlin(SOMMER, "datumKurz")).toBe("02.10.26");
    expect(formatBerlin(SOMMER, "datumMitWochentag")).toBe(
      "Freitag, 2. Oktober 2026",
    );
    expect(formatBerlin(SOMMER, "tagMonat")).toBe("2. Oktober");
    expect(formatBerlin(SOMMER, "monatJahr")).toBe("Oktober 2026");
    expect(formatBerlin(SOMMER, "datumLangUhrzeit")).toBe(
      "2. Oktober 2026 um 19:30",
    );
    expect(formatBerlin(SOMMER, "datumUhrzeitSekunden")).toBe(
      "02.10.2026, 19:30:00",
    );
    expect(formatBerlin(SOMMER, "mittelKurz")).toBe("02.10.2026, 19:30");
  });

  it("nimmt ISO-Zeichenketten und Millisekunden wie ein Date", () => {
    expect(formatBerlin("2026-10-02T17:30:00.000Z", "uhrzeit")).toBe("19:30");
    expect(formatBerlin(SOMMER.getTime(), "uhrzeit")).toBe("19:30");
  });

  it("formatiert eigene Optionen ebenfalls in Berliner Zeit", () => {
    expect(formatBerlin(SOMMER, { hour: "numeric" })).toBe("19 Uhr");
    // Eine abweichende Zone in den Optionen wird überstimmt.
    expect(
      formatBerlin(SOMMER, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }),
    ).toBe("19:30");
  });

  it("lässt tagesgenau gespeicherte Werte (UTC-Mitternacht) auf ihrem Tag", () => {
    // Geburtsdaten stehen als UTC-Mitternacht in der Datenbank.
    expect(formatBerlin(new Date("2010-06-15T00:00:00Z"))).toBe("15.6.2010");
    expect(formatBerlin(new Date("2010-01-15T00:00:00Z"))).toBe("15.1.2010");
  });

  it("gibt bei ungültigen Werten eine leere Zeichenkette zurück", () => {
    expect(formatBerlin("kein Datum")).toBe("");
    expect(formatBerlin(new Date(Number.NaN), "uhrzeit")).toBe("");
  });

  it("baut jeden Formatierer nur einmal", () => {
    expect(berlinFormatter("uhrzeit")).toBe(berlinFormatter("uhrzeit"));
    expect(berlinFormatter({ month: "long" })).toBe(
      berlinFormatter({ month: "long" }),
    );
    expect(berlinFormatter("uhrzeit").resolvedOptions().timeZone).toBe(
      ZEITZONE,
    );
  });
});

describe("berlinParts", () => {
  it("liefert die Bestandteile der deutschen Uhr", () => {
    expect(berlinParts(SOMMER)).toEqual({
      year: 2026,
      month: 10,
      day: 2,
      hour: 19,
      minute: 30,
      second: 0,
      weekday: 5,
    });
  });

  it("wechselt nach Mitternacht Tag, Monat und Jahr", () => {
    expect(berlinParts(NACH_MITTERNACHT_SOMMER)).toMatchObject({
      month: 10,
      day: 2,
      hour: 0,
      weekday: 5,
    });
    expect(berlinParts(NACH_MITTERNACHT_WINTER)).toMatchObject({
      year: 2027,
      month: 1,
      day: 1,
      hour: 0,
      minute: 15,
    });
  });

  it("meldet Mitternacht als 0, nicht als 24", () => {
    expect(berlinParts(new Date("2026-10-01T22:00:00Z")).hour).toBe(0);
  });
});

describe("berlinDate", () => {
  it("findet den Zeitpunkt zur Berliner Wanduhr in Sommer- und Winterzeit", () => {
    expect(berlinDate(2026, 10, 2, 19, 30).toISOString()).toBe(
      "2026-10-02T17:30:00.000Z",
    );
    expect(berlinDate(2026, 12, 4, 18, 30).toISOString()).toBe(
      "2026-12-04T17:30:00.000Z",
    );
  });

  it("trifft Mitternacht an den Umstellungstagen", () => {
    // Umstellung auf Sommerzeit am 29.03.2026, auf Winterzeit am 25.10.2026.
    expect(berlinDate(2026, 3, 29).toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
    expect(berlinDate(2026, 3, 30).toISOString()).toBe(
      "2026-03-29T22:00:00.000Z",
    );
    expect(berlinDate(2026, 10, 25).toISOString()).toBe(
      "2026-10-24T22:00:00.000Z",
    );
    expect(berlinDate(2026, 10, 26).toISOString()).toBe(
      "2026-10-25T23:00:00.000Z",
    );
  });

  it("rechnet Überläufe weiter wie der Date-Konstruktor", () => {
    expect(berlinDate(2026, 12, 32).toISOString()).toBe(
      "2026-12-31T23:00:00.000Z",
    );
    expect(berlinDate(2026, 1, 0)).toEqual(berlinDate(2025, 12, 31));
  });
});

describe("Kalendertage", () => {
  it("beginnt den Tag um Mitternacht Berliner Zeit", () => {
    expect(startOfBerlinDay(SOMMER).toISOString()).toBe(
      "2026-10-01T22:00:00.000Z",
    );
    expect(startOfBerlinDay(NACH_MITTERNACHT_SOMMER).toISOString()).toBe(
      "2026-10-01T22:00:00.000Z",
    );
    expect(startOfNextBerlinDay(WINTER).toISOString()).toBe(
      "2026-12-04T23:00:00.000Z",
    );
  });

  it("ist am Umstellungstag 25 Stunden lang", () => {
    const start = startOfBerlinDay(new Date("2026-10-25T12:00:00Z"));
    const end = startOfNextBerlinDay(new Date("2026-10-25T12:00:00Z"));
    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("vergibt sortierbare Tagesschlüssel", () => {
    expect(berlinDayKey(NACH_MITTERNACHT_SOMMER)).toBe("2026-10-02");
    expect(berlinDayKey(NACH_MITTERNACHT_WINTER)).toBe("2027-01-01");
    expect(berlinDayKey("kein Datum")).toBe("");
  });

  it("vergleicht deutsche Kalendertage, nicht UTC-Tage", () => {
    expect(
      isSameBerlinDay(
        NACH_MITTERNACHT_SOMMER,
        new Date("2026-10-02T20:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isSameBerlinDay(
        NACH_MITTERNACHT_SOMMER,
        new Date("2026-10-01T20:00:00Z"),
      ),
    ).toBe(false);
    expect(isSameBerlinDay("kein Datum", "kein Datum")).toBe(false);
  });

  it("rechnet Monatslängen und Wochentage ohne Zeitzone", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 10)).toBe(31);
    expect(weekdayOf(2026, 10, 1)).toBe(4);
    expect(weekdayOf(2027, 1, 1)).toBe(5);
  });
});
