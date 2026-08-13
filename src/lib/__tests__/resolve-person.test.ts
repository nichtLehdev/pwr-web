import { describe, expect, it } from "@jest/globals";
import { formatAddress, resolvePerson } from "../resolve-person";

const image = { url: "/uploads/record.jpg" };
const avatar = { url: "/uploads/avatar.jpg" };

describe("resolvePerson", () => {
  it("uses the record's own fields when no user is linked", () => {
    const person = resolvePerson({
      name: "Erika Mustermann",
      email: "erika@example.de",
      phone: "+49 211 123456",
      image,
    });

    expect(person).toMatchObject({
      name: "Erika Mustermann",
      email: "erika@example.de",
      phone: "+49 211 123456",
      image,
      userId: null,
    });
  });

  it("falls back to the linked user for fields left empty", () => {
    const person = resolvePerson(
      { name: "", email: null },
      {
        id: "user-1",
        displayName: "Max Mustermann",
        email: "max@example.de",
        phone: "+49 221 987654",
        bio: "Bläser seit 1998",
        profileImage: avatar,
      },
    );

    expect(person).toMatchObject({
      name: "Max Mustermann",
      email: "max@example.de",
      phone: "+49 221 987654",
      bio: "Bläser seit 1998",
      image: avatar,
      userId: "user-1",
    });
  });

  it("lets the record override the linked user", () => {
    const person = resolvePerson(
      { name: "Dr. Max Mustermann", email: "vorstand@example.de", image },
      {
        id: "user-1",
        displayName: "Max Mustermann",
        email: "max@example.de",
        profileImage: avatar,
      },
    );

    expect(person.name).toBe("Dr. Max Mustermann");
    expect(person.email).toBe("vorstand@example.de");
    expect(person.image).toBe(image);
  });

  it("builds the display name from first and last name", () => {
    const person = resolvePerson(null, {
      firstName: "Max",
      lastName: "Mustermann",
    });

    expect(person.name).toBe("Max Mustermann");
  });

  it("honours the user's privacy preferences, but not for own fields", () => {
    const preferences = {
      showPhonePublicly: false,
      showAddressPublicly: false,
    };

    const fromUser = resolvePerson(null, {
      phone: "+49 221 987654",
      city: "Köln",
      preferences,
    });
    expect(fromUser.phone).toBeNull();
    expect(fromUser.city).toBeNull();

    const fromRecord = resolvePerson(
      { phone: "+49 211 123456", city: "Düsseldorf" },
      { phone: "+49 221 987654", city: "Köln", preferences },
    );
    expect(fromRecord.phone).toBe("+49 211 123456");
    expect(fromRecord.city).toBe("Düsseldorf");
  });

  it("returns empty values when there is neither a record nor a user", () => {
    expect(resolvePerson(null, null)).toEqual({
      name: null,
      email: null,
      phone: null,
      street: null,
      zipCode: null,
      city: null,
      address: null,
      bio: null,
      image: null,
      userId: null,
      districtRoleName: null,
    });
  });
});

describe("formatAddress", () => {
  it("joins street and city line", () => {
    expect(
      formatAddress({
        street: "Musterweg 1",
        zipCode: "40213",
        city: "Düsseldorf",
      }),
    ).toBe("Musterweg 1, 40213 Düsseldorf");
  });

  it("skips missing parts", () => {
    expect(formatAddress({ city: "Köln" })).toBe("Köln");
    expect(formatAddress({})).toBeNull();
  });
});
