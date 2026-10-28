import { describe, expect, it } from "@jest/globals";

import { summarizeProfile } from "../profile-summary";

const fullProfile = {
  id: "u1",
  username: "erika.muster",
  displayName: "Erika Muster",
  firstName: "Erika",
  lastName: "Muster",
  email: "erika@example.test",
  emailVerified: true,
  twoFactorEnabled: true,
  phone: "0123 456789",
  street: "Musterweg 1",
  zipCode: "12345",
  city: "Musterstadt",
  birthDate: "1990-01-01T00:00:00.000Z",
  bio: "Bläserin",
  preferences: '{"theme":"light"}',
  profileImage: { id: "m1", url: "/x.jpg" },
  districtRoleName: "Bezirksobfrau",
  bezirk: { id: "b1", name: "Bezirk 01", number: 1 },
  bezirkScopes: [{ bezirk: { id: "b2", name: "Bezirk 02" } }],
  teamMember: { role: "Web-Entwicklung & Design", socials: [] },
  vorstandMember: null,
  posaunenratMember: { role: "MITGLIED", image: null },
  foerdervereinMember: null,
  posaunenwart: {
    roleLabel: "Landesposaunenwartin",
    roleType: "LPW",
    responsibilities: [{ bezirk: { id: "b3", name: "Bezirk 03" } }],
  },
};

describe("summarizeProfile", () => {
  it("behält Identität, Bezirke und Ämter", () => {
    expect(summarizeProfile(fullProfile)).toEqual({
      id: "u1",
      displayName: "Erika Muster",
      firstName: "Erika",
      lastName: "Muster",
      username: "erika.muster",
      email: "erika@example.test",
      bezirk: { id: "b1", name: "Bezirk 01" },
      bezirkScopes: [{ id: "b2", name: "Bezirk 02" }],
      posaunenwartBezirke: [{ id: "b3", name: "Bezirk 03" }],
      roles: [
        "Bezirksobfrau",
        "Web-Entwicklung & Design",
        "Posaunenrat (MITGLIED)",
        "Landesposaunenwartin",
      ],
    });
  });

  it("gibt keine Privatdaten heraus", () => {
    const text = JSON.stringify(summarizeProfile(fullProfile));
    for (const secret of [
      "Musterweg",
      "12345",
      "Musterstadt",
      "1990-01-01",
      "0123 456789",
      "Bläserin",
      "theme",
      "/x.jpg",
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("kommt mit einem Profil ohne Ämter und Bezirk aus", () => {
    expect(summarizeProfile({ id: "u2", email: "a@b.test" })).toMatchObject({
      bezirk: null,
      bezirkScopes: [],
      posaunenwartBezirke: [],
      roles: [],
    });
    expect(summarizeProfile(null)).toBeNull();
  });
});
