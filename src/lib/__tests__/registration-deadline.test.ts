import { describe, expect, it } from "@jest/globals";
import {
  deadlineEndOfDay,
  isRegistrationDeadlinePassed,
} from "@/lib/registration-deadline";

/** Fristen gelten bis zum Ende ihres deutschen Kalendertages, egal in welcher Zone oder mit welcher Uhrzeit gespeichert. */
describe("deadlineEndOfDay", () => {
  const ende = "2026-08-31T21:59:59.999Z"; // 31.08. 23:59:59.999 Sommerzeit

  it("endet um 23:59:59.999 deutscher Zeit, egal wie gespeichert", () => {
    for (const gespeichert of [
      "2026-08-31T21:59:59.000Z", // Ende des Tages, deutsche Zeit
      "2026-08-30T22:00:00.000Z", // deutsche Mitternacht
      "2026-08-31T00:00:00.000Z", // UTC-Mitternacht
      "2026-08-31T10:00:00.000Z", // irgendwann am Tag
    ]) {
      expect(deadlineEndOfDay(gespeichert).toISOString()).toBe(ende);
    }
  });

  it("rechnet im Winter mit einer Stunde Versatz", () => {
    expect(deadlineEndOfDay("2026-12-20T12:00:00Z").toISOString()).toBe(
      "2026-12-20T22:59:59.999Z",
    );
  });

  it("hält die Frist bis zur letzten Millisekunde offen", () => {
    const frist = "2026-08-31T21:59:59Z";
    expect(
      isRegistrationDeadlinePassed(frist, new Date("2026-08-31T21:59:59.999Z")),
    ).toBe(false);
    expect(
      isRegistrationDeadlinePassed(frist, new Date("2026-08-31T22:00:00.000Z")),
    ).toBe(true);
  });
});
