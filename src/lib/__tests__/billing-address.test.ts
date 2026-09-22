import { describe, expect, it } from "@jest/globals";
import {
  hasBillingAddress,
  isFilled,
  missingBillingAddressFields,
} from "../billing-address";

const address = {
  billingStreet: "Kirchweg 3",
  billingZipCode: "53111",
  billingCity: "Bonn",
};

describe("missingBillingAddressFields", () => {
  it("names nothing when the address is complete", () => {
    expect(missingBillingAddressFields(address)).toEqual([]);
  });

  it("names the gaps in form order", () => {
    expect(missingBillingAddressFields({ billingZipCode: "53111" })).toEqual([
      "billingStreet",
      "billingCity",
    ]);
  });

  it("counts blanks and missing fields alike", () => {
    expect(
      missingBillingAddressFields({ ...address, billingCity: "  " }),
    ).toEqual(["billingCity"]);
  });

  it("ignores company, name and e-mail", () => {
    // Eine Institution nennt oft keine Ansprechperson — die Anschrift trägt die Rechnung.
    expect(hasBillingAddress(address)).toBe(true);
  });
});

describe("isFilled", () => {
  it("is false for nothing, empty and blank", () => {
    expect([null, undefined, "", " \t "].map(isFilled)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});
