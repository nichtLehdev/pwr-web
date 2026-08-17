import { describe, expect, it } from "@jest/globals";
// @react-email/render pulls in a dynamic import that jest's CJS runtime
// refuses; the templates are plain components, so render them directly.
import { renderToStaticMarkup } from "react-dom/server";
import { registrationAccessUrl } from "../registration-access";
import { verifyRegistrationAccessToken } from "@/server/utils/registration-access-token";
import { CourseRegistrationConfirmed } from "@/server/email/templates/course-registration-confirmed";

const registration = {
  id: "3f9a1c22-1111-4d55-8888-0a1b2c3d4e5f",
  registrantEmail: "Gast@Example.org",
};

function tokenFrom(url: string): string {
  return new URL(url).searchParams.get("token")!;
}

describe("registrationAccessUrl", () => {
  it("points at the registration and carries a token that verifies", () => {
    const url = registrationAccessUrl(registration);

    expect(new URL(url).pathname).toBe(`/registrations/${registration.id}`);
    expect(
      verifyRegistrationAccessToken(
        registration.id,
        registration.registrantEmail,
        tokenFrom(url),
      ),
    ).toBe(true);
  });

  it("can point straight at the edit form", () => {
    const url = registrationAccessUrl(registration, { edit: true });

    expect(new URL(url).pathname).toBe(
      `/registrations/${registration.id}/edit`,
    );
  });

  it("does not unlock a different registration", () => {
    const token = tokenFrom(registrationAccessUrl(registration));

    expect(
      verifyRegistrationAccessToken(
        "11111111-2222-3333-4444-555555555555",
        registration.registrantEmail,
        token,
      ),
    ).toBe(false);
  });
});

describe("confirmation mail", () => {
  it("carries the magic link so registrants without an account can act on it", () => {
    const url = registrationAccessUrl(registration);
    const html = renderToStaticMarkup(
      CourseRegistrationConfirmed({
        registrantFirstName: "Anna",
        registrantLastName: "Beispiel",
        courseTitle: "Bläserwoche",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-05"),
        totalPrice: 120,
        participantsCount: 2,
        registrationId: registration.id,
        manageUrl: url,
      }),
    );

    expect(html).toContain(url);
    expect(html).toContain("Anmeldung ansehen");
  });

  it("renders without the call to action when no link was built", () => {
    const html = renderToStaticMarkup(
      CourseRegistrationConfirmed({
        registrantFirstName: "Anna",
        registrantLastName: "Beispiel",
        courseTitle: "Bläserwoche",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-05"),
        totalPrice: 120,
        participantsCount: 2,
        registrationId: registration.id,
      }),
    );

    expect(html).not.toContain("Anmeldung ansehen");
    expect(html).toContain("Anmeldung bestätigt");
  });
});
