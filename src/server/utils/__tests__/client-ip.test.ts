import { describe, expect, it } from "@jest/globals";
import { clientIpFromHeaders } from "@/server/utils/client-ip";

describe("clientIpFromHeaders", () => {
  it("nimmt den ersten Eintrag aus x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("fällt auf x-real-ip zurück", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-real-ip": "203.0.113.9" })),
    ).toBe("203.0.113.9");
  });

  it("liefert null statt eines Platzhalters", () => {
    // Ein Einwilligungsnachweis mit "unknown" sähe aus wie ein Beleg, wäre
    // aber keiner.
    expect(clientIpFromHeaders(new Headers())).toBeNull();
    expect(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "  " })),
    ).toBeNull();
  });

  it("kappt überlange Header-Werte", () => {
    const headers = new Headers({ "x-forwarded-for": "9".repeat(200) });
    expect(clientIpFromHeaders(headers)!.length).toBe(45);
  });
});
