import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import {
  GENERIC_REGISTRATION_ERROR,
  registrationErrorMessage,
} from "@/lib/registration-error-message";

/** Wie tRPC eine fehlgeschlagene Eingabeprüfung in `error.message` legt. */
function zodIssuesAsMessage(schema: z.ZodType, value: unknown): string {
  const result = schema.safeParse(value);
  if (result.success) throw new Error("Schema hat unerwartet akzeptiert");
  return JSON.stringify(result.error.issues, null, 2);
}

describe("registrationErrorMessage", () => {
  it("nennt das Feld hinter einer echten Zod-Fehlermeldung", () => {
    const schema = z.object({ registrantEmail: z.email() });
    const raw = zodIssuesAsMessage(schema, {
      registrantEmail: "keine-adresse",
    });

    expect(registrationErrorMessage(raw)).toBe(
      "Bitte prüfen Sie dieses Feld: E-Mail-Adresse.",
    );
  });

  it("zählt mehrere Felder auf", () => {
    const schema = z.object({
      registrantEmail: z.email(),
      registrantFirstName: z.string().min(1),
    });
    const raw = zodIssuesAsMessage(schema, {
      registrantEmail: "x",
      registrantFirstName: "",
    });

    expect(registrationErrorMessage(raw)).toBe(
      "Bitte prüfen Sie diese Felder: E-Mail-Adresse, Vorname.",
    );
  });

  it("benennt Teilnehmer über ihre Position", () => {
    const schema = z.object({
      participants: z.array(z.object({ firstName: z.string().min(1) })),
    });
    const raw = zodIssuesAsMessage(schema, {
      participants: [{ firstName: "Ana" }, { firstName: "" }],
    });

    expect(registrationErrorMessage(raw)).toBe(
      "Bitte prüfen Sie dieses Feld: Teilnehmer 2: Vorname.",
    );
  });

  it("lässt die selbst formulierten Meldungen des Servers durch", () => {
    // Kurs voll, Frist abgelaufen, doppelte Anmeldung — die sind bereits für
    // Menschen geschrieben und dürfen nicht ersetzt werden.
    const message = "Dieser Kurs ist bereits ausgebucht.";
    expect(registrationErrorMessage(message)).toBe(message);
  });

  it("fällt auf den allgemeinen Satz zurück, wenn nichts zuzuordnen ist", () => {
    expect(registrationErrorMessage(undefined)).toBe(
      GENERIC_REGISTRATION_ERROR,
    );
    expect(registrationErrorMessage("")).toBe(GENERIC_REGISTRATION_ERROR);
    expect(registrationErrorMessage("[nicht wirklich json")).toBe(
      GENERIC_REGISTRATION_ERROR,
    );
    expect(registrationErrorMessage('[{"path":["unbekanntesFeld"]}]')).toBe(
      GENERIC_REGISTRATION_ERROR,
    );
  });
});
