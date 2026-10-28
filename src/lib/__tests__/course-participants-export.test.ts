import { describe, expect, it } from "@jest/globals";
import { RegistrationStatus } from "~/generated/prisma/client";
import {
  buildCourseParticipantsExportRows,
  courseParticipantsColumns,
} from "../course-participants-export";
import { courseHasCustomNotesField } from "../course-custom-fields";

const registration = (notes: string | null) => ({
  registrationStatus: RegistrationStatus.CONFIRMED,
  registrantFirstName: "Anna",
  registrantLastName: "Beispiel",
  registrantEmail: "anna@example.com",
  registrantPhone: null,
  totalPrice: 120,
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  notes: "Für die ganze Anmeldung",
  participants: [
    {
      firstName: "Ben",
      lastName: "Beispiel",
      city: "Köln",
      instrument: "Posaune",
      priceOption: null,
      notes,
    },
  ],
});

const columnKeys = (customFields: Array<{ fieldName: string }>) =>
  courseParticipantsColumns({ customFields }).map((c) => c.key);

describe("participant notes in the participants export", () => {
  it("adds a column for participant notes next to the registration notes", () => {
    const keys = columnKeys([]);

    expect(keys).toContain("anmerkungen_teilnehmer");
    expect(keys).toContain("anmerkungen");
  });

  it("fills the column from the participant, not the registration", () => {
    const [row] = buildCourseParticipantsExportRows(
      { title: "Kurs", customFields: [] },
      [registration("Spielt erst seit einem Jahr")],
    );

    expect(row!.anmerkungen_teilnehmer).toBe("Spielt erst seit einem Jahr");
    expect(row!.anmerkungen).toBe("Für die ganze Anmeldung");
  });

  it("leaves the column out when the course has its own Anmerkungen field", () => {
    expect(columnKeys([{ fieldName: " anmerkungen " }])).not.toContain(
      "anmerkungen_teilnehmer",
    );
  });
});

describe("courseHasCustomNotesField", () => {
  it("matches the field name regardless of case and spacing", () => {
    expect(courseHasCustomNotesField([{ fieldName: "Anmerkungen" }])).toBe(
      true,
    );
    expect(courseHasCustomNotesField([{ fieldName: " ANMERKUNGEN" }])).toBe(
      true,
    );
  });

  it("ignores other fields and missing lists", () => {
    expect(courseHasCustomNotesField([{ fieldName: "Allergien" }])).toBe(false);
    expect(courseHasCustomNotesField(null)).toBe(false);
  });
});
