import { describe, expect, it } from "@jest/globals";
import { locationMapsUrl } from "../maps";

describe("locationMapsUrl", () => {
  it("prefers coordinates and links straight to directions", () => {
    const url = locationMapsUrl({
      name: "Gemeindehaus",
      city: "Duisburg",
      latitude: 51.4344,
      longitude: 6.7623,
    });

    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=51.4344,6.7623",
    );
  });

  it("keeps coordinates at zero instead of treating them as missing", () => {
    const url = locationMapsUrl({
      city: "Nullinsel",
      latitude: 0,
      longitude: 0,
    });

    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=0,0");
  });

  it("falls back to an address search without coordinates", () => {
    const url = locationMapsUrl({
      name: "Gemeindehaus",
      street: "Hauptstr. 1",
      zipCode: "47051",
      city: "Duisburg",
    });

    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Gemeindehaus Hauptstr. 1 47051 Duisburg"),
    );
  });

  it("skips missing parts instead of padding the query with blanks", () => {
    const url = locationMapsUrl({ name: null, street: "  ", city: "Wesel" });

    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=Wesel");
  });

  it("returns null when there is nothing to point at", () => {
    expect(locationMapsUrl(null)).toBeNull();
    expect(locationMapsUrl(undefined)).toBeNull();
    expect(locationMapsUrl({ city: "   ", name: null })).toBeNull();
  });

  it("encodes the query so umlauts and spaces survive", () => {
    const url = locationMapsUrl({ city: "Mülheim an der Ruhr" });

    expect(url).toContain("M%C3%BClheim%20an%20der%20Ruhr");
  });
});
