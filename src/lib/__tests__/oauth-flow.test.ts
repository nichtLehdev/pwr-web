import { describe, expect, it } from "@jest/globals";

import { isOAuthAuthorizeQuery, oauthContinueUrl } from "../oauth-flow";

describe("isOAuthAuthorizeQuery", () => {
  it("erkennt die signierte Anfrage von better-auth", () => {
    expect(
      isOAuthAuthorizeQuery("?client_id=abc&scope=mcp%3Aread&exp=1&sig=xyz"),
    ).toBe(true);
  });

  it("ignoriert normale Anmeldungen", () => {
    expect(isOAuthAuthorizeQuery("?redirect=%2Fdashboard")).toBe(false);
    expect(isOAuthAuthorizeQuery("?client_id=abc")).toBe(false);
  });
});

describe("oauthContinueUrl", () => {
  it("liefert das Weiterleitungsziel", () => {
    expect(
      oauthContinueUrl({ redirect: true, url: "/oauth/zustimmung?x=1" }),
    ).toBe("/oauth/zustimmung?x=1");
  });

  it("gibt bei einer normalen Anmeldung null zurück", () => {
    expect(oauthContinueUrl({ token: "t", user: {} })).toBeNull();
    expect(oauthContinueUrl({ redirect: false, url: "/x" })).toBeNull();
    expect(oauthContinueUrl(null)).toBeNull();
  });
});
