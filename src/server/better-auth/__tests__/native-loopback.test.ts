import { describe, expect, it } from "@jest/globals";

import { withNativeLoopbackDefault } from "../native-loopback";

describe("withNativeLoopbackDefault", () => {
  it("macht lokale Clients ohne application_type zu native", () => {
    for (const uri of [
      "http://localhost:33418/callback",
      "http://127.0.0.1:5555/cb",
      "http://[::1]:8080/cb",
    ]) {
      expect(withNativeLoopbackDefault({ redirect_uris: [uri] })).toEqual({
        redirect_uris: [uri],
        application_type: "native",
      });
    }
  });

  it("lässt eine ausdrückliche Angabe stehen", () => {
    expect(
      withNativeLoopbackDefault({
        application_type: "web",
        redirect_uris: ["http://localhost:1/cb"],
      }),
    ).toBeNull();
  });

  it("ändert nichts, sobald eine Adresse kein Loopback ist", () => {
    expect(
      withNativeLoopbackDefault({
        redirect_uris: [
          "http://localhost:1/cb",
          "https://claude.ai/api/mcp/auth_callback",
        ],
      }),
    ).toBeNull();
    expect(
      withNativeLoopbackDefault({ redirect_uris: ["http://evil.example/cb"] }),
    ).toBeNull();
    expect(
      withNativeLoopbackDefault({ redirect_uris: ["https://localhost/cb"] }),
    ).toBeNull();
  });

  it("ignoriert kaputte Eingaben", () => {
    expect(withNativeLoopbackDefault(null)).toBeNull();
    expect(withNativeLoopbackDefault({ redirect_uris: [] })).toBeNull();
    expect(withNativeLoopbackDefault({ redirect_uris: "x" })).toBeNull();
  });
});
